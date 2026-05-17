import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, ChevronRight, Bell, Shield, 
  HelpCircle, LogOut, Quote, Heart, 
  Calendar, Star, Mail, Edit3, Users,
  Camera, Loader2, X, Moon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

import { useAuth } from '../providers/AuthProvider';

interface UserProfileData {
  lastName: string;
  firstName: string;
  middleName: string;
  phone: string;
  birthDate: string;
  bloodType: string;
  telegram: string;
}

export const Profile: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [formData, setFormData] = useState<UserProfileData>({
    lastName: '',
    firstName: '',
    middleName: '',
    phone: '',
    birthDate: '',
    bloodType: '',
    telegram: '',
  });

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' || 
                   (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const handleThemeChange = () => {
      setIsDarkMode(localStorage.getItem('theme') === 'dark');
    };
    window.addEventListener('themechange', handleThemeChange);
    window.addEventListener('storage', handleThemeChange);
    return () => {
      window.removeEventListener('themechange', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
    };
  }, []);

  const toggleDarkMode = () => {
    const newVal = !isDarkMode;
    setIsDarkMode(newVal);
    if (newVal) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    window.dispatchEvent(new Event('themechange'));
  };

  // Determine role display based on permissions
  let displayRole = profile?.role || 'Ментор';
  const perms = profile?.permissions;
  if (perms?.isAdmin || profile?.role === 'Admin') {
    displayRole = 'Адміністратор';
  } else if (perms?.isFinanceResponsible) {
    displayRole = 'Служитель / Фінанси';
  }

  const mentor = {
    name: user?.displayName || user?.email?.split('@')[0] || 'Олександр Сила',
    role: displayRole,
    vision: profile?.vision || 'Моє покликання — допомагати людям знаходити шлях до світла через духовне відновлення та підтримку.',
    quote: profile?.quote || '"Бог не дав нам духа страху, але сили, любові та здорового розуму."',
    specialization: profile?.specialization || 'Духовне наставництво, психологія залежностей',
    photoUrl: profile?.photoUrl || user?.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('380')) val = '+' + val;
    else if (val.startsWith('0')) val = '+38' + val;
    else if (val.length > 0 && !val.startsWith('380')) val = '+380' + val;
    setFormData({ ...formData, phone: val });
  };

  const handleOpenSettings = async () => {
    setIsSettingsOpen(true);
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          lastName: data.lastName || '',
          firstName: data.firstName || '',
          middleName: data.middleName || '',
          phone: data.phone || '',
          birthDate: data.birthDate || '',
          bloodType: data.bloodType || '',
          telegram: data.telegram || '',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      handleFirestoreError(error, OperationType.GET, 'users');
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { ...formData });
      setIsSettingsOpen(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploading(true);
      
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 400;
            const MAX_HEIGHT = 400;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
          img.onerror = reject;
        };
        reader.onerror = reject;
      });

      await updateDoc(doc(db, 'users', user.uid), {
        photoUrl: base64Data
      });
      
    } catch (error) {
      console.error('Error uploading photo:', error);
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    } finally {
      setIsUploading(false);
    }
  };

  const menuItems = [
    ...(profile?.role === 'Admin' || perms?.isAdmin ? [{ label: 'Управління учасниками', icon: Users, color: 'bg-green-50 text-green-600', to: '/users' }] : []),
    { label: 'Мої замітки та молитви', icon: Edit3, color: 'bg-blue-50 text-blue-600' },
    { label: 'Налаштування графіку', icon: Calendar, color: 'bg-purple-50 text-purple-600', to: '/schedule' },
    { label: 'Сповіщення та безпека', icon: Bell, color: 'bg-orange-50 text-orange-600', to: '/notifications/settings' },
    { label: 'Нічний режим', icon: Moon, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', isToggle: true, value: isDarkMode, onChange: toggleDarkMode },
    { label: 'Служба підтримки', icon: HelpCircle, color: 'bg-gray-100 text-gray-600', to: '/support' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto pb-24 h-full overflow-y-auto bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Mentor Profile Header */}
      <div className="bg-white dark:bg-gray-900 p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-800 text-center space-y-4 relative overflow-hidden transition-colors">
        <div 
          onClick={handleOpenSettings}
          className="absolute top-4 right-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-smooth cursor-pointer text-gray-400"
        >
          <Settings size={20} />
        </div>
        
        <div className="relative inline-block cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
          {isUploading ? (
            <div className="w-32 h-32 rounded-[40px] bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-4 border-primary/5 mx-auto">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <>
              <img 
                src={mentor.photoUrl} 
                alt={mentor.name} 
                className="w-32 h-32 rounded-[40px] object-cover border-4 border-primary/5 mx-auto shadow-xl transition-opacity group-hover:opacity-80"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[40px] flex items-center justify-center mx-auto w-32 h-32 border-4 border-transparent">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </>
          )}
          <div className="absolute -bottom-2 -right-2 p-3 bg-primary text-white rounded-2xl shadow-lg z-10">
            <Star size={20} fill="currentColor" />
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handlePhotoUpload} 
          />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">{mentor.name}</h2>
          <p className="text-[10px] font-bold text-primary dark:text-blue-400 uppercase tracking-[0.2em]">{mentor.role}</p>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <button className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:bg-primary hover:text-white transition-smooth text-gray-400">
            <Mail size={20} />
          </button>
          <button className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:bg-primary hover:text-white transition-smooth text-gray-400">
            <Shield size={20} />
          </button>
        </div>
      </div>

      {/* Vision & Quote Section */}
      <div className="space-y-4">
        <div className="bg-yellow-50/50 dark:bg-yellow-900/10 p-6 rounded-[32px] border border-yellow-100/50 dark:border-yellow-700/20 space-y-3 relative group">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 font-bold text-[10px] uppercase tracking-widest">
            <Heart size={14} /> Моє служіння та бачення
          </div>
          <p className="text-sm text-yellow-900 dark:text-yellow-300 leading-relaxed italic">
            {mentor.vision}
          </p>
          <div className="pt-4 mt-4 border-t border-yellow-100/30">
            <div className="flex gap-3">
              <Quote size={24} className="text-yellow-600/20 shrink-0" />
              <p className="text-xs font-bold text-yellow-700 dark:text-yellow-500 leading-relaxed uppercase tracking-tight">
                {mentor.quote}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Menu */}
      <div className="space-y-3">
        {menuItems.map((item, i) => (
          item.isToggle ? (
            <div
              key={i}
              className="w-full bg-white dark:bg-gray-900 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-2xl transition-smooth", item.color)}>
                  <item.icon size={20} />
                </div>
                <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
              </div>
              
              <button 
                onClick={item.onChange}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  item.value ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                )}
              >
                <div className={cn(
                  "absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
                  item.value ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>
          ) : item.to ? (
            <Link
              key={i}
              to={item.to}
              className="w-full bg-white dark:bg-gray-900 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between group transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-2xl transition-smooth group-hover:scale-110", item.color)}>
                  <item.icon size={20} />
                </div>
                <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
              </div>
              <ChevronRight size={20} className="text-gray-300 dark:text-gray-600 group-hover:text-primary transition-smooth" />
            </Link>
          ) : (
            <button
              key={i}
              className="w-full bg-white dark:bg-gray-900 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between group transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-2xl transition-smooth group-hover:scale-110", item.color)}>
                  <item.icon size={20} />
                </div>
                <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
              </div>
              <ChevronRight size={20} className="text-gray-300 dark:text-gray-600 group-hover:text-primary transition-smooth" />
            </button>
          )
        ))}
      </div>

      {/* Logout */}
      <button 
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 p-5 text-orange-600 font-bold text-sm uppercase tracking-widest rounded-3xl border-2 border-dashed border-orange-100 dark:border-orange-900/30 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-smooth mt-4"
      >
        <LogOut size={20} /> Вийти з облікового запису
      </button>

      <div className="text-center py-6">
        <p className="text-[10px] text-gray-300 font-bold uppercase tracking-[0.3em]">Версія 2.4.1 (Stable)</p>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[32px] p-6 relative z-10 shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold dark:text-white">Редагування особистого кабінету</h3>
                <button 
                  onClick={() => setIsSettingsOpen(false)} 
                  className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white transition-smooth"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Прізвище</label>
                  <input 
                    type="text" 
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Ім'я</label>
                  <input 
                    type="text" 
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">По батькові</label>
                  <input 
                    type="text" 
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Телефон</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="+380"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Дата народження</label>
                  <input 
                    type="date" 
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white transition-all [&::-webkit-calendar-picker-indicator]:dark:invert"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Група крові та Резус-фактор</label>
                  <select
                    value={formData.bloodType}
                    onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white transition-all appearance-none"
                  >
                    <option value="">Не вказано</option>
                    <option value="O(I)+">O(I) +</option>
                    <option value="O(I)-">O(I) -</option>
                    <option value="A(II)+">A(II) +</option>
                    <option value="A(II)-">A(II) -</option>
                    <option value="B(III)+">B(III) +</option>
                    <option value="B(III)-">B(III) -</option>
                    <option value="AB(IV)+">AB(IV) +</option>
                    <option value="AB(IV)-">AB(IV) -</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Telegram-нік</label>
                  <input 
                    type="text" 
                    value={formData.telegram}
                    onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                    placeholder="@username"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 py-3 text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-smooth"
                >
                  Скасувати
                </button>
                <button 
                  onClick={handleSaveSettings}
                  className="flex-1 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-smooth"
                >
                  Зберегти
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
