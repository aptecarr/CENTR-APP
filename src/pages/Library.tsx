import React, { useState, useEffect } from 'react';
import { Search, Play, Book, FileText, Video as VideoIcon, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { l10n } from '../lib/l10n';

import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Plus } from 'lucide-react';

interface LibraryItem {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  type: 'video' | 'text' | 'document';
  createdAt?: any;
}

export const Library: React.FC = () => {
  const { canEditLibrary } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const activeCategory = searchParams.get('category') || 'all';

  const setActiveCategory = (id: string) => {
    if (id === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', id);
    }
    setSearchParams(searchParams);
  };

  const categories = [
    { id: 'all', label: l10n.sermons.categories.all },
    { id: 'spirituality', label: l10n.sermons.categories.spirituality },
    { id: 'psychology', label: l10n.sermons.categories.psychology },
    { id: 'addiction', label: l10n.sermons.categories.addiction },
    { id: 'video', label: l10n.sermons.categories.video },
  ];

  useEffect(() => {
    const q = query(collection(db, 'library'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LibraryItem[];
      setItems(data);
      setLoading(false);

      // Seed data if empty
      if (snapshot.empty) {
        const seedData = [
          { title: 'Основи Духовності', description: 'Курс про базові принципи віри та молитви.', category: 'spirituality', type: 'text', url: '#', createdAt: serverTimestamp() },
          { title: 'Психологія залежності', description: 'Розуміння механізмів виникнення та подолання залежності.', category: 'psychology', type: 'document', url: '#', createdAt: serverTimestamp() },
          { title: 'Крок до волі', description: 'Відео-свідчення про звільнення від наркозалежності.', category: 'addiction', type: 'video', url: '#', createdAt: serverTimestamp() },
          { title: 'Вечірнє служіння: Надія', description: 'Проповідь пастора про надію в складні часи.', category: 'video', type: 'video', url: '#', createdAt: serverTimestamp() },
        ];
        seedData.forEach(async (item) => {
          await addDoc(collection(db, 'library'), item);
        });
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'library'));

    return () => unsubscribe();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                          item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 space-y-6 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{l10n.sermons.title}</h2>
            <p className="text-[10px] text-primary dark:text-blue-400 font-black uppercase tracking-[0.2em]">Матеріали та Ресурси</p>
          </div>
          {canEditLibrary && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <Plus size={20} />
              <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest">Додати</span>
            </motion.button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={l10n.common.search}
            className="w-full pl-12 pr-4 py-4 bg-gray-100 dark:bg-gray-800/50 border-transparent rounded-[24px] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-gray-800 ring-2 ring-transparent focus:ring-primary/20 transition-all font-medium"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "whitespace-nowrap px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all border-2",
                activeCategory === cat.id 
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                  : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500 hover:border-primary/30"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-40 bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
            <Book size={48} className="opacity-20" />
            <p className="font-bold uppercase tracking-widest text-xs">{l10n.common.noData}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                className="bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "p-3 rounded-2xl",
                    item.type === 'video' ? "bg-red-50 dark:bg-red-900/20 text-red-500" :
                    item.type === 'text' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-500" :
                    "bg-green-50 dark:bg-green-900/20 text-green-500"
                  )}>
                    {item.type === 'video' ? <VideoIcon size={20} /> : 
                     item.type === 'document' ? <FileText size={20} /> : <Book size={20} />}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full">
                    {categories.find(c => c.id === item.category)?.label}
                  </span>
                </div>

                <div className="space-y-2 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{item.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{item.description}</p>
                </div>

                <button 
                  onClick={() => window.open(item.url, '_blank')}
                  className="w-full py-4 bg-gray-50 dark:bg-gray-800 group-hover:bg-primary group-hover:text-white rounded-[20px] text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  {l10n.sermons.actions.open}
                  <ExternalLink size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
