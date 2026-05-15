import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, ChevronRight, TrendingUp, Calendar, CheckSquare, FileText, BookOpen, Quote } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { getRandomVerse } from '../lib/bible';
import { useAuth } from '../providers/AuthProvider';
import { decryptText } from '../lib/encryption';
import { l10n } from '../lib/l10n';

// High-performance memoized component (Flutter-like StatelessWidget)
const StatCard = React.memo(({ title, value, icon: Icon, colorClass, delay }: any) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    className="news-card bg-white dark:bg-gray-900 p-5 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800 space-y-3 transition-colors"
  >
    <div className={cn("p-2.5 w-fit rounded-2xl", colorClass)}>
      <Icon size={24} />
    </div>
    <div>
      <div className="text-2xl font-black text-gray-900 dark:text-white">{value}</div>
      <div className="text-gray-400 text-[10px] uppercase tracking-[0.15em] font-bold">{title}</div>
    </div>
  </motion.div>
));

StatCard.displayName = 'StatCard';

const NotificationItem = React.memo(({ note, index }: any) => (
  <motion.div 
    whileHover={{ scale: 1.01 }}
    whileTap={{ scale: 0.99 }}
    key={note.id}
    initial={{ opacity: 0, scale: 0.98, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
    className="news-card bg-white dark:bg-gray-900 p-5 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800 flex gap-4 items-start relative overflow-hidden transition-colors"
  >
    {!note.read && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-primary dark:bg-blue-500" />}
    <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-2xl text-primary dark:text-blue-400">
      <Bell size={20} />
    </div>
    <div className="flex-1 space-y-1 min-w-0">
      <div className="flex justify-between items-start">
        <h5 className="font-bold text-sm text-gray-900 dark:text-white truncate pr-2">{note.title}</h5>
        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
          {note.timestamp?.toDate ? 'Сьогодні' : 'Зараз'}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed truncate">{note.message}</p>
    </div>
  </motion.div>
));

NotificationItem.displayName = 'NotificationItem';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const verse = useMemo(() => getRandomVerse(), []);
  const [recentNotifs, setRecentNotifs] = useState<any[]>([]);
  const [taskCount, setTaskCount] = useState(0);
  const [nextDuty, setNextDuty] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch notifications
    const qNotifs = query(
      collection(db, 'notifications'), 
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'), 
      limit(2)
    );
    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      setRecentNotifs(snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          title: decryptText(data.title || ''),
          message: decryptText(data.message || '')
        };
      }));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'notifications'));

    // Count tasks
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTaskCount(snapshot.docs.filter(d => !d.data()?.completed).length);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'tasks'));

    // Try to find next duty (just demo logic - pick first)
    const unsubDuty = onSnapshot(collection(db, 'dutySchedule'), (snapshot) => {
      if (!snapshot.empty) {
        setNextDuty(snapshot.docs[0].data());
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'dutySchedule'));

    return () => {
      unsubNotifs();
      unsubTasks();
      unsubDuty();
    };
  }, [user]);

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto bg-gray-50 dark:bg-gray-950 transition-colors duration-300 min-h-full">
      {/* Welcome Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{l10n.dashboard.welcome}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm italic">"{verse.text}" ({verse.ref})</p>
      </div>

      {/* Next Meeting Card / Duty */}
      <Link to="/schedule">
        <motion.div 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="bg-primary dark:bg-blue-600 text-white p-6 rounded-[32px] shadow-lg shadow-primary/20 relative overflow-hidden group transition-all"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-smooth">
            <Calendar size={120} />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2 text-white/70 text-[10px] font-bold uppercase tracking-[0.2em]">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              {l10n.dashboard.nextDuty}
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight">{nextDuty ? nextDuty.day : `${l10n.common.today}, 17:00`}</h3>
              <p className="text-white/80 text-sm font-medium">
                {nextDuty ? nextDuty.ministers.join(', ') : 'Оборонний пост №1 • Старший зміни'}
              </p>
            </div>
            <div className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-smooth flex items-center gap-2 w-fit">
              Переглянути графік <ChevronRight size={14} />
            </div>
          </div>
        </motion.div>
      </Link>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          title={l10n.dashboard.activeTasks} 
          value={taskCount} 
          icon={CheckSquare} 
          colorClass="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
          delay={0.1}
        />
        <StatCard 
          title={l10n.dashboard.recentReports} 
          value={5} 
          icon={FileText} 
          colorClass="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
          delay={0.15}
        />
      </div>

      {/* Notifications Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-widest text-xs">{l10n.dashboard.notifications}</h4>
          <Link to="/schedule">
            <button className="text-primary dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest">{l10n.common.all}</button>
          </Link>
        </div>
        
        <div className="space-y-3">
          {recentNotifs.length === 0 ? (
            <div className="p-6 text-center bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{l10n.dashboard.noNotifications}</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {recentNotifs.map((note, i) => (
                <NotificationItem key={note.id} note={note} index={i} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4 pt-4">
        {[
          { label: 'Новий звіт', icon: FileText, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400', to: '/patients' },
          { label: 'Фінанси', icon: TrendingUp, color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400', to: '/finance' },
          { label: 'Бібліотека', icon: BookOpen, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300', to: '/sermons' },
        ].map((action, i) => (
          <Link 
            key={i} 
            to={action.to}
            className="flex flex-col items-center gap-3 group"
          >
            <motion.div 
              whileHover={{ scale: 1.1, y: -5 }}
              whileTap={{ scale: 0.9 }}
              className={cn("w-16 h-16 rounded-[24px] flex items-center justify-center transition-all bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800", action.color)}
            >
              <action.icon size={28} />
            </motion.div>
            <span className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.1em]">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};
