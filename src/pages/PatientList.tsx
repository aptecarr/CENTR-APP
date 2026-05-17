import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Plus, ChevronRight, AlertCircle, CheckCircle2, X, User, UserPlus, Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';
import { encryptText, decryptText } from '../lib/encryption';
import { useAuth } from '../hooks/useAuth';

export type PatientStatus = '1_stage' | '2_stage' | 'adaptation' | 'archive_completed' | 'archive_escaped' | 'archive_expelled';

interface Patient {
  id: string;
  name: string;
  status: PatientStatus;
  admissionDate: string;
  photoUrl: string;
  stage: string;
  progress: number;
}

export interface PatientData {
  id: string;
  fullName: string;
  birthDate: string;
  admissionDate: string;
  location: string;
  phone: string;
  relativeName: string;
  relativePhone: string;
  relativeStatus: string;
  militaryStatus: string;
  belongings: string;
  photoUrl: string;
  status: PatientStatus;
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
        patient.status.startsWith('archive') ? "bg-gray-500" : patient.status === 'adaptation' ? "bg-blue-500" : "bg-green-500"
      )}>
        {patient.status.startsWith('archive') ? <AlertCircle size={12} className="text-white" /> : <CheckCircle2 size={12} className="text-white" />}
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
  const [filter, setFilter] = useState<'rehab' | 'adaptation' | 'archive'>('rehab');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const initialPatientData: PatientData = {
    id: '',
    fullName: '',
    birthDate: '',
    admissionDate: new Date().toISOString().split('T')[0],
    location: '',
    phone: '',
    relativeName: '',
    relativePhone: '',
    relativeStatus: '',
    militaryStatus: '',
    belongings: '',
    photoUrl: '',
    status: '1_stage',
    stage: '1 Етап',
    progress: 10
  };

  const [newPatient, setNewPatient] = useState<PatientData>(initialPatientData);

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
    let matchesFilter = false;
    if (filter === 'rehab') matchesFilter = p.status === '1_stage' || p.status === '2_stage';
    else if (filter === 'adaptation') matchesFilter = p.status === 'adaptation';
    else if (filter === 'archive') matchesFilter = p.status === 'archive_completed' || p.status === 'archive_escaped' || p.status === 'archive_expelled';
    return matchesSearch && matchesFilter;
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
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
              if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
              if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
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
      setNewPatient(prev => ({ ...prev, photoUrl: base64Data }));
    } catch (error) {
      console.error('Photo error', error);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Set to DB, encrypting names/phone where necessary
      const [year, month, day] = newPatient.admissionDate.split('-');
      const formattedAdmissionDate = `${day}.${month}.${year}`;
      
      const { id, ...patientToSave } = newPatient;
      
      await addDoc(collection(db, 'patients'), {
        ...patientToSave,
        name: encryptText(newPatient.fullName), // Use fullName as main name
        phone: encryptText(newPatient.phone),
        admissionDate: formattedAdmissionDate
      });
      setIsModalOpen(false);
      setNewPatient(initialPatientData);
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
          <button
            onClick={() => setFilter('rehab')}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-bold transition-smooth uppercase tracking-widest",
              filter === 'rehab' 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            Реабілітація
          </button>
          <button
            onClick={() => setFilter('adaptation')}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-bold transition-smooth uppercase tracking-widest",
              filter === 'adaptation' 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            Адаптація (3 етап)
          </button>
          <button
            onClick={() => setFilter('archive')}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-bold transition-smooth uppercase tracking-widest",
              filter === 'archive' 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            Архів
          </button>
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

              <form onSubmit={handleAddPatient} className="space-y-4 max-h-[80vh] overflow-y-auto px-1 scrollbar-hide pb-10">
                {/* Photo Upload Section */}
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="relative w-28 h-28 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-4 border-gray-50 dark:border-gray-900 shadow-xl">
                    {isUploadingPhoto ? (
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    ) : newPatient.photoUrl ? (
                      <img src={newPatient.photoUrl} alt="Patient" className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} className="text-gray-300 dark:text-gray-600" />
                    )}
                  </div>
                  <div className="flex gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-smooth hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <ImageIcon size={16} />
                      З ПРИСТРОЮ
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary/10 text-primary rounded-xl text-xs font-bold transition-smooth hover:bg-primary/20"
                    >
                      <Camera size={16} />
                      ЗРОБИТИ ФОТО
                    </button>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handlePhotoUpload} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">ПІБ (Прізвище, Ім'я, По батькові)</label>
                  <input 
                    required
                    type="text" 
                    value={newPatient.fullName}
                    onChange={(e) => setNewPatient({ ...newPatient, fullName: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                    placeholder="Іванов Іван Іванович..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Дата народження</label>
                    <input 
                      type="date" 
                      required
                      value={newPatient.birthDate}
                      onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 [&::-webkit-calendar-picker-indicator]:dark:invert"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Дата поступлення</label>
                    <input 
                      type="date" 
                      required
                      value={newPatient.admissionDate}
                      onChange={(e) => setNewPatient({ ...newPatient, admissionDate: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 [&::-webkit-calendar-picker-indicator]:dark:invert"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Телефон</label>
                  <input 
                    type="tel"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    placeholder="+380"
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Місце проживання</label>
                  <input 
                    type="text" 
                    value={newPatient.location}
                    onChange={(e) => setNewPatient({ ...newPatient, location: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                    placeholder="Область, місто/село, вулиця..."
                  />
                </div>

                <div className="space-y-1.5 border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Військовий статус</label>
                  <select
                    value={newPatient.militaryStatus}
                    onChange={(e) => setNewPatient({ ...newPatient, militaryStatus: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Оберіть статус...</option>
                    <option value="Військовозобов'язаний">Військовозобов'язаний</option>
                    <option value="Не військовозобов'язаний">Не військовозобов'язаний</option>
                    <option value="В СЗЧ">В СЗЧ</option>
                    <option value="На обліку">На обліку</option>
                    <option value="Знятий з обліку">Знятий з обліку</option>
                  </select>
                </div>

                <div className="space-y-1.5 pt-2">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white pb-2 px-1">Близький родич</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <input 
                      type="text" 
                      value={newPatient.relativeName}
                      onChange={(e) => setNewPatient({ ...newPatient, relativeName: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                      placeholder="Ім'я родича..."
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <select
                        value={newPatient.relativeStatus}
                        onChange={(e) => setNewPatient({ ...newPatient, relativeStatus: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Статус...</option>
                        <option value="Батько">Батько</option>
                        <option value="Мати">Мати</option>
                        <option value="Брат">Брат</option>
                        <option value="Сестра">Сестра</option>
                        <option value="Дружина">Дружина</option>
                        <option value="Син">Син</option>
                        <option value="Донька">Донька</option>
                      </select>
                      <input 
                        type="tel"
                        value={newPatient.relativePhone}
                        onChange={(e) => setNewPatient({ ...newPatient, relativePhone: e.target.value })}
                        placeholder="+380"
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Особисті речі при вступі (чемодан)</label>
                  <textarea 
                    value={newPatient.belongings}
                    onChange={(e) => setNewPatient({ ...newPatient, belongings: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                    placeholder="Наприклад: Телефон Samsung, документи, змінний одяг..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-smooth mt-6"
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
