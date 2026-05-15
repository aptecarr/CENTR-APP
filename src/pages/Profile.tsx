import React from 'react';
import { motion } from 'motion/react';
import { 
  Settings, ChevronRight, Bell, Shield, 
  HelpCircle, LogOut, Quote, Heart, 
  Calendar, Star, Mail, Edit3, Users 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

import { useAuth } from '../providers/AuthProvider';

export const Profile: React.FC = () => {
  const { user, profile, logout } = useAuth();
  
  const mentor = {
    name: user?.displayName || user?.email?.split('@')[0] || 'Олександр Сила',
    role: profile?.role === 'Admin' ? 'Адміністратор' : (profile?.role || 'Ментор'),
    vision: profile?.vision || 'Моє покликання — допомагати людям знаходити шлях до світла через духовне відновлення та підтримку.',
    quote: profile?.quote || '"Бог не дав нам духа страху, але сили, любові та здорового розуму."',
    specialization: profile?.specialization || 'Духовне наставництво, психологія залежностей',
    photoUrl: user?.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
  };

  const menuItems = [
    ...(profile?.role === 'Admin' ? [{ label: 'Управління учасниками', icon: Users, color: 'bg-green-50 text-green-600', to: '/users' }] : []),
    { label: 'Мої замітки та молитви', icon: Edit3, color: 'bg-blue-50 text-blue-600' },
    { label: 'Налаштування графіку', icon: Calendar, color: 'bg-purple-50 text-purple-600', to: '/schedule' },
    { label: 'Сповіщення та безпека', icon: Bell, color: 'bg-orange-50 text-orange-600', to: '/notifications/settings' },
    { label: 'Служба підтримки', icon: HelpCircle, color: 'bg-gray-100 text-gray-600', to: '/support' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto pb-24 h-full overflow-y-auto bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Mentor Profile Header */}
      <div className="bg-white dark:bg-gray-900 p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-800 text-center space-y-4 relative overflow-hidden transition-colors">
        <div className="absolute top-4 right-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-smooth cursor-pointer text-gray-400">
          <Settings size={20} />
        </div>
        
        <div className="relative inline-block">
          <img 
            src={mentor.photoUrl} 
            alt={mentor.name} 
            className="w-32 h-32 rounded-[40px] object-cover border-4 border-primary/5 mx-auto shadow-xl"
          />
          <div className="absolute -bottom-2 -right-2 p-3 bg-primary text-white rounded-2xl shadow-lg">
            <Star size={20} fill="currentColor" />
          </div>
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
          item.to ? (
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
    </div>
  );
};
