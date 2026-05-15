import React, { useState, useEffect } from 'react';
import { 
  Search, Users, Shield, ShieldAlert, 
  UserMinus, UserCheck, MoreVertical, 
  ChevronLeft, Filter, Plus 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query } from 'firebase/firestore';

interface UserRecord {
  uid: string;
  name: string;
  email: string;
  role: 'Senior Mentor' | 'Mentor' | 'Admin' | 'Staff';
  status: 'active' | 'blocked';
  isOwner?: boolean;
}

export const UserManagement: React.FC = () => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'blocked'>('all');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserRecord[];
      setUsers(userData);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleStatus = async (uid: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        status: currentStatus === 'active' ? 'blocked' : 'active'
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const changeRole = async (uid: string, role: UserRecord['role']) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const filteredUsers = users.filter(u => {
    const nameMatch = u.name?.toLowerCase().includes(search.toLowerCase());
    const emailMatch = u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesSearch = nameMatch || emailMatch;
    const matchesTab = activeTab === 'all' || u.status === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-1000 transition-colors duration-300">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 space-y-6 shrink-0 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/profile" className="p-2 text-gray-400 hover:text-primary transition-smooth">
              <ChevronLeft size={24} />
            </Link>
            <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">Управління учасниками</h2>
          </div>
          <button className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-smooth">
            <Plus size={20} />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Пошук за ім'ям або email..." 
            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-transparent rounded-2xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 transition-smooth outline-none border border-transparent focus:border-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-4 border-b border-gray-100 dark:border-gray-800">
          {['all', 'active', 'blocked'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "pb-3 text-xs font-bold uppercase tracking-widest transition-smooth relative",
                activeTab === tab ? "text-primary dark:text-blue-400" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              {tab === 'all' ? 'Усі' : tab === 'active' ? 'Активні' : 'Заблоковані'}
              {activeTab === tab && (
                <motion.div layoutId="user-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary dark:bg-blue-400 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-20 text-gray-400">Завантаження...</div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((user, i) => (
                <motion.div
                  key={user.uid}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ scale: 1.01 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "bg-white dark:bg-gray-900 p-5 rounded-[32px] shadow-sm border flex items-center gap-4 group transition-smooth",
                    user.status === 'blocked' ? 
                      "border-red-100 dark:border-red-900/30 bg-red-50/10 dark:bg-red-900/5 opacity-70" : 
                      "border-transparent dark:border-gray-800 hover:border-primary/10 dark:hover:border-primary/30"
                  )}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-primary dark:text-blue-400 font-bold text-lg shrink-0">
                    {user.name ? user.name[0] : '?'}
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 dark:text-white truncate">{user.name}</h4>
                      {user.isOwner && (
                        <span className="px-1.5 py-0.5 bg-yellow-400 text-primary rounded-full text-[8px] font-black uppercase tracking-widest">
                          Власник
                        </span>
                      )}
                      {user.status === 'blocked' && (
                        <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-[8px] font-black uppercase tracking-widest">
                          Заблоковано
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{user.email}</p>
                      <span className="hidden sm:inline text-gray-200 dark:text-gray-800">|</span>
                      <select 
                        value={user.role}
                        disabled={user.isOwner}
                        onChange={(e) => changeRole(user.uid, e.target.value as any)}
                        className="text-[10px] text-primary dark:text-blue-400 font-bold uppercase tracking-widest bg-primary/5 dark:bg-blue-900/10 px-2 py-0.5 rounded-lg border-none focus:ring-1 focus:ring-primary outline-none cursor-pointer disabled:opacity-50 disabled:cursor-default"
                      >
                        <option value="Senior Mentor">Senior Mentor</option>
                        <option value="Mentor">Mentor</option>
                        <option value="Admin">Admin</option>
                        <option value="Staff">Staff</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {user.status === 'active' ? (
                      <button 
                        disabled={user.isOwner}
                        onClick={() => toggleStatus(user.uid, user.status)}
                        className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-smooth disabled:opacity-20" 
                        title="Заблокувати"
                      >
                        <UserMinus size={20} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => toggleStatus(user.uid, user.status)}
                        className="p-2 text-gray-300 dark:text-gray-600 hover:text-green-500 transition-smooth" 
                        title="Розблокувати"
                      >
                        <UserCheck size={20} />
                      </button>
                    )}
                    <button className="p-2 text-gray-300 dark:text-gray-600 hover:text-primary transition-smooth">
                      <MoreVertical size={20} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-4">
                <Users size={48} className="opacity-20" />
                <p className="italic text-sm">Нікого не знайдено</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
