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

interface Permissions {
  isAdmin?: boolean;
  isFinanceResponsible?: boolean;
  isScheduleManager?: boolean;
}

interface UserRecord {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  avatarUrl?: string;
  status: 'active' | 'blocked';
  isOwner?: boolean;
  permissions?: Permissions;
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

  const togglePermission = async (uid: string, currentPermissions: Permissions | undefined, key: keyof Permissions) => {
    try {
      const newPermissions = { ...currentPermissions };
      newPermissions[key] = !newPermissions[key];
      await updateDoc(doc(db, 'users', uid), { 
        permissions: newPermissions 
      });
    } catch (error) {
      console.error("Error updating permission:", error);
    }
  };

  const filteredUsers = users.filter(u => {
    const nameMatch = u.name?.toLowerCase().includes(search.toLowerCase());
    const emailMatch = u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesSearch = nameMatch || emailMatch;
    const matchesTab = activeTab === 'all' || u.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const ToggleSwitch = ({ label, checked, onChange, disabled }: { label: string, checked: boolean, onChange: () => void, disabled?: boolean }) => (
    <label className={cn("flex flex-col items-center gap-1.5 cursor-pointer", disabled && "opacity-50 cursor-default")}>
      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-center h-6 flex items-end">{label}</span>
      <div className="relative">
        <input 
          type="checkbox" 
          className="sr-only" 
          checked={checked} 
          onChange={onChange}
          disabled={disabled}
        />
        <div className={cn(
          "w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full shadow-inner transition-colors",
          checked && "bg-primary dark:bg-blue-600"
        )}></div>
        <div className={cn(
          "absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
          checked && "translate-x-5"
        )}></div>
      </div>
    </label>
  );

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
              {filteredUsers.map((user, i) => {
                const isAdmin = user.permissions?.isAdmin === true;
                const isFinance = user.permissions?.isFinanceResponsible === true;
                const isSchedule = user.permissions?.isScheduleManager === true;
                const isJustServant = !isAdmin && !isFinance && !isSchedule;

                const photoURL = user.photoURL || user.avatarUrl;

                return (
                  <motion.div
                    key={user.uid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "bg-white dark:bg-gray-900 p-5 rounded-[32px] shadow-sm border flex flex-col md:flex-row md:items-center gap-6 transition-smooth",
                      user.status === 'blocked' ? 
                        "border-red-100 dark:border-red-900/30 bg-red-50/10 dark:bg-red-900/5 opacity-70" : 
                        "border-transparent dark:border-gray-800 hover:border-primary/10 dark:hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-primary dark:text-blue-400 font-bold text-xl shrink-0 overflow-hidden shadow-inner">
                        {photoURL ? (
                          <img src={photoURL} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          user.name ? user.name[0]?.toUpperCase() : '?'
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg text-gray-900 dark:text-white truncate">{user.name}</h4>
                          {user.isOwner && (
                            <span className="px-2 py-0.5 bg-yellow-400 text-primary rounded-full text-[9px] font-black uppercase tracking-widest">
                              Власник
                            </span>
                          )}
                          {user.status === 'blocked' && (
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                              Заблоковано
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 font-medium truncate">{user.email}</p>
                        
                        {isJustServant && (
                          <div className="inline-block mt-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                            Служитель
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                      <ToggleSwitch 
                        label="Адмін" 
                        checked={isAdmin} 
                        disabled={user.isOwner}
                        onChange={() => togglePermission(user.uid, user.permissions, 'isAdmin')} 
                      />
                      <ToggleSwitch 
                        label="Фінанси" 
                        checked={isFinance} 
                        disabled={user.isOwner}
                        onChange={() => togglePermission(user.uid, user.permissions, 'isFinanceResponsible')} 
                      />
                      <ToggleSwitch 
                        label="Графік" 
                        checked={isSchedule} 
                        disabled={user.isOwner}
                        onChange={() => togglePermission(user.uid, user.permissions, 'isScheduleManager')} 
                      />
                    </div>

                    <div className="flex items-center gap-1 justify-end md:border-l md:border-gray-100 dark:md:border-gray-800 md:pl-4 shrink-0">
                      {user.status === 'active' ? (
                        <button 
                          disabled={user.isOwner}
                          onClick={() => toggleStatus(user.uid, user.status)}
                          className="p-2.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400" 
                          title="Заблокувати"
                        >
                          <UserMinus size={18} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => toggleStatus(user.uid, user.status)}
                          className="p-2.5 text-gray-400 hover:bg-green-50 hover:text-green-500 dark:hover:bg-green-900/20 rounded-xl transition-colors" 
                          title="Розблокувати"
                        >
                          <UserCheck size={18} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
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

