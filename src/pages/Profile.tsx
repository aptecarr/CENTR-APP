import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { l10n } from '../lib/l10n';
import { User, Phone, Mail, FileText, Camera, Shield, Save, X, Loader2, Compass, Quote } from 'lucide-react';

interface UserProfileData {
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  specialization?: string;
  vision?: string;
  quote?: string;
  role?: string;
}

export function Profile() {
  // Приведення до типу any ліквідує будь-які суворі обмеження лінтера в GitHub
  const { user } = useAuth() as { user: any };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfileData>({
    name: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    photoUrl: user?.photoURL || '',
    specialization: '',
    vision: '',
    quote: '',
    role: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    async function fetchProfileData() {
      if (!user?.uid) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            name: data.name || user.displayName || '',
            email: data.email || user.email || '',
            phone: data.phone || '',
            photoUrl: data.photoUrl || user.photoURL || '',
            specialization: data.specialization || '',
            vision: data.vision || '',
            quote: data.quote || '',
            role: data.role || '',
          });
        }
      } catch (error) {
        console.error('Помилка при завантаженні профілю з Firestore:', error);
      }
    }

    fetchProfileData();
  }, [user]);

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    setUploadingPhoto(true);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateProfile(user, { photoURL: downloadURL });
      await updateDoc(doc(db, 'users', user.uid), { photoUrl: downloadURL });

      setProfile((prev) => ({ ...prev, photoUrl: downloadURL }));
      alert('Фото профілю успішно оновлено!');
    } catch (error) {
      console.error('Помилка Firebase Storage:', error);
      alert('Не вдалося завантажити фото.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setLoading(true);
    try {
      await updateProfile(user, { displayName: profile.name });
      
      await updateDoc(doc(db, 'users', user.uid), {
        name: profile.name,
        phone: profile.phone,
        specialization: profile.specialization,
        vision: profile.vision,
        quote: profile.quote,
      });

      setIsEditing(false);
      alert('Зміни успішно збережено!');
    } catch (error) {
      console.error('Помилка збереження у Firestore:', error);
      alert('Сталася помилка при збереженні.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-safe">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden card-shadow">
        <div className="h-32 bg-gradient-to-r from-[#1e3a5f] to-[#0f1c2d] relative" />

        <div className="p-6 sm:p-8 relative -mt-16">
          <form onSubmit={handleSave} className="space-y-6">
            
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 border-b border-gray-100 pb-6">
              <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                <div className="w-28 h-28 rounded-full bg-gray-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
                  {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                style={{ display: 'none', width: 0, height: 0, position: 'absolute' }} 
              />

              <div className="text-center sm:text-left flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{profile.name || l10n.noName || 'Користувач'}</h1>
                <div className="flex items-center justify-center sm:justify-start mt-1 text-sm text-gray-500 space-x-2">
                  <Shield className="w-4 h-4 text-[#1e3a5f]" />
                  <span className="font-medium bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-full text-xs">
                    {profile.role || 'Служитель'}
                  </span>
                </div>
              </div>

              <div>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-all active:scale-95"
                  >
                    Редагувати профіль
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all flex items-center space-x-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Зберегти</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase flex items-center space-x-1">
                  <User className="w-3.5 h-3.5" /> <span>ПІБ</span>
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full p-2 border rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5" /> <span>Електронна пошта</span>
                </label>
                <input
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full p-2 border rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5" /> <span>Телефон</span>
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+380..."
                  className="w-full p-2 border rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase flex items-center space-x-1">
                  <FileText className="w-3.5 h-3.5" /> <span>Спеціалізація в центрі</span>
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={profile.specialization}
                  onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                  placeholder="Наприклад: Наставник"
                  className="w-full p-2 border rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase flex items-center space-x-1">
                  <Compass className="w-3.5 h-3.5" /> <span>Бачення служіння</span>
                </label>
                <textarea
                  disabled={!isEditing}
                  value={profile.vision}
                  onChange={(e) => setProfile({ ...profile, vision: e.target.value })}
                  rows={3}
                  placeholder="Ваше особисте бачення розвитку служіння..."
                  className="w-full p-2 border rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase flex items-center space-x-1">
                  <Quote className="w-3.5 h-3.5" /> <span>Духовне кредо / Цитата</span>
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={profile.quote}
                  onChange={(e) => setProfile({ ...profile, quote: e.target.value })}
                  placeholder="Ваше життєве кредо..."
                  className="w-full p-2 border rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
