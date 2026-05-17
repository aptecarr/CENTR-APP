import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Edit2, Phone, MessageSquare, 
  User, Droplets, MapPin, Globe, 
  Star, Quote, FilePlus, ChevronRight,
  Save, X, Edit3, Trash2, Calendar, MoreVertical,
  Loader2, Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, onSnapshot, updateDoc, deleteDoc, collection, query, orderBy, limit } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../lib/firebase';
import { decryptText, encryptText } from '../lib/encryption';
import { l10n } from '../lib/l10n';
import { useAuth } from '../hooks/useAuth';

export const PatientProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEditPatients, isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [editForm, setEditForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    // Sync patient data
    const unsubPatient = onSnapshot(doc(db, 'patients', id), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const decryptedData = {
          ...data,
          name: decryptText(data.name || ''),
          about: decryptText(data.about || ''),
          address: data.address ? decryptText(data.address) : '',
          phone: data.phone ? decryptText(data.phone) : ''
        };
        setPatient({ id: snapshot.id, ...decryptedData });
        setEditForm(decryptedData);
      }
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, `patients/${id}`));

    // Sync reports
    const qReports = query(collection(db, 'patients', id, 'reports'), orderBy('createdAt', 'desc'), limit(10));
    const unsubReports = onSnapshot(qReports, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          topics: decryptText(data.topics || ''),
          spiritualState: decryptText(data.spiritualState || ''),
          changes: decryptText(data.changes || ''),
          prayerNeeds: decryptText(data.prayerNeeds || '')
        };
      });
      setReports(reportsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, `patients/${id}/reports`));

    return () => {
      unsubPatient();
      unsubReports();
    };
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    try {
      const encryptedForm = {
        ...editForm,
        name: encryptText(editForm.name),
        about: encryptText(editForm.about),
        address: encryptText(editForm.address),
        phone: encryptText(editForm.phone)
      };
      await updateDoc(doc(db, 'patients', id), encryptedForm);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `patients/${id}`);
    }
  };

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

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
      
      if (isEditing) {
        setEditForm({ ...editForm, photoUrl: base64Data });
      } else {
        await updateDoc(doc(db, 'patients', id), { photoUrl: base64Data });
        setPatient({ ...patient, photoUrl: base64Data });
      }
    } catch (error) {
      console.error('Photo error', error);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleCancel = () => {
    setEditForm({ ...patient });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Ви впевнені, що хочете видалити цей профіль?')) return;
    try {
      await deleteDoc(doc(db, 'patients', id));
      navigate('/patients');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `patients/${id}`);
    }
  };

  const handleStatusChange = async (newStatus: string, newStage: string) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'patients', id), {
        status: newStatus,
        stage: newStage
      });
      setIsMenuOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `patients/${id}`);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-400">
      {l10n.common.loading}
    </div>
  );

  if (!patient) return (
    <div className="p-4 text-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <p className="text-gray-500 mb-4">{l10n.common.noData}</p>
      <Link to="/patients" className="btn-primary">{l10n.common.save.split(' ')[0]}</Link>
    </div>
  );

  const sections = [
    { title: l10n.patients.details.profile, type: 'personal', items: [
      { label: 'Дата народження' /* 'birthDate' */, value: patient.birthDate || 'Не вказано', icon: User, key: 'birthDate', inputType: 'date' },
      { label: l10n.patients.admissionDate, value: patient.admissionDate || 'Не вказано', icon: Calendar, key: 'admissionDate', inputType: 'text' },
      { label: 'Група крові', value: patient.bloodGroup || 'Не вказано', icon: Droplets, key: 'bloodGroup' },
    ]},
    { title: 'Духовний шлях', type: 'spiritual', items: [
      { label: 'Духовний наставник', value: patient.spiritualMentor || 'Призначте наставника', icon: Star, key: 'spiritualMentor' },
      { label: l10n.patients.stage, value: patient.stage, icon: Globe, key: 'stage' },
    ]},
    { title: l10n.patients.details.contacts, type: 'contacts', items: [
      { label: l10n.patients.labels.phone, value: patient.phone || 'Не вказано', icon: Phone, key: 'phone', inputType: 'tel' },
      { label: l10n.patients.labels.address, value: patient.address || 'Не вказано', icon: MapPin, key: 'address' },
    ]},
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-1000 min-h-full pb-24 transition-colors duration-300">
      <div className="p-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-xl shadow-gray-200/50 dark:shadow-black/20 border border-white dark:border-gray-800 transition-colors">
          <div className={cn(
            "p-6 text-white flex flex-col gap-4 relative",
            patient.status?.startsWith('archive') ? "bg-gray-600/90" : patient.status === 'adaptation' ? "bg-blue-600/90" : "bg-green-600/90"
          )}>
            <div className="flex justify-between items-start">
              <Link to="/patients" className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-smooth hover:scale-110 active:scale-95">
                <ChevronLeft size={20} />
              </Link>
              {isAdmin && (
                <div className="relative">
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-smooth hover:scale-110 active:scale-95"
                  >
                    <MoreVertical size={20} />
                  </button>
                  
                  <AnimatePresence>
                    {isMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          className="absolute right-0 top-12 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden z-50 py-2 border border-gray-100 dark:border-gray-700"
                        >
                          <button onClick={() => handleStatusChange('1_stage', '1 Етап')} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            Перевести на 1 етап
                          </button>
                          <button onClick={() => handleStatusChange('2_stage', '2 Етап')} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            Перевести на 2 етап
                          </button>
                          <button onClick={() => handleStatusChange('adaptation', 'Адаптація')} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            Перевести на Адаптацію (3 етап)
                          </button>
                          <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                          <button onClick={() => handleStatusChange('archive_completed', 'Випускник')} className="w-full text-left px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            Добровільно закінчив
                          </button>
                          <button onClick={() => handleStatusChange('archive_escaped', 'Самовільно залишив')} className="w-full text-left px-4 py-3 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            Самовільно залишив (Втік/Пішов)
                          </button>
                          <button onClick={() => handleStatusChange('archive_expelled', 'Примусово виключений')} className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            Примусово виключений (Вигнали)
                          </button>
                          <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                          <button onClick={handleDelete} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 size={16} /> Видалити профіль
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="relative">
                  <img 
                    src={isEditing && editForm.photoUrl ? editForm.photoUrl : patient.photoUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop'} 
                    alt={patient.name} 
                    className="w-24 h-24 rounded-3xl object-cover border-4 border-white/20 transition-all"
                  />
                  
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-3xl">
                      <Loader2 className="animate-spin text-white" size={24} />
                    </div>
                  )}

                  {canEditPatients && (
                    <label className="absolute -top-2 -right-2 bg-white text-primary p-2 rounded-full cursor-pointer shadow-lg hover:scale-110 active:scale-95 transition-all z-20">
                      <Edit3 size={14} />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  )}
                </div>
                <div className="absolute -bottom-2 right-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm z-10">
                  {patient.status === '1_stage' || patient.status === '2_stage' ? 'Реабілітація' : patient.status === 'adaptation' ? 'Адаптація' : 'Архів'}
                </div>
              </div>
              <div className="space-y-1 flex-1">
                {isEditing ? (
                  <input 
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="text-2xl font-bold font-display bg-white/20 border-white/30 border rounded-lg px-2 py-1 w-full text-white placeholder-white/50 focus:outline-none focus:bg-white/30 transition-colors"
                  />
                ) : (
                  <h2 className="text-2xl font-bold font-display">{patient.name}</h2>
                )}
                <div className="flex gap-2 items-center">
                  <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">
                    Підопічний • {patient.stage}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {(patient.about || isEditing) && (
              <div className="bg-yellow-50/50 dark:bg-yellow-900/10 p-4 rounded-2xl border border-yellow-100/50 dark:border-yellow-700/20 flex gap-4">
                <Quote className="text-yellow-600/40" size={32} />
                {isEditing ? (
                  <textarea
                    value={editForm.about || ''}
                    onChange={(e) => setEditForm({...editForm, about: e.target.value})}
                    placeholder="Напишіть коротку історію про пацієнта..."
                    className="w-full bg-white/50 dark:bg-gray-800/50 rounded-lg p-2 text-sm font-medium italic text-yellow-800 dark:text-yellow-200 border-none focus:ring-2 focus:ring-yellow-500/30 outline-none resize-none min-h-[60px]"
                  />
                ) : (
                  <p className="text-sm font-medium italic text-yellow-800 dark:text-yellow-200 leading-relaxed">
                    "{patient.about}"
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {canEditPatients ? (
                <Link to="report" className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 group transition-smooth hover:bg-primary/5 hover:scale-[1.02] active:scale-[0.98]">
                  <FilePlus className="text-primary dark:text-blue-400" size={24} />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 group-hover:text-primary dark:group-hover:text-white">{l10n.patients.details.addReport}</span>
                </Link>
              ) : (
                <div className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 grayscale opacity-50">
                  <FilePlus className="text-gray-400" size={24} />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{l10n.patients.details.addReport}</span>
                </div>
              )}
              <div className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <span>{l10n.patients.progress}</span>
                  <span className={cn(
                    patient.progress >= 70 ? "text-green-600" : patient.progress >= 40 ? "text-primary" : "text-orange-600"
                  )}>
                    {patient.progress}%
                  </span>
                </div>
                <div className="h-2.5 bg-white dark:bg-gray-700 rounded-full overflow-hidden border border-gray-100 dark:border-gray-600 p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${patient.progress}%` }}
                    className={cn(
                      "h-full rounded-full",
                      patient.progress >= 70 ? "bg-green-500" : 
                      patient.progress >= 40 ? "bg-primary" : 
                      "bg-orange-500"
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {sections.map((section, idx) => (
                <motion.div key={idx} layout className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] relative flex items-center gap-2 flex-1">
                      {section.title}
                      <div className="h-px bg-gray-100 dark:bg-gray-800 flex-1" />
                    </h4>
                    {section.title === 'Особисті дані' && canEditPatients && (
                      <div className="flex gap-2 ml-4">
                        <AnimatePresence mode="wait">
                          {isEditing ? (
                            <motion.div key="edit-actions" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex gap-2">
                              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSave} className="px-3 py-1.5 bg-green-500 text-white rounded-xl shadow-lg shadow-green-500/20 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                                <Save size={14} /> {l10n.common.save}
                              </motion.button>
                              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCancel} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                                <X size={14} />
                              </motion.button>
                            </motion.div>
                          ) : (
                            <motion.button key="edit-button" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsEditing(true)} className="px-3 py-1.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                              <Edit3 size={14} /> {l10n.profile.menu.schedule.split(' ')[0]} {/* Редагування */}
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {section.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-2xl border border-transparent transition-smooth">
                        <div className="p-3 bg-white dark:bg-gray-800 rounded-xl text-gray-400 shadow-sm shrink-0">
                          <item.icon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{item.label}</p>
                          <AnimatePresence mode="wait">
                            {isEditing && (item as any).key ? (
                              <motion.input 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                type={(item as any).inputType || 'text'}
                                value={(editForm as any)[(item as any).key] || ''}
                                onChange={(e) => setEditForm({ ...editForm, [(item as any).key]: e.target.value })}
                                className="text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-primary/20 focus:border-primary outline-none w-full py-1 px-2 rounded-lg mt-1 [&::-webkit-calendar-picker-indicator]:dark:invert"
                              />
                            ) : (
                              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                {item.value}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Reports History */}
            <div className="space-y-4 pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calendar size={14} /> {l10n.reports.history}
                </h4>
              </div>

              <div className="space-y-4">
                {reports.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4 text-center">{l10n.reports.noReports}</p>
                ) : (
                  reports.map((report) => (
                    <motion.div 
                      key={report.id} 
                      whileHover={{ scale: 1.01 }}
                      className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-3 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                            report.status === 'Improved' ? "bg-green-100 text-green-700" : 
                            report.status === 'Stable' ? "bg-blue-100 text-blue-700" : 
                            "bg-orange-100 text-orange-700"
                          )}>
                            {report.status}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            {report.type} • {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString() : l10n.common.now}
                          </span>
                        </div>
                        <span className="text-[8px] font-bold text-gray-300 uppercase shrink-0">
                          {report.authorName}
                        </span>
                      </div>
                      
                      {report.topics && (
                        <p className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                          <span className="text-gray-400 font-bold block mb-1 uppercase">{l10n.reports.fields.topics.split(' ')[0]}:</span>
                          {report.topics}
                        </p>
                      )}
                      
                      {report.spiritualState && (
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed italic border-l-2 border-primary/20 pl-3">
                          <span className="text-gray-400 font-bold block not-italic mb-1 uppercase tracking-tighter">{l10n.reports.fields.spiritualState.split(' ')[0]}:</span>
                          {report.spiritualState}
                        </p>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
