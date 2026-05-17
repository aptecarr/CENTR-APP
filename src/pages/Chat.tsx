import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Image as ImageIcon, Smile, MoreVertical, Search, Plus, Trash2, Phone, MessageSquare, X, Users, MessageCircle, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, setDoc, doc, deleteDoc, getDocs, where, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { encryptText, decryptText } from '../lib/encryption';
import { l10n } from '../lib/l10n';

// INTERFACES (Strict TypeScript)
export interface ContactUser {
  uid: string;
  name: string;
  email: string;
  role: string;
  photoURL?: string;
  phone?: string;
  telegram?: string;
  birthDate?: string;
  bloodGroup?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'channel' | 'direct';
  lastMsg?: string;
  lastTimestamp?: any;
  participants?: string[];
  partnerAvatar?: string;
}

export interface Message {
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

const MemoizedMessageBubble = React.memo(({ msg, onAvatarClick }: { msg: Message, onAvatarClick: (name: string) => void }) => (
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
      <div className="flex items-center gap-2 mb-1 px-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onAvatarClick(msg.author)}>
        {msg.avatar ? (
          <img src={msg.avatar} className="w-5 h-5 rounded-full object-cover" loading="lazy" alt="Avatar" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
            {msg.author[0]}
          </div>
        )}
        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{msg.author}</span>
        {msg.role && (
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-400 font-bold uppercase">
            {msg.role}
          </span>
        )}
      </div>
    )}

    <div className={cn(
      "p-3 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap card-shadow transition-colors min-h-[40px] flex items-center",
      msg.isMe ? "bg-primary text-white rounded-br-none" : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none"
    )}>
      {msg.text}
    </div>
    <span className="text-[8px] text-gray-400 dark:text-gray-600 uppercase px-2">{msg.timestamp}</span>
  </motion.div>
));

MemoizedMessageBubble.displayName = 'MemoizedMessageBubble';

