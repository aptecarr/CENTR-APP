import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, ChevronRight, AlertCircle, CheckCircle2, X, User, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { db, handleFirestoreError } from '../lib/firebase';
import type { OperationType } from '../lib/firebase';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';
import { encryptText, decryptText } from '../lib/encryption';
import { useAuth } from '../hooks/useAuth';

interface Patient {
  id: string;
  name: string;
  status: 'Stable' | 'Needs Attention' | 'Critical';
  admissionDate: string;
  photoUrl: string;
  stage: string;
  progress: number;
}

// Memoized Patient Card for high performance
const PatientCard = React.memo(({ patient }: { patient: Patient }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.01, y: -2 }}
    whileTap={{ scale: 0.98 }}
    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    className="bg-white dark:bg-gray-900 p-3 rounded-3xl shadow-sm border border-gray-50 dark:border-gray-800 flex items-center gap-4 group transition-colors"
  >
    <div className="relative shrink-0">
      <img 
        src={patient.photoUrl} 
        alt={patient.name} 
        className="w-16 h-16 rounded-2xl object-cover"
        loading="lazy"
      />
      <div className={cn(
        "absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white dark:border-gray-900",
        patient.status === 'Stable' ? "bg-green-500" : patient.status === 'Critical' ? "bg-red-500" : "bg-orange-500"
      )}>
        {patient.status === 'Stable' ? <CheckCircle2 size={12} className="text-white" /> : <AlertCircle size={12} className="text-white" />}
      </div>
    </div>
    
    <div className="flex-1 min-w-0">
      <h3 className="font-bold text-gray-900 dark:text-white truncate">{patient.name}</h3>
      <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Зараховано: {patient.admissionDate}</p>
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <span>Прогрес</span>
          <span className={cn(
            patient.progress >= 70 ? "text-green-600 dark:text-green-400" : patient.progress >= 40 ? "text-primary dark:text-blue-400" : "text-orange-600 dark:text-orange-400"
          )}>
            {patient.progress}%
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${patient.progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={cn(
              "h-full rounded-full transition-all",
              patient.progress >= 70 ? "bg-green-500" : 
              patient.progress >= 40 ? "bg-primary" : 
              "bg-orange-500"
            )}
          />
        </div>
      </div>
    </div>

    <Link 
      to={`/patients/${patient.id}`}
      className="p-2 text-gray-300 dark:text-gray-600 group-hover:text-primary dark:group-hover:text-white transition-smooth"
    >
      <ChevronRight size={24} />
    </Link>
  </motion.div>
));

PatientCard.displayName = 'PatientCard';

export const PatientList: React.FC = () => {
  const { canEditPatients } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Stable' | 'Needs Attention' | 'Critical'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    status: 'Stable' as const,
    admissionDate: new Date().toLocaleDateString('uk-UA'),
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    stage: 'Адаптація',
    progress: 10
  });

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'patients'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const pData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          name: decryptText(data.name || '') || 'Без імені'
        };
      }) as Patient[];
      setPatients(pData);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'patients');
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' || p.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'patients'), {
        ...newPatient,
        name: encryptText(newPatient.name), // ENCRYPT
        admissionDate: new Date().toLocaleDateString('uk-UA')
      });
      setIsModalOpen(false);
      setNewPatient({
        name: '',
        status: 'Stable',
        admissionDate: '',
        photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        stage: 'Адаптація',
        progress: 10
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'patients');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Search & Header */}
      <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white">Підопічні</h2>
          {canEditPatients && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="p-2 bg-primary text-white rounded-xl hover:scale-105 transition-smooth shadow-lg shadow-primary/20"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Пошук підопічного..." 
            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-transparent rounded-2xl text-sm text-gray-900 dark:text-white dark:placeholder-gray-500 focus:bg-white dark:focus:bg-gray-700 transition-smooth"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['All', 'Stable', 'Needs Attention', 'Critical'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-bold transition-smooth uppercase tracking-widest",
                filter === f 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {f === 'All' ? 'Усі' : f === 'Stable' ? 'Стабільні' : f === 'Needs Attention' ? 'Потребують уваги' : 'Критичні'}
            </button>
          ))}
        </div>
      </div>

      {/* Patient List */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full"
            />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Завантаження...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredPatients.map((patient) => (
              <PatientCard key={patient.id} patient={patient} />
            ))}

            {filteredPatients.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-gray-400 italic"
              >
                Нікого не знайдено за вашим запитом
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* New Patient Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-[32px] p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <UserPlus size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Новий підопічний</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddPatient} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Повне ім'я</label>
                  <input 
                    required
                    type="text" 
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                    placeholder="Іван Іванов..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Статус</label>
                    <select 
                      value={newPatient.status}
                      onChange={(e) => setNewPatient({ ...newPatient, status: e.target.value as any })}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="Stable">Стабільний</option>
                      <option value="Needs Attention">Потребує уваги</option>
                      <option value="Critical">Критичний</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Прогрес (%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100"
                      value={newPatient.progress}
                      onChange={(e) => setNewPatient({ ...newPatient, progress: parseInt(e.target.value) })}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Етап реабілітації</label>
                  <input 
                    type="text" 
                    value={newPatient.stage}
                    onChange={(e) => setNewPatient({ ...newPatient, stage: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                    placeholder="Адаптація, Соціалізація..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-smooth mt-4"
                >
                  Додати підопічного
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
