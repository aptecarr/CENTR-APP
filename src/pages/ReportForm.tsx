import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, Send, Calendar, Clock, 
  MessageSquare, Anchor, Heart, Sparkles, 
  CheckCircle2, AlertCircle 
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError } from '../lib/firebase';
import type { OperationType } from '../lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../providers/AuthProvider';
import { encryptText, decryptText } from '../lib/encryption';
import { l10n } from '../lib/l10n';

export const ReportForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [formData, setFormData] = useState({
    type: 'Розмова',
    topics: '',
    spiritualState: '',
    changes: '',
    prayerNeeds: '',
    status: 'Stable' as 'Stable' | 'Needs Attention' | 'Improved',
  });

  useEffect(() => {
    if (id) {
      getDoc(doc(db, 'patients', id)).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPatient({ 
            id: docSnap.id, 
            ...data,
            name: decryptText(data.name || '') 
          });
        }
      });
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    try {
      await addDoc(collection(db, 'patients', id, 'reports'), {
        authorId: user.uid,
        authorName: user.displayName,
        type: formData.type,
        topics: encryptText(formData.topics), // ENCRYPT
        spiritualState: encryptText(formData.spiritualState), // ENCRYPT
        changes: encryptText(formData.changes), // ENCRYPT
        prayerNeeds: encryptText(formData.prayerNeeds), // ENCRYPT
        status: formData.status,
        createdAt: serverTimestamp()
      });
      navigate(`/patients/${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `patients/${id}/reports`);
    }
  };

  return (
    <div className="bg-gray-50 flex flex-col min-h-full pb-24">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-20">
        <Link to={`/patients/${id}`} className="p-2 text-gray-400 hover:text-primary transition-smooth">
          <ChevronLeft size={24} />
        </Link>
        <h2 className="text-lg font-bold font-display text-gray-900">{l10n.reports.title}</h2>
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
          <CheckCircle2 size={20} className="text-primary" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8 max-w-2xl mx-auto w-full">
        {/* Patient Selection (Display Only here) */}
        <div className="bg-primary/5 p-4 rounded-3xl border border-primary/10 flex items-center gap-4">
          <img 
            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop" 
            className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm"
            alt="Підопічний"
          />
          <div>
            <h3 className="font-bold text-gray-900">{patient?.name || 'Завантаження...'}</h3>
            <p className="text-[10px] text-primary uppercase font-bold tracking-widest">Підопічний • Етап {patient?.stage || 1}</p>
          </div>
        </div>

        {/* Form Sections */}
        <div className="space-y-6">
          {/* Section 1: Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                <Calendar size={12} /> Дата розмови
              </label>
              <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                <Clock size={12} /> Час
              </label>
              <input type="time" defaultValue="14:00" className="w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
              <Anchor size={12} /> {l10n.reports.type}
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {[l10n.reports.types.conversation, l10n.reports.types.prayer, l10n.reports.types.lesson, l10n.reports.types.visit].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: t }))}
                  className={cn(
                    "whitespace-nowrap px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-smooth",
                    formData.type === t ? "bg-primary text-white" : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50 border"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Details */}
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                <MessageSquare size={12} /> {l10n.reports.fields.topics}
              </label>
              <textarea 
                rows={3} 
                className="w-full" 
                placeholder="..."
                value={formData.topics}
                onChange={e => setFormData(p => ({ ...p, topics: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                <Heart size={12} /> {l10n.reports.fields.spiritualState}
              </label>
              <textarea 
                rows={3} 
                className="w-full" 
                placeholder="..."
                value={formData.spiritualState}
                onChange={e => setFormData(p => ({ ...p, spiritualState: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                <Sparkles size={12} /> {l10n.reports.fields.changes}
              </label>
              <textarea 
                rows={3} 
                className="w-full" 
                placeholder="..."
                value={formData.changes}
                onChange={e => setFormData(p => ({ ...p, changes: e.target.value }))}
              />
            </div>
          </div>

          {/* Section 3: Status & Progress */}
          <div className="bg-white p-6 rounded-[32px] card-shadow space-y-6">
            <h4 className="text-sm font-bold text-gray-900 border-b border-gray-50 pb-4">Динаміка реабілітації</h4>
            
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'Improved', label: 'Покращення', icon: Sparkles, color: 'text-green-600 bg-green-50 border-green-100' },
                { id: 'Stable', label: 'Стабільно', icon: CheckCircle2, color: 'text-blue-600 bg-blue-50 border-blue-100' },
                { id: 'Needs Attention', label: 'Увага!', icon: AlertCircle, color: 'text-orange-600 bg-orange-50 border-orange-100' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, status: s.id as any }))}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-smooth",
                    formData.status === s.id ? s.color : "bg-gray-50 border-transparent text-gray-400"
                  )}
                >
                  <s.icon size={20} />
                  <span className="text-[8px] font-black uppercase tracking-widest text-center">{s.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                {l10n.reports.fields.prayerNeeds}
              </label>
              <input 
                type="text" 
                className="w-full" 
                placeholder="..."
                value={formData.prayerNeeds}
                onChange={e => setFormData(p => ({ ...p, prayerNeeds: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <motion.button 
          whileTap={{ scale: 0.98 }}
          type="submit" 
          className="w-full btn-primary h-14 rounded-[32px] shadow-xl shadow-primary/20"
        >
          Зберегти звіт <Send size={18} />
        </motion.button>
      </form>
    </div>
  );
};