export const Chat: React.FC = () => {
  const { id } = useParams();
  const { user, profile, isAdmin } = useAuth();
  
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');
  
  // Data States
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [dms, setDms] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Selected States
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatType, setActiveChatType] = useState<'channel' | 'direct'>('channel');
  const [messageText, setMessageText] = useState('');
  
  // UI States
  const [search, setSearch] = useState('');
  const [isNewChannelModalOpen, setIsNewChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<ContactUser | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // FETCH CONTACTS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData: ContactUser[] = snapshot.docs.map(doc => ({
        uid: doc.id,
        name: doc.data().name || 'Без імені',
        email: doc.data().email || '',
        role: doc.data().role || 'Користувач',
        photoURL: doc.data().photoURL || doc.data().avatarUrl || '',
        phone: doc.data().phone || '',
        telegram: doc.data().telegram || '',
        birthDate: doc.data().birthDate || '',
        bloodGroup: doc.data().bloodGroup || ''
      }));
      setContacts(usersData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));
    return () => unsub();
  }, []);

  // FETCH CHANNELS
  useEffect(() => {
    const qChannels = query(collection(db, 'channels'), orderBy('lastTimestamp', 'desc'));
    const unsubChannels = onSnapshot(qChannels, (snapshot) => {
      const channelsData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        type: 'channel' as const,
        lastMsg: doc.data().lastMsg,
        lastTimestamp: doc.data().lastTimestamp
      }));
      setChannels(channelsData);
      
      // Auto select first channel if no active chat
      if (!activeChatId && channelsData.length > 0 && activeTab === 'chats') {
        setActiveChatId(channelsData[0].id);
        setActiveChatType('channel');
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'channels'));
    return () => unsubChannels();
  }, [activeChatId, activeTab]);

  // FETCH DIRECT MESSAGES
  useEffect(() => {
    if (!user) return;
    const qDms = query(collection(db, 'direct_messages'), where('participants', 'array-contains', user.uid));
    const unsubDms = onSnapshot(qDms, (snapshot) => {
      const dmsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const partnerUid = data.participants.find((p: string) => p !== user.uid);
        const partnerInfo = contacts.find(c => c.uid === partnerUid);
        return {
          id: doc.id,
          name: partnerInfo?.name || 'Приватний чат',
          type: 'direct' as const,
          lastMsg: data.lastMsg || '',
          lastTimestamp: data.lastTimestamp,
          participants: data.participants,
          partnerAvatar: partnerInfo?.photoURL
        };
      });
      // Sort client-side to avoid needing composite index
      dmsData.sort((a, b) => {
        const timeA = a.lastTimestamp?.toMillis() || 0;
        const timeB = b.lastTimestamp?.toMillis() || 0;
        return timeB - timeA;
      });
      setDms(dmsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'direct_messages'));
    return () => unsubDms();
  }, [user, contacts]);

  // COMBINE & FILTER CHATS
  const combinedChats = [...channels, ...dms].sort((a, b) => {
    const timeA = a.lastTimestamp?.toMillis() || 0;
    const timeB = b.lastTimestamp?.toMillis() || 0;
    return timeB - timeA;
  });

  const filteredChats = combinedChats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  // FETCH MESSAGES FOR ACTIVE CHAT
  useEffect(() => {
    if (!user || !activeChatId) return;
    setMessages([]); // clear old messages while loading

    const colName = activeChatType === 'channel' ? 'channels' : 'direct_messages';
    const qMessages = query(
      collection(db, colName, activeChatId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          author: data.authorName || 'Система',
          text: decryptText(data.text), // DECRYPT
          timestamp: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Зараз',
          isMe: data.userId === user.uid,
          type: data.type || 'text',
          role: data.authorRole,
          avatar: data.authorAvatar
        } as Message;
      });
      setMessages(msgs);
    }, (error) => handleFirestoreError(error, OperationType.GET, `${colName}/${activeChatId}/messages`));

    return () => unsubMessages();
  }, [activeChatId, activeChatType, user]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // CREATE CHANNEL
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    try {
      await addDoc(collection(db, 'channels'), {
        name: newChannelName,
        lastMsg: 'Канал створено',
        lastTimestamp: serverTimestamp()
      });
      setIsNewChannelModalOpen(false);
      setNewChannelName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'channels');
    }
  };

  // DELETE CHANNEL
  const handleDeleteChannel = async (channelId: string) => {
    if (!window.confirm('Видалити цей канал? Всі повідомлення будуть втрачені!')) return;
    try {
      await deleteDoc(doc(db, 'channels', channelId));
      if (activeChatId === channelId) {
        setActiveChatId(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `channels/${channelId}`);
    }
  };

  // SEND MESSAGE
  const handleSend = async () => {
    if (!messageText.trim() || !user || !activeChatId) return;
    
    const textToSend = messageText;
    setMessageText('');

    try {
      const colName = activeChatType === 'channel' ? 'channels' : 'direct_messages';
      const messageDoc = {
        userId: user.uid,
        authorName: profile?.name || user.displayName,
        authorRole: profile?.role,
        authorAvatar: profile?.photoURL || user.photoURL,
        text: encryptText(textToSend), // ENCRYPT
        type: 'text',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, colName, activeChatId, 'messages'), messageDoc);
      
      // Update lastMsg pointer
      await updateDoc(doc(db, colName, activeChatId), {
        lastMsg: textToSend,
        lastSenderId: user.uid,
        lastTimestamp: serverTimestamp()
      });

      // =========================================================================
      // ІНСТРУКЦІЯ ДЛЯ FIREBASE CLOUD FUNCTION (PUSH-СПОІВЩЕННЯ)
      // Оскільки клієнтський SDK не може відправляти FCM повідомлення напряму,
      // вам потрібно створити Cloud Function (Node.js), яка буде:
      // 1. Слухати створення нових документів у `direct_messages/{chatId}/messages`.
      // 2. Отримувати `fcmTokens` з документа отримувача: `get(/users/{receiverId})`.
      // 3. Відправляти payload:
      //    const payload = {
      //      notification: { 
      //        title: `Нове повідомлення від ${profile?.name || user.displayName}`, 
      //        body: textToSend,
      //        icon: '/vite.svg'
      //      }
      //    };
      //    await admin.messaging().sendToDevice(receiver.fcmTokens, payload);
      // =========================================================================

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${activeChatType}/${activeChatId}/messages`);
    }
  };

  // START DIRECT MESSAGE
  const startDirectMessage = async (contact: ContactUser) => {
    if (!user) return;
    setSelectedProfile(null);
    const uids = [user.uid, contact.uid].sort();
    const dmId = `dm_${uids[0]}_${uids[1]}`;
    
    try {
      const docRef = doc(db, 'direct_messages', dmId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          participants: uids,
          lastMsg: 'Чат створено',
          lastSenderId: user.uid,
          lastTimestamp: serverTimestamp()
        });
      }
      setActiveTab('chats');
      setActiveChatId(dmId);
      setActiveChatType('direct');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'direct_messages');
    }
  };

  // Open profile from click on message avatar
  const handleAvatarClick = (authorName: string) => {
    const matchedProfile = contacts.find(c => c.name === authorName);
    if (matchedProfile) {
      setSelectedProfile(matchedProfile);
    }
  };

  return (
    <div className="flex h-full bg-white dark:bg-gray-950 md:bg-gray-50 transition-colors relative overflow-hidden">
      
      {/* Left Panel */}
      <div className={cn(
        "flex flex-col w-full md:w-80 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 h-full transition-all duration-300",
        activeChatId ? "hidden md:flex" : "flex"
      )}>
        {/* Header Tabs */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-4 shrink-0">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveTab('chats')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all",
                activeTab === 'chats' ? "bg-white dark:bg-gray-700 text-primary shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <MessageCircle size={16} /> Чати
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all",
                activeTab === 'contacts' ? "bg-white dark:bg-gray-700 text-primary shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <Users size={16} /> Контакти
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder={l10n.common.search} 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm text-gray-900 dark:text-white dark:placeholder-gray-500 focus:ring-2 focus:ring-primary/20"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
            {activeTab === 'chats' && isAdmin && (
              <button 
                onClick={() => setIsNewChannelModalOpen(true)}
                className="w-10 h-10 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl flex items-center justify-center transition-colors shrink-0"
              >
                <Plus size={20} />
              </button>
            )}
          </div>
        </div>

        {/* List Areas */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
          {activeTab === 'chats' ? (
            <div className="space-y-1 px-2">
              {filteredChats.map((chat) => (
                <div key={chat.id} className="relative group">
                  <button
                    onClick={() => { setActiveChatId(chat.id); setActiveChatType(chat.type); }}
                    className={cn(
                      "w-full p-3 flex items-center gap-3 rounded-2xl transition-all",
                      activeChatId === chat.id 
                        ? "bg-primary/10 dark:bg-primary/20" 
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    )}
                  >
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm flex items-center justify-center overflow-hidden">
                      {chat.type === 'direct' && chat.partnerAvatar ? (
                        <img src={chat.partnerAvatar} alt="Partner" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary font-bold">{chat.name?.[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm truncate dark:text-white">{chat.name}</span>
                        <span className="text-[10px] text-gray-400 capitalize shrink-0 pl-2">
                          {chat.lastTimestamp?.toDate ? chat.lastTimestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{chat.lastMsg || '...'}</p>
                    </div>
                  </button>
                  {isAdmin && chat.type === 'channel' && (
                    <button 
                      onClick={() => handleDeleteChannel(chat.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-red-100 text-red-600 rounded-xl opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-red-200"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              {filteredChats.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">Чати не знайдені</div>
              )}
            </div>
          ) : (
            <div className="space-y-1 px-2">
              {filteredContacts.map(contact => (
                <button
                  key={contact.uid}
                  onClick={() => setSelectedProfile(contact)}
                  className="w-full p-3 flex items-center gap-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all text-left"
                >
                  <div className="w-10 h-10 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    {contact.photoURL ? (
                      <img src={contact.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-500 font-bold">{contact.name[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 dark:text-white truncate">{contact.name}</div>
                    <div className="text-[10px] text-primary uppercase tracking-widest font-bold mt-0.5">{contact.role}</div>
                  </div>
                </button>
              ))}
              {filteredContacts.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">Контакти не знайдені</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col h-full bg-white dark:bg-gray-950 z-10 w-full absolute inset-0 md:relative",
        (!activeChatId && activeTab === 'contacts') ? "hidden md:flex" : (!activeChatId ? "hidden md:flex flex-col" : "flex")
      )}>
        {!activeChatId ? (
          <div className="text-gray-400 font-medium items-center justify-center h-full flex flex-col gap-4 text-center px-4">
             <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-300">
               <MessageCircle size={32} />
             </div>
             <p>Оберіть чат для початку спілкування</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 shrink-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-20">
              <button 
                onClick={() => setActiveChatId(null)}
                className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Назад"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
                if (activeChatType === 'direct') {
                   const currChat = combinedChats.find(c => c.id === activeChatId);
                   if (currChat) handleAvatarClick(currChat.name);
                }
              }}>
                <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center font-bold shadow-md shadow-primary/20 overflow-hidden">
                  {activeChatType === 'direct' && combinedChats.find(c => c.id === activeChatId)?.partnerAvatar ? (
                    <img src={combinedChats.find(c => c.id === activeChatId)?.partnerAvatar} alt="Partner" className="w-full h-full object-cover" />
                  ) : (
                    <span>{combinedChats.find(c => c.id === activeChatId)?.name?.[0]?.toUpperCase() || '?'}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm dark:text-white">{combinedChats.find(c => c.id === activeChatId)?.name || 'Канал'}</h3>
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">{activeChatType === 'direct' ? 'Приватний чат' : 'Публічний канал'}</p>
                </div>
              </div>
              <div className="ml-auto flex gap-2">
                 <button className="p-2 text-gray-400 hover:text-primary transition-smooth bg-gray-50 dark:bg-gray-900 rounded-xl" title="Пошук">
                   <Search size={18} />
                 </button>
                 <button className="p-2 text-gray-400 hover:text-primary transition-smooth bg-gray-50 dark:bg-gray-900 rounded-xl" title="Більше">
                   <MoreVertical size={18} />
                 </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50 dark:bg-gray-950" ref={scrollRef}>
              <AnimatePresence mode="popLayout" initial={false}>
                {messages.map((msg) => (
                  <MemoizedMessageBubble key={msg.id} msg={msg} onAvatarClick={handleAvatarClick} />
                ))}
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 text-sm mt-10">Тут поки пусто... Напишіть першим!</div>
                )}
              </AnimatePresence>
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-950 pb-safe">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="bg-gray-100 dark:bg-gray-900 rounded-3xl p-1.5 flex items-center gap-1 focus-within:ring-2 focus-within:ring-primary/30 transition-shadow shadow-sm"
              >
                <button type="button" className="p-2.5 text-gray-400 hover:text-primary transition-colors bg-white dark:bg-gray-800 rounded-full shadow-sm" title="Відправити фото">
                  <ImageIcon size={18} />
                </button>
                <input 
                  type="text" 
                  autoFocus
                  placeholder={l10n.chat.placeholder} 
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-3 dark:text-white dark:placeholder-gray-500 h-10"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
                <button type="button" className="p-2 text-gray-400 hover:text-primary transition-colors hidden sm:block" title="Емодзі">
                  <Smile size={20} />
                </button>
                <motion.button 
                  type="submit"
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "p-2.5 rounded-full shadow-md transition-all flex items-center justify-center w-10 h-10 shrink-0",
                    messageText.trim() ? "bg-primary text-white" : "bg-gray-300 dark:bg-gray-700 text-gray-100"
                  )}
                  disabled={!messageText.trim()}
                  title="Відправити"
                >
                  <Send size={16} className={messageText.trim() ? "ml-0.5" : ""} />
                </motion.button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Modals placed outside main flow for proper stacking */}

      {/* New Channel Modal */}
      <AnimatePresence>
        {isNewChannelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative"
            >
              <button 
                onClick={() => setIsNewChannelModalOpen(false)}
                className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-gray-900"
                title="Закрити"
              >
                <X size={16} />
              </button>
              <h3 className="text-xl font-bold mb-4 font-display dark:text-white">Новий канал</h3>
              <form onSubmit={handleCreateChannel}>
                <div className="space-y-4">
                  <input
                    type="text"
                    required
                    placeholder="Назва каналу..."
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 text-sm dark:text-white outline-none"
                  />
                  <button 
                    type="submit"
                    className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-smooth text-sm"
                  >
                    Створити
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contact Profile Modal */}
      <AnimatePresence>
        {selectedProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm px-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden relative"
            >
              <button 
                onClick={() => setSelectedProfile(null)}
                className="absolute top-4 right-4 p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 z-10 transition-colors"
                title="Закрити"
              >
                <X size={16} />
              </button>
              
              <div className="h-32 bg-gradient-to-br from-primary/80 to-primary relative">
                <div className="absolute -bottom-12 w-full flex justify-center">
                  <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-900 overflow-hidden bg-gray-100 flex items-center justify-center shadow-lg">
                    {selectedProfile.photoURL ? (
                      <img src={selectedProfile.photoURL} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                       <span className="text-3xl text-gray-400 font-bold">{selectedProfile.name[0]?.toUpperCase()}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="pt-16 pb-6 px-6 text-center">
                <h3 className="text-xl font-bold font-display text-gray-900 dark:text-white mb-1">
                  {selectedProfile.name}
                </h3>
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-6">
                  {selectedProfile.role}
                </p>

                <div className="space-y-3 text-left bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 mb-6">
                  {selectedProfile.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm shrink-0">
                        <Phone size={14} className="text-gray-400" />
                      </div>
                      <span className="text-gray-600 dark:text-gray-300 font-medium truncate">{selectedProfile.phone}</span>
                    </div>
                  )}
                  {selectedProfile.telegram && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm shrink-0">
                         <span className="text-gray-400 font-bold text-[10px]">TG</span>
                      </div>
                      <span className="text-gray-600 dark:text-gray-300 font-medium truncate">{selectedProfile.telegram}</span>
                    </div>
                  )}
                  {selectedProfile.birthDate && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm shrink-0">
                         <span className="text-gray-400 font-bold text-[10px]">ДН</span>
                      </div>
                      <span className="text-gray-600 dark:text-gray-300 font-medium truncate">{selectedProfile.birthDate}</span>
                    </div>
                  )}
                  {selectedProfile.bloodGroup && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm shrink-0">
                         <span className="text-gray-400 font-bold text-[10px]">ГК</span>
                      </div>
                      <span className="text-gray-600 dark:text-gray-300 font-medium truncate">{selectedProfile.bloodGroup}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => startDirectMessage(selectedProfile)}
                    className="flex-1 py-3.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex justify-center items-center gap-2 text-sm"
                  >
                    <MessageSquare size={16} /> Написати
                  </button>
                  {selectedProfile.phone && (
                    <a 
                      href={`tel:${selectedProfile.phone}`}
                      className="py-3.5 px-6 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl font-bold shadow-md hover:bg-gray-50 transition-all border border-gray-100 dark:border-gray-700 flex justify-center items-center"
                    >
                      <Phone size={16} />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
