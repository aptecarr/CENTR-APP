import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, Bell, Music, Smartphone, 
  Check, Play, Pause, Save, Volume2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

interface Melody {
  id: string;
  name: string;
  description: string;
}

const MELODIES: Melody[] = [
  { id: 'default', name: 'Стандартна', description: 'Класичний звук сповіщення' },
  { id: 'calm', name: 'Спокій', description: 'М\'який та делікатний тон' },
  { id: 'bright', name: 'Яскравість', description: 'Підбадьорливий та енергійний звук' },
  { id: 'spiritual', name: 'Дзвін', description: 'Чистий звук церковного дзвону' },
  { id: 'nature', name: 'Птахи', description: 'Мелодійний спів ранкових птахів' },
];

export const NotificationSettings: React.FC = () => {
  const [vibrationEnabled, setVibrationEnabled] = useState(() => {
    return localStorage.getItem('vibration_enabled') !== 'false';
  });
  const [selectedMelody, setSelectedMelody] = useState(() => {
    return localStorage.getItem('notification_melody') || 'default';
  });
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  const toggleVibration = () => {
    setVibrationEnabled(!vibrationEnabled);
  };

  const saveSettings = () => {
    localStorage.setItem('vibration_enabled', vibrationEnabled.toString());
    localStorage.setItem('notification_melody', selectedMelody);
    
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);

    // If vibration is supported, give a small feedback
    if (vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate(200);
    }
  };

  const handlePlayPreview = (id: string) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
      // In a real app, we would play the audio here
      setTimeout(() => setPlayingId(null), 1500);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 transition-colors duration-300 overflow-y-auto pb-24">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 z-20 transition-colors">
        <div className="flex items-center gap-4">
          <Link to="/profile" className="p-2 text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-white transition-smooth">
            <ChevronLeft size={24} />
          </Link>
          <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">Налаштування</h2>
        </div>
      </div>

      <div className="p-6 space-y-8 max-w-2xl mx-auto w-full">
        {/* Section Title */}
        <div className="space-y-1 px-2">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 flex items-center gap-2">
            <Bell size={14} className="text-primary dark:text-blue-400" /> Сповіщення
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Налаштуйте як ви отримуєте повідомлення</p>
        </div>

        {/* Vibration Toggle */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-[32px] shadow-sm border border-gray-50 dark:border-gray-800 flex items-center justify-between group transition-smooth">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-smooth",
              vibrationEnabled ? "bg-orange-50 dark:bg-orange-900/20 text-orange-500" : "bg-gray-50 dark:bg-gray-800 text-gray-400"
            )}>
              <Smartphone size={24} className={vibrationEnabled ? "animate-bounce" : ""} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white">Вібровідгук</h4>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Тактильні сповіщення</p>
            </div>
          </div>
          <button 
            onClick={toggleVibration}
            className={cn(
              "w-14 h-8 rounded-full relative transition-all duration-300",
              vibrationEnabled ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
            )}
          >
            <motion.div 
              animate={{ x: vibrationEnabled ? 28 : 4 }}
              className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm"
            />
          </button>
        </div>

        {/* Melody Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Вибір мелодії</h4>
            <Music size={14} className="text-gray-400" />
          </div>

          <div className="space-y-3">
            {MELODIES.map((melody) => (
              <motion.div
                key={melody.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedMelody(melody.id)}
                className={cn(
                  "p-5 rounded-[32px] border transition-smooth cursor-pointer flex items-center justify-between",
                  selectedMelody === melody.id ? 
                    "bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/40 ring-1 ring-primary/10" : 
                    "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-smooth",
                    selectedMelody === melody.id ? "bg-primary text-white" : "bg-gray-50 dark:bg-gray-800 text-gray-400"
                  )}>
                    {selectedMelody === melody.id ? <Volume2 size={20} /> : <Music size={20} />}
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-gray-900 dark:text-white">{melody.name}</h5>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tight">{melody.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPreview(melody.id);
                    }}
                    className="p-2 text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-smooth"
                  >
                    {playingId === melody.id ? <Pause size={20} fill="currentColor" /> : <Play size={20} />}
                  </button>
                  {selectedMelody === melody.id && (
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white scale-75">
                      <Check size={16} strokeWidth={3} />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveSettings}
            className="w-full h-16 bg-primary dark:bg-blue-600 text-white font-bold text-xs uppercase tracking-[0.3em] rounded-[32px] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-smooth"
          >
            <Save size={20} /> Зберегти налаштування
          </motion.button>
        </div>
      </div>

      {/* Floating Save Confirmation */}
      <AnimatePresence>
        {showSaved && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-24 left-6 right-6 z-50 pointer-events-none flex justify-center"
          >
            <div className="bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
              <Check size={20} />
              <span className="font-bold text-sm uppercase tracking-widest">Зміни успішно збережено</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
