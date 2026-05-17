import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import { LayoutGrid, Users, MessageSquare, BookOpen, Calendar, Wallet, Moon, Sun, Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { l10n } from '../lib/l10n';

interface ToastData {
  id: string;
  message: string;
  title: string;
  link?: string;
  avatar?: string;
}

export const Layout: React.FC = () => {
  const { user, profile, isStaff } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const initialLoadRef = useRef(true);

  // Load sound setting and play
  const playNotificationSound = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const soundUrl = userDoc.data()?.settings?.notificationSound || 'default';
      const melodyMap: Record<string, string> = {
        default: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
        calm: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Sound_Effect_-_Water_Drop_01.ogg',
        bright: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3',
        spiritual: 'https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3',
        nature: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Bird_song.ogg',
      };
      
      const audioToPlay = melodyMap[soundUrl] || melodyMap.default;
      const audio = new Audio(audioToPlay);
      audio.play().catch(console.error);

      if (userDoc.data()?.settings?.vibrationEnabled !== false && navigator.vibrate) {
         navigator.vibrate(200);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const addToast = (toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
    playNotificationSound();
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
    window.dispatchEvent(new Event('themechange'));
  }, [theme]);

  // Read theme from storage globally
  useEffect(() => {
    const handleThemeChange = () => {
      const storedTheme = localStorage.getItem('theme') as 'light' | 'dark';
      if (storedTheme) {
        setTheme(storedTheme);
      }
    };
    window.addEventListener('themechange', handleThemeChange);
    window.addEventListener('storage', handleThemeChange);
    return () => {
      window.removeEventListener('themechange', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
    };
  }, []);

  // System notifications
  useEffect(() => {
    if (!user || !isStaff) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'notifications'));
    return () => unsub();
  }, [user, isStaff]);

  // Global Chat Notifications
  useEffect(() => {
    if (!user) return;
    
    let isFirstRun = true;
    
    // Listen to direct messages for unread global notifications
    const qDms = query(collection(db, 'direct_messages'), where('participants', 'array-contains', user.uid));
    const unsub = onSnapshot(qDms, (snapshot) => {
       if (isFirstRun) {
         isFirstRun = false;
         return; // Skip initial load
       }

       snapshot.docChanges().forEach((change) => {
         // Only trigger on modified (new messages update lastMsg/lastTimestamp)
         if (change.type === 'modified') {
            const data = change.doc.data();
            // Check if lastMessage is sender is someone else
            if (data.lastSenderId && data.lastSenderId !== user.uid) {
               // Verify we are not already looking at this chat
               const activeChatPattern = new RegExp(`^/chat(/${change.doc.id})?$`);
               
               if (!location.pathname.match(activeChatPattern)) {
                 addToast({
                   title: 'Нове повідомлення',
                   message: data.lastMsg || 'Вам надіслали повідомлення',
                   link: `/chat/${change.doc.id}`
                 });
               }
            }
         }
       });
    }, (error) => handleFirestoreError(error, OperationType.GET, 'direct_messages'));
    
    return () => unsub();
  }, [user, location.pathname]);

  const navItems = [
    { path: '/', icon: LayoutGrid, label: 'Головна' }, 
    { path: '/patients', icon: Users, label: 'Підопічні' }, 
    { path: '/chat', icon: MessageSquare, label: l10n.chat.channels },
    { path: '/library', icon: BookOpen, label: l10n.sermons.title },
    { path: '/schedule', icon: Calendar, label: 'Графік' },
    { path: '/finance', icon: Wallet, label: 'Фінанси' },
  ];

  const visibleNavItems = navItems;

  const isChatDetail = location.pathname.startsWith('/chat/') && location.pathname !== '/chat';

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors duration-300">
      
      {/* Global Toast Container */}
      <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl rounded-2xl p-4 flex items-center gap-3 w-full max-w-sm pointer-events-auto cursor-pointer"
              onClick={() => {
                if (toast.link) navigate(toast.link);
                setToasts(prev => prev.filter(t => t.id !== toast.id));
              }}
            >
               <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                 <MessageSquare size={18} className="text-primary" />
               </div>
               <div className="flex-1 min-w-0">
                 <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{toast.title}</h4>
                 <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{toast.message}</p>
               </div>
               <button 
                 onClick={(e) => { e.stopPropagation(); setToasts(prev => prev.filter(t => t.id !== toast.id)); }}
                 className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
               >
                 <X size={16} />
               </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top Header - Mobile Adaptive */}
      {!isChatDetail && (
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 pt-safe flex items-center justify-between z-10 shrink-0 transition-colors no-select">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark flex items-center justify-center text-white shadow-xl shadow-primary/30 p-1 relative group overflow-hidden">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-smooth" />
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
                <path d="M16 4C16 4 19.5 5.5 20 8.5C20.5 11.5 18 13.5 18 13.5L16 12C16 12 17.5 10.5 17 8C16.5 5.5 14 5 14 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 20C8 20 4.5 18.5 4 15.5C3.5 12.5 6 10.5 6 10.5L8 12C8 12 6.5 13.5 7 16C7.5 18.5 10 19 10 19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="1.5" className="fill-white/30" />
                <path d="M11 11L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-tighter text-primary dark:text-white font-display leading-none">
                {l10n.auth.title}
              </h1>
              <span className="text-[7px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-0.5">
                Нове Життя
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-xl hover:scale-105 transition-smooth"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div className="relative">
              <Link to="/notifications/settings" className="p-2 block hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-smooth">
                <Bell size={18} className="text-gray-500 dark:text-gray-400" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
                )}
              </Link>
            </div>
            <Link to="/profile" className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden ml-1 border border-gray-200 dark:border-gray-700">
              <img 
                src={profile?.photoUrl || user?.photoURL || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"} 
                alt={profile?.name || "Mentor"} 
                className="w-full h-full object-cover"
              />
            </Link>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className={cn("flex-1 overflow-y-auto relative pb-20 md:pb-0", isChatDetail && "pb-0")}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-2 py-1 pb-safe flex justify-around items-center z-20 md:relative md:border-t-0 md:bg-gray-50 md:dark:bg-gray-950 md:px-6 md:py-4 md:justify-start md:gap-8 transition-colors no-select">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-smooth group active:scale-95 touch-none",
                isActive ? "text-primary dark:text-white" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              )
            }
          >
            {({ isActive }) => (
              <motion.div 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-1"
              >
                <div className={cn(
                  "p-2 rounded-xl transition-smooth",
                  isActive ? "bg-primary/10 dark:bg-primary/20" : "group-hover:bg-gray-100 dark:group-hover:bg-gray-800"
                )}>
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  {item.label}
                </span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
