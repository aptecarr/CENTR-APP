import React from 'react';
import { useAuth } from '../providers/AuthProvider';
import { motion } from 'motion/react';
import { LogIn } from 'lucide-react';
import { l10n } from '../lib/l10n';

export const Login: React.FC = () => {
  const { signIn } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-gray-900 p-8 rounded-[40px] shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center gap-8 text-center"
      >
        <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
            <path d="M16 4C16 4 19.5 5.5 20 8.5C20.5 11.5 18 13.5 18 13.5L16 12C16 12 17.5 10.5 17 8C16.5 5.5 14 5 14 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 20C8 20 4.5 18.5 4 15.5C3.5 12.5 6 10.5 6 10.5L8 12C8 12 6.5 13.5 7 16C7.5 18.5 10 19 10 19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="1.5" fill="white" fillOpacity="0.3" />
            <path d="M11 11L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white font-display uppercase">{l10n.auth.title}</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">{l10n.auth.subtitle}</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={signIn}
          className="w-full h-14 bg-primary dark:bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
        >
          <LogIn size={20} />
          {l10n.auth.loginGoogle}
        </motion.button>

        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
          {l10n.auth.onlyAuthorized}
        </p>
      </motion.div>
    </div>
  );
};
