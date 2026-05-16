import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Image as ImageIcon, Smile, MoreVertical, Search, Heart, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError } from '../lib/firebase';
import type { OperationType } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, where, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../providers/AuthProvider';
import { encryptText, decryptText } from '../lib/encryption';
import { l10n } from '../lib/l10n';

interface Message {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  type: 'text' | 'quote';
  role?: string;
  avatar?: string;
  createdAt?: any;
}

// Memoized Sidebar Item
const ChatListItem = React.memo(({ chat, isActive, onClick }: any) => (
  <motion.button
    whileHover={{ scale: 1.02, x: 5 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "w-full p-4 flex items-center gap-3 transition-smooth border-l-4",
      isActive ? "bg-primary/5 dark:bg-primary/20 border-primary" : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800"
    )}
  >
    <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-primary dark:text-blue-400 font-bold">
      {chat.name[0]}
    </div>
    <div className="flex-1 text-left">
      <div className="flex justify-between items-center mb-1">
        <span className="font-bold text-sm truncate dark:text-white">{chat.name}</span>
        <span className="text-[10px] text-gray-400 uppercase">{chat.time}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{chat.lastMsg}</p>
    </div>
  </motion.button>
));

ChatListItem.displayName = 'ChatListItem';

// Memoized Message Bubble
const MessageBubble = React.memo(({ msg }: { msg: Message }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
    className={cn(
      "flex flex-col gap-1 max-w-[85%]",
      msg.isMe ? "ml-auto items-end" : "items-start"
    )}
  >
    {!msg.isMe && (
      <div className="flex items-center gap-2 mb-1 px-1">
        {msg.avatar && <img src={msg.avatar} className="w-4 h-4 rounded-full object-cover" loading="lazy" />}
        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{msg.author}</span>
        {msg.role && (
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-400 font-bold uppercase">
            {msg.role}
          </span>
        )}
      </div>
    )}

    {msg.type === 'quote' ? (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-3xl border border-yellow-100/50 dark:border-yellow-700/20 flex gap-3 relative shadow-sm">
        <Quote className="text-yellow-600/20 absolute -top-1 -left-1" size={24} />
        <p className="text-sm font-medium italic text-yellow-800 dark:text-yellow-200 leading-relaxed text-center w-full">
          "{msg.text}"
        </p>
      </div>
    ) : (
      <div className={cn(
        "p-4 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap card-shadow transition-colors",
        msg.isMe ? "bg-primary text-white rounded-br-none" : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none"
      )}>
        {msg.text}
      </div>
    )}
    <span className="text-[8px] text-gray-400 dark:text-gray-600 uppercase px-2">{msg.timestamp}</span>
  </motion.div>
));

MessageBubble.displayName = 'MessageBubble';

export const Chat: React.FC = () => {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [channels, setChannels] = useState<any[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [activeChat, setActiveChat] = useState(id || 'general');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync Channels
  useEffect(() => {
    const q = query(collection(db, 'chats'), orderBy('lastTimestamp', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const channelsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChannels(channelsData);
      setIsLoadingChannels(false);
      
      // Seed if empty
      if (snapshot.empty) {
        const seedChannels = [
          { name: 'Загальний канал', lastMsg: 'Вітаємо!', lastTimestamp: serverTimestamp(), type: 'channel' },
          { name: 'Служителі', lastMsg: 'Робочий чат', lastTimestamp: serverTimestamp(), type: 'channel' },
          { name: 'Наставники', lastMsg: 'Чат наставників', lastTimestamp: serverTimestamp(), type: 'channel' }
        ];
        seedChannels.forEach(c => {
          addDoc(collection(db, 'chats'), c).catch(console.error); // Basic seeding
        });
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'chats'));

    return () => unsub();
  }, []);

  // Sync Messages
  useEffect(() => {
    if (!user || !activeChat) return;
    setIsLoading(true);
    
    const q = query(
      collection(db, 'chats', activeChat, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          author: data.authorName || 'Система',
          text: decryptText(data.text), // DECRYPT on read
          timestamp: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Зараз',
          isMe: data.userId === user.uid,
          type: data.type || 'text',
          role: data.authorRole,
          avatar: data.authorAvatar
        } as Message;
      });
      setMessages(msgs);
      setIsLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, `chats/${activeChat}/messages`));

    return () => unsub();
  }, [activeChat, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !user) return;
    
    const textToSend = message;
    setMessage('');

    try {
      const messageDoc = {
        userId: user.uid,
        authorName: profile?.name || user.displayName,
        authorRole: profile?.role,
        authorAvatar: user.photoURL,
        text: encryptText(textToSend), // ENCRYPT on write
        type: 'text',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'chats', activeChat, 'messages'), messageDoc);
      
      // Update last message in channel
      await updateDoc(doc(db, 'chats', activeChat), {
        lastMsg: textToSend,
        lastTimestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${activeChat}/messages`);
    }
  };

  return (
    <div className="flex h-full bg-white dark:bg-gray-950 md:bg-gray-50 transition-colors">
      {/* Sidebar - Desktop Only or Overlay for Mobile if needed */}
      <div className={cn(
        "hidden md:flex flex-col w-80 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 h-full",
        !id && "flex w-full md:w-80"
      )}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-display dark:text-white">{l10n.chat.channels.split(' ')[0]}</h2>
            <button className="p-2 text-gray-400 hover:text-primary transition-smooth"><Search size={20} /></button>
          </div>
          <div className="relative">
            <input 
              type="text" 
              placeholder={l10n.common.search} 
              className="w-full pl-4 pr-10 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm text-gray-900 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoadingChannels ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
                    <div className="h-2 w-full bg-gray-50 dark:bg-gray-900 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            channels.map((chat) => (
              <ChatListItem 
                key={chat.id} 
                chat={{
                  ...chat,
                  time: chat.lastTimestamp?.toDate ? chat.lastTimestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Зараз'
                }} 
                isActive={activeChat === chat.id} 
                onClick={() => setActiveChat(chat.id)} 
              />
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col h-full bg-white dark:bg-gray-950",
        !id && "hidden md:flex"
      )}>
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold">
              {channels.find(c => c.id === activeChat)?.name?.[0] || '?'}
            </div>
            <div>
              <h3 className="font-bold text-sm dark:text-white">{channels.find(c => c.id === activeChat)?.name || 'Канал'}</h3>
              <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Онлайн</p>
            </div>
          </div>
          <button className="p-2 text-gray-400 hover:text-primary transition-smooth">
            <MoreVertical size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
               <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full"
              />
            </div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-primary/20 transition-smooth">
            <button className="p-2 text-gray-400 hover:text-primary transition-smooth"><ImageIcon size={20} /></button>
            <input 
              type="text" 
              placeholder={l10n.chat.placeholder} 
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm dark:text-white dark:placeholder-gray-600"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="p-2 text-gray-400 hover:text-primary transition-smooth"><Smile size={20} /></button>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              className="p-2 bg-primary text-white rounded-xl shadow-md disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:shadow-none transition-smooth"
              disabled={!message.trim()}
            >
              <Send size={18} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
