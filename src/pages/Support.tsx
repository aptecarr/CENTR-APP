
import React, { useState } from 'react';
import { 
  ChevronLeft, Phone, Mail, MessageCircle, 
  Sparkles, Send, Loader2, Plus, 
  Trash2, ExternalLink, Calendar 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { currentUser } from '../lib/auth';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
}

const initialContacts: Contact[] = [
  { id: '1', name: 'Техпідтримка', role: 'Розробник', phone: '+380 00 000 00 00', email: 'support@newlife.org' },
  { id: '2', name: 'Бухгалтерія', role: 'Фінансові питання', phone: '+380 11 111 11 11' },
];

const aiSuggestions = [
  "Як покращити дисципліну в центрі?",
  "План заходів на вихідні для підопічних",
  "Як допомогти підопічному з депресією?",
  "Оптимізація графіку чергування"
];

export const Support: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [isAdding, setIsAdding] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', role: '', phone: '', email: '' });
  
  const [prompt, setPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const syncToCalendar = (contact: Contact) => {
    // Generate simple .ics file for calendar sync
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min duration
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//NewLife//Support App//UA',
      'BEGIN:VEVENT',
      `UID:${contact.id}-${Date.now()}`,
      `DTSTAMP:${formatDate(now)}`,
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:Дзвінок: ${contact.name}`,
      `DESCRIPTION:Запланована розмова з ${contact.name} (${contact.role}). Тел: ${contact.phone}`,
      `LOCATION:Телефонний дзвінок`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${contact.name.replace(/\s+/g, '_')}_meeting.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const addContact = () => {
    if (newContact.name && newContact.phone) {
      setContacts(prev => [...prev, { ...newContact, id: Date.now().toString() }]);
      setNewContact({ name: '', role: '', phone: '', email: '' });
      setIsAdding(false);
    }
  };

  const deleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const askAI = async (customPrompt?: string) => {
    const textToAsk = customPrompt || prompt;
    if (!textToAsk.trim() || isLoading) return;
    
    setIsLoading(true);
    setAiResponse('');
    
    try {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `
        Ти — досвідчений помічник адміністратора християнського реабілітаційного центру "ЦЕНТР". 
        Твоя мета: надавати професійні, етичні та духовно збалансовані поради щодо:
        1. Адміністративних питань керування центром.
        2. Планування розкладу, заходів та ресурсів.
        3. Роботи з підопічними (психологічна та духовна підтримка).
        
        Відповідай українською мовою. Використовуй форматування Markdown для чіткості.
        
        Запит користувача: ${textToAsk}
      `});
      setAiResponse(result.text || "Не вдалося отримати відповідь.");
    } catch (error) {
      console.error("AI Error:", error);
      setAiResponse("Вибачте, сталася помилка при зверненні до ШІ.");
    } finally {
      setIsLoading(false);
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
          <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">Служба підтримки</h2>
        </div>
      </div>

      <div className="p-6 space-y-8 max-w-2xl mx-auto w-full">
        
        {/* Important Contacts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 flex items-center gap-2">
              <Phone size={14} className="text-primary dark:text-blue-400" /> Важливі контакти
            </h3>
            {currentUser.role === 'Admin' && (
              <button 
                onClick={() => setIsAdding(!isAdding)}
                className="p-1.5 bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-400 rounded-xl hover:scale-110 transition-smooth"
              >
                <Plus size={18} />
              </button>
            )}
          </div>

          <AnimatePresence>
            {isAdding && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="bg-white dark:bg-gray-900 p-6 rounded-[32px] border-2 border-dashed border-primary/20 dark:border-primary/40 space-y-4"
              >
                <div className="space-y-3">
                  <input 
                    placeholder="Ім'я..." 
                    className="w-full text-xs p-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border-transparent rounded-2xl focus:ring-primary/20" 
                    value={newContact.name}
                    onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))}
                  />
                  <input 
                    placeholder="Роль/Посада..." 
                    className="w-full text-xs p-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border-transparent rounded-2xl focus:ring-primary/20" 
                    value={newContact.role}
                    onChange={e => setNewContact(p => ({ ...p, role: e.target.value }))}
                  />
                  <input 
                    placeholder="Телефон..." 
                    className="w-full text-xs p-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border-transparent rounded-2xl focus:ring-primary/20" 
                    value={newContact.phone}
                    onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))}
                  />
                  <input 
                    placeholder="Email (необов'язково)..." 
                    className="w-full text-xs p-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border-transparent rounded-2xl focus:ring-primary/20" 
                    value={newContact.email}
                    onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={addContact} className="flex-1 py-3 bg-primary text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20">Додати</button>
                  <button onClick={() => setIsAdding(false)} className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-2xl text-[10px] font-bold uppercase tracking-widest">Скасувати</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {contacts.map((c, i) => (
              <motion.div 
                key={c.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white dark:bg-gray-900 p-5 rounded-[40px] shadow-sm border border-gray-50 dark:border-gray-800 hover:border-primary/20 dark:hover:border-primary/40 transition-smooth group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[20px] bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-primary dark:text-blue-400 group-hover:scale-110 transition-smooth">
                      <Phone size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">{c.name}</h4>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{c.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => syncToCalendar(c)}
                      className="p-3 text-gray-400 hover:text-primary dark:hover:text-blue-400 hover:bg-primary/5 rounded-2xl transition-smooth"
                      title="Додати в календар"
                    >
                      <Calendar size={22} />
                    </button>
                    <a href={`tel:${c.phone}`} className="p-3 text-primary dark:text-blue-400 hover:bg-primary/5 dark:hover:bg-primary/20 rounded-2xl transition-smooth">
                      <ExternalLink size={22} />
                    </a>
                    {currentUser.role === 'Admin' && (
                      <button 
                        onClick={() => deleteContact(c.id)}
                        className="p-3 text-gray-300 dark:text-gray-700 hover:text-red-500 transition-smooth opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center text-[11px] font-bold text-gray-400 tracking-tight">
                  <span className="text-gray-600 dark:text-gray-400">{c.phone}</span>
                  {c.email && <span className="italic opacity-70">{c.email}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* AI Assistance Section */}
        {currentUser.role === 'Admin' && (
          <div className="space-y-4">
             <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 flex items-center gap-2 px-1">
              <Sparkles size={14} className="text-primary dark:text-blue-400" /> Помічник ШІ (Адмін)
            </h3>
            
            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/30 p-6 rounded-[48px] space-y-6">
              <div className="space-y-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed italic px-2">
                  Ставте питання щодо керування центром, аналізу звітів або порад щодо реабілітації.
                </p>
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.map((suggestion, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setPrompt(suggestion);
                        askAI(suggestion);
                      }}
                      className="px-4 py-2 bg-white/80 dark:bg-gray-800/80 border border-primary/10 dark:border-primary/20 rounded-full text-[10px] font-bold text-primary dark:text-blue-400 hover:bg-primary hover:text-white dark:hover:bg-blue-600 transition-smooth shadow-sm"
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              </div>
              
              <div className="relative">
                <textarea 
                  rows={4} 
                  className="w-full pr-14 focus:ring-primary/20 bg-white dark:bg-gray-900 border-transparent dark:border-gray-800 rounded-[32px] p-5 text-sm text-gray-900 dark:text-white dark:placeholder-gray-600 shadow-inner" 
                  placeholder="Ваше запитання до ШІ..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
                <button 
                  onClick={() => askAI()}
                  disabled={isLoading || !prompt.trim()}
                  className={cn(
                    "absolute bottom-5 right-5 p-3 bg-primary dark:bg-blue-600 text-white rounded-2xl shadow-xl transition-smooth",
                    (isLoading || !prompt.trim()) ? "opacity-30 cursor-not-allowed shadow-none" : "hover:scale-110 active:scale-95"
                  )}
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </div>

              <AnimatePresence>
                {aiResponse && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-6 border-t border-primary/10 dark:border-primary/30"
                  >
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-primary dark:bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                        <Sparkles size={20} />
                      </div>
                      <div className="flex-1 text-xs text-gray-700 dark:text-gray-300 leading-relaxed bg-white/50 dark:bg-gray-800/50 p-5 rounded-[32px] border border-primary/5 dark:border-primary/20 shadow-sm overflow-hidden prose prose-sm prose-primary dark:prose-invert max-w-none">
                        <Markdown>{aiResponse}</Markdown>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Message support */}
        <motion.div 
          whileHover={{ scale: 1.02, x: 5 }}
          whileTap={{ scale: 0.98 }}
          className="p-6 bg-white dark:bg-gray-900 rounded-[48px] shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-smooth"
        >
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-3xl group-hover:scale-110 transition-smooth">
              <MessageCircle size={28} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-base">Написати розробнику</h4>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-[0.15em]">Прямий чат у Telegram</p>
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-300 dark:text-gray-700 group-hover:text-primary dark:group-hover:text-blue-400 transition-smooth">
             <ExternalLink size={20} />
          </div>
        </motion.div>

      </div>
    </div>
  );
};
