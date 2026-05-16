import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, CheckCircle2, 
  Circle, ChevronRight, LayoutGrid, Users, History, 
  Edit3, Save, X, Bell, Info, AlertTriangle, CheckCircle 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, addDays, startOfToday, isSameDay, startOfWeek } from 'date-fns';
import { uk } from 'date-fns/locale';
import { db } from '../lib/firebase';
import { 
  collection, onSnapshot, doc, setDoc, query, where,
  orderBy, limit, addDoc, serverTimestamp, getDocs, updateDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import type { OperationType } from '../lib/firebase';
import { useAuth } from '../providers/AuthProvider';
import { encryptText, decryptText } from '../lib/encryption';

interface DutyShift {
  id?: string;
  day: string;
  ministers: string[];
  startTime: string;
  endTime: string;
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: any;
  read: boolean;
}

const initialDutySchedule: DutyShift[] = [
  { day: 'Понеділок', ministers: ['Олександр С.', 'Іван П.'], startTime: '17:00', endTime: '17:00' },
  { day: 'Вівторок', ministers: ['Марина К.'], startTime: '17:00', endTime: '17:00' },
  { day: 'Середа', ministers: ['Василь С.', 'Сергій Б.'], startTime: '17:00', endTime: '17:00' },
  { day: 'Четвер', ministers: ['Андрій М.'], startTime: '17:00', endTime: '17:00' },
  { day: 'П\'ятниця', ministers: ['Дмитро Л.'], startTime: '17:00', endTime: '17:00' },
  { day: 'Субота', ministers: ['Павло Г.'], startTime: '17:00', endTime: '17:00' },
  { day: 'Неділя', ministers: ['Олександр С.'], startTime: '17:00', endTime: '17:00' },
];

export const Schedule: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [view, setView] = useState<'my' | 'duty' | 'notifications'>('my');
  const [dutySchedule, setDutySchedule] = useState<DutyShift[]>(initialDutySchedule);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editMinisters, setEditMinisters] = useState('');
  const [editStartTime, setEditStartTime] = useState('17:00');
  const [editEndTime, setEditEndTime] = useState('17:00');
  const [showToast, setShowToast] = useState<AppNotification | null>(null);
  const [loading, setLoading] = useState(true);

  const days = Array.from({ length: 14 }, (_, i) => addDays(startOfToday(), i - 3)); // Show 14 days around today

  // Sync Duty Schedule with Firestore
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(collection(db, 'dutySchedule'), (snapshot) => {
      if (snapshot.empty) {
        // Use a flag to avoid recursion
        const init = async () => {
          try {
            // Check once more before writing
            const existing = await getDocs(collection(db, 'dutySchedule'));
            if (existing.empty) {
              for (const shift of initialDutySchedule) {
                await addDoc(collection(db, 'dutySchedule'), shift);
              }
            }
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, 'dutySchedule');
          }
        };
        init();
      } else {
        const shifts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DutyShift[];
        const order = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота', 'Неділя'];
        shifts.sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
        setDutySchedule(shifts);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'dutySchedule'));
    return () => unsub();
  }, [user]);

  // Sync Tasks for selected date
  useEffect(() => {
    if (!user) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const unsub = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const allTasks = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          title: decryptText(data.title || '')
        };
      });
      // Filter client-side for simplicity in this demo, but real app would use query
      const filtered = allTasks.filter((t: any) => t.date === dateStr);
      setTasks(filtered);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'tasks'));
    return () => unsub();
  }, [selectedDate, user]);

  // Listen for Notifications
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const newNotifs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          title: decryptText(data.title || ''),
          message: decryptText(data.message || '')
        };
      }) as AppNotification[];
      
      if (newNotifs.length > 0 && notifications.length > 0) {
        const latest = newNotifs[0];
        if (latest.id !== notifications[0].id && !latest.read) {
          setShowToast(latest);
          setTimeout(() => setShowToast(null), 5000);
        }
      }
      setNotifications(newNotifs);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'notifications'));

    return () => unsub();
  }, [notifications.length, user]);

  const toggleTask = async (taskId: string, currentStatus: boolean) => {
    const path = `tasks/${taskId}`;
    try {
      await updateDoc(doc(db, 'tasks', taskId), { completed: !currentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const startEditing = (shift: DutyShift) => {
    setEditingDay(shift.day);
    setEditMinisters(shift.ministers.join(', '));
    setEditStartTime(shift.startTime);
    setEditEndTime(shift.endTime);
  };

  const saveEdit = async () => {
    const shiftToUpdate = dutySchedule.find(s => s.day === editingDay);
    if (!shiftToUpdate?.id) return;

    try {
      const newMinisters = editMinisters.split(',').map(m => m.trim()).filter(Boolean);
      await setDoc(doc(db, 'dutySchedule', shiftToUpdate.id), {
        ...shiftToUpdate,
        ministers: newMinisters,
        startTime: editStartTime,
        endTime: editEndTime
      });

      await addDoc(collection(db, 'notifications'), {
        userId: user?.uid || 'all',
        title: encryptText('Оновлення графіка'),
        message: encryptText(`${user?.displayName || 'Система'} змінив графік на ${editingDay}. Нові чергові: ${newMinisters.join(', ')}`),
        type: 'info',
        timestamp: serverTimestamp(),
        read: false
      });

      setEditingDay(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'dutySchedule/notifications');
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'notifications'), 
        where('userId', '==', user.uid),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const updatePromises = snapshot.docs
        .filter(d => !d.data().read)
        .map(d => updateDoc(doc(db, 'notifications', d.id), { read: true }));
      
      await Promise.all(updatePromises);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-1000 transition-colors duration-300">
      {/* Calendar Strip */}
      <div className="p-6 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 space-y-6 shrink-0 transition-colors">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">Графік</h2>
          <CalendarIcon className="text-gray-400" size={24} />
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {days.map((day) => (
            <motion.button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex flex-col items-center gap-2 min-w-[56px] py-3 rounded-2xl transition-smooth",
                isSameDay(day, selectedDate) ? 
                  "bg-primary text-white shadow-lg shadow-primary/20" : 
                  "bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {format(day, 'EEE', { locale: uk })}
              </span>
              <span className="text-lg font-bold">
                {format(day, 'd')}
              </span>
              {isSameDay(day, startOfToday()) && (
                <div className={cn(
                  "w-1 h-1 rounded-full",
                  isSameDay(day, selectedDate) ? "bg-white" : "bg-primary"
                )} />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 px-6 pb-2 shrink-0 flex gap-6 overflow-x-auto scrollbar-hide transition-colors">
        <button 
          onClick={() => setView('my')}
          className={cn(
            "pb-3 text-xs font-bold uppercase tracking-widest relative transition-smooth whitespace-nowrap",
            view === 'my' ? "text-primary dark:text-blue-400 border-b-2 border-primary dark:border-blue-400" : "text-gray-400"
          )}
        >
          Мій розклад
        </button>
        <button 
          onClick={() => setView('duty')}
          className={cn(
            "pb-3 text-xs font-bold uppercase tracking-widest relative transition-smooth whitespace-nowrap",
            view === 'duty' ? "text-primary dark:text-blue-400 border-b-2 border-primary dark:border-blue-400" : "text-gray-400"
          )}
        >
          Чергування
        </button>
        <button 
          onClick={() => setView('notifications')}
          className={cn(
            "pb-3 text-xs font-bold uppercase tracking-widest relative transition-smooth whitespace-nowrap flex items-center gap-2",
            view === 'notifications' ? "text-primary dark:text-blue-400 border-b-2 border-primary dark:border-blue-400" : "text-gray-400"
          )}
        >
          Сповіщення
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold">
              {notifications.filter(n => !n.read).length}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-24 left-4 right-4 z-50 pointer-events-none"
          >
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-xl border border-primary/20 flex items-start gap-4 pointer-events-auto">
              <div className="p-2 bg-primary/10 text-primary dark:text-blue-400 rounded-xl">
                <Bell size={20} />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">{showToast.title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{showToast.message}</p>
              </div>
              <button onClick={() => setShowToast(null)} className="p-1 text-gray-300 hover:text-gray-500 transition-smooth">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {view === 'my' ? (
            <motion.div
              key="my-view"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-gray-900 dark:text-white">Завдання на {format(selectedDate, 'd MMMM', { locale: uk })}</h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{tasks.length} завдання</span>
              </div>

              <div className="space-y-4">
                {tasks.length === 0 ? (
                  <div className="text-center py-10 bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800">
                    <p className="text-sm text-gray-400 italic">На цей день завдань не заплановано</p>
                  </div>
                ) : (
                  tasks.map((task, i) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white dark:bg-gray-900 p-5 rounded-[32px] shadow-sm border border-gray-50 dark:border-gray-800 flex items-start gap-4 group transition-smooth"
                    >
                      <button 
                        onClick={() => toggleTask(task.id, task.completed)}
                        className={cn(
                          "mt-1 p-1 rounded-full transition-smooth hover:scale-110",
                          task.completed ? "text-green-500 bg-green-50 dark:bg-green-900/20" : "text-gray-200 dark:text-gray-700 hover:text-primary"
                        )}
                      >
                        {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                      </button>
                      
                      <div className="flex-1 space-y-3 min-w-0">
                        <div>
                          <h4 className={cn(
                            "font-bold transition-smooth",
                            task.completed ? "text-gray-300 dark:text-gray-600 line-through" : "text-gray-800 dark:text-gray-200"
                          )}>
                            {task.title}
                          </h4>
                          {task.important && !task.completed && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full text-[8px] font-bold uppercase tracking-widest whitespace-nowrap">
                              Важливо
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-primary/50" />
                            {task.time}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin size={12} className="text-primary/50" />
                            {task.location}
                          </div>
                        </div>
                      </div>

                      {!task.completed && (
                        <button className="p-2 text-gray-300 dark:text-gray-700 group-hover:text-primary transition-smooth">
                          <ChevronRight size={20} />
                        </button>
                      )}
                    </motion.div>
                  ))
                )}
              </div>

              <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 p-6 rounded-[32px] space-y-4">
                <div className="flex items-center gap-2 text-primary dark:text-blue-400 font-bold text-sm uppercase tracking-widest">
                  <LayoutGrid size={18} />
                  Внутрішні оголошення
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed italic">
                  "Браття, пам'ятайте про завтрашній суботник. Початок о 09:00. Вхід вільний для всіх служителів."
                </p>
              </div>
            </motion.div>
          ) : view === 'duty' ? (
            <motion.div
              key="duty-view"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="p-6 space-y-6"
            >
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-[32px] border border-orange-100 dark:border-orange-900/30 flex items-start gap-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-xl">
                  <Clock size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-orange-900 dark:text-orange-200">Період чергування</h4>
                  <p className="text-[10px] text-orange-800/70 dark:text-orange-300/50 font-bold uppercase tracking-wide">
                    З 17:00 одного дня до 17:00 наступного
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {dutySchedule.map((shift, i) => (
                  <motion.div
                    key={shift.day}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={editingDay === shift.day ? {} : { scale: 1.02 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white dark:bg-gray-900 p-5 rounded-[32px] shadow-sm border border-transparent dark:border-gray-800 hover:border-primary/10 dark:hover:border-primary/30 transition-smooth group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white">{shift.day}</h4>
                        {editingDay === shift.day ? (
                          <div className="flex flex-col gap-3 mt-3 pr-4">
                            <input 
                              type="text" 
                              value={editMinisters}
                              onChange={(e) => setEditMinisters(e.target.value)}
                              className="text-xs p-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-primary/20 rounded-2xl focus:ring-1 focus:ring-primary outline-none"
                              placeholder="Служителі..."
                            />
                            <div className="flex gap-3">
                              <input 
                                type="time" 
                                value={editStartTime}
                                onChange={(e) => setEditStartTime(e.target.value)}
                                className="flex-1 text-xs p-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-primary/20 rounded-2xl focus:ring-1 focus:ring-primary outline-none"
                              />
                              <input 
                                type="time" 
                                value={editEndTime}
                                onChange={(e) => setEditEndTime(e.target.value)}
                                className="flex-1 text-xs p-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-primary/20 rounded-2xl focus:ring-1 focus:ring-primary outline-none"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={saveEdit} className="flex-1 py-2 bg-primary text-white rounded-xl text-[10px] font-bold uppercase">Зберегти</button>
                              <button onClick={() => setEditingDay(null)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-xl text-[10px] font-bold uppercase">Скасувати</button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1">
                            <div className="flex flex-wrap gap-2">
                              {shift.ministers.map((m, idx) => (
                                <span key={idx} className="px-3 py-1 bg-primary/5 dark:bg-primary/20 text-primary dark:text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-tight">
                                  {m}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">
                              <Clock size={10} className="text-primary/50" />
                              {shift.startTime} — {shift.endTime}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {!editingDay && (
                        <button 
                          onClick={() => startEditing(shift)}
                          className="p-3 text-gray-300 dark:text-gray-700 hover:text-primary transition-smooth"
                        >
                          <Edit3 size={20} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="notification-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-gray-900 dark:text-white">Останні сповіщення</h3>
                <button 
                  onClick={markAllRead}
                  className="text-[10px] font-bold text-primary dark:text-blue-400 uppercase tracking-widest"
                >
                  Прочитати все
                </button>
              </div>

              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 space-y-4 bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-300 dark:text-gray-700">
                      <Bell size={24} />
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Немає сповіщень</p>
                  </div>
                ) : (
                  notifications.map((notif, i) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01 }}
                      className={cn(
                        "p-5 rounded-[32px] border transition-smooth relative overflow-hidden",
                        notif.read ? 
                          "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800" : 
                          "bg-primary/5 dark:bg-primary/10 border-primary/10 dark:border-primary/30"
                      )}
                    >
                      {!notif.read && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-primary" />}
                      <div className="flex gap-4">
                        <div className={cn(
                          "p-2 rounded-2xl shrink-0 flex items-center justify-center h-10 w-10",
                          notif.type === 'info' ? "bg-blue-50 dark:bg-blue-900/30 text-blue-500" :
                          notif.type === 'success' ? "bg-green-50 dark:bg-green-900/30 text-green-500" :
                          "bg-orange-50 dark:bg-orange-900/30 text-orange-500"
                        )}>
                          {notif.type === 'info' ? <Info size={18} /> : 
                           notif.type === 'success' ? <CheckCircle size={18} /> : 
                           <AlertTriangle size={18} />}
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex justify-between items-start">
                             <h4 className="font-bold text-sm text-gray-900 dark:text-white">{notif.title}</h4>
                             <span className="text-[8px] font-bold text-gray-300 dark:text-gray-600 whitespace-nowrap">
                               {notif.timestamp?.toDate ? format(notif.timestamp.toDate(), 'HH:mm') : 'Зараз'}
                             </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{notif.message}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
