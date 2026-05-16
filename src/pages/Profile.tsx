import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage } from '../firebase'; // Перевірте правильність шляху до вашого файлу конфігу Firebase
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface UserData {
  displayName: string;
  email: string;
  phone?: string;
  photoURL?: string;
  bio?: string;
}

export default function Profile() {
  const currentUser = auth.currentUser;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Стан для даних користувача та режиму редагування
  const [userData, setUserData] = useState<UserData>({
    displayName: currentUser?.displayName || '',
    email: currentUser?.email || '',
    phone: '',
    photoURL: currentUser?.photoURL || 'https://via.placeholder.com/150',
    bio: '',
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);

  // 1. Завантаження додаткових даних користувача з Firestore при старті
  useEffect(() => {
    async function loadUserData() {
      if (!currentUser) return;
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(prev => ({
            ...prev,
            displayName: data.displayName || currentUser.displayName || '',
            phone: data.phone || '',
            photoURL: data.photoURL || currentUser.photoURL || 'https://via.placeholder.com/150',
            bio: data.bio || '',
          }));
        }
      } catch (error) {
        console.error("Помилка завантаження профілю:", error);
      }
    }
    loadUserData();
  }, [currentUser]);

  // 2. Обробник кліку на фото (тригерить прихований input)
  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 3. Завантаження фото у Firebase Storage та оновлення профілю
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploadingPhoto(true);
    try {
      // Створюємо унікальний шлях для файлу
      const fileRef = ref(storage, `avatars/${currentUser.uid}_${Date.now()}`);
      
      // Завантажуємо файл
      await uploadBytes(fileRef, file);
      
      // Отримуємо посилання
      const downloadURL = await getDownloadURL(fileRef);

      // Оновлюємо Firebase Auth
      await updateProfile(currentUser, { photoURL: downloadURL });

      // Оновлюємо Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, { photoURL: downloadURL });

      // Оновлюємо локальний стан інтерфейсу
      setUserData(prev => ({ ...prev, photoURL: downloadURL }));
      alert("Фото успішно оновлено!");
    } catch (error) {
      console.error("Помилка при завантаженні фото:", error);
      alert("Не вдалося завантажити фото. Перевірте правила Storage.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // 4. Збереження текстових даних (Ім'я, телефон тощо)
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    try {
      // Оновлюємо відображуване ім'я в Auth
      await updateProfile(currentUser, { displayName: userData.displayName });

      // Оновлюємо всі поля в Firestore документі користувача
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        displayName: userData.displayName,
        phone: userData.phone,
        bio: userData.bio,
      });

      setIsEditing(false);
      alert("Профіль успішно збережено!");
    } catch (error) {
      console.error("Помилка збереження даних:", error);
      alert("Помилка при збереженні даних.");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return <div className="p-6 text-center text-red-500">Будь ласка, авторизуйтесь в системі.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      {/* Шапка профілю з кнопкою Налаштувань (Шестірнею) */}
      <div className="flex justify-between items-center border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Особистий кабінет</h2>
        <button 
          onClick={() => setIsEditing(!isEditing)} 
          className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${isEditing ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
          title="Налаштування профілю (Редагувати)"
        >
          {/* Іконка Шестірні (тепер активна!) */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Блок інтерактивної фотографії */}
      <div className="flex flex-col items-center mb-6 relative">
        <div 
          onClick={handlePhotoClick}
          className="relative group cursor-pointer w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 shadow-inner"
        >
          <img 
            src={userData.photoURL} 
            alt="Аватар користувача" 
            className="w-full h-full object-cover transition-opacity group-hover:opacity-75"
          />
          {/* Оверлей при наведенні (сигнал користувачу, що можна клікнути) */}
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-xs font-medium text-center px-2">
              {uploadingPhoto ? 'Завантаження...' : 'Змінити фото'}
            </span>
          </div>
        </div>
        
        {/* Прихований інпут для вибору файлу */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
        
        <p className="text-xs text-gray-400 mt-2">Клікніть на фото, щоб завантажити нове</p>
      </div>

      {/* Форма редагування / перегляду даних */}
      <form onSubmit={handleSaveChanges} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Електронна пошта (ID)</label>
          <input 
            type="email" 
            value={userData.email} 
            disabled 
            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm text-gray-500 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Ім'я користувача</label>
          <input 
            type="text" 
            value={userData.displayName} 
            disabled={!isEditing} 
            onChange={(e) => setUserData({...userData, displayName: e.target.value})}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${!isEditing ? 'bg-gray-50 text-gray-700' : 'bg-white text-black'}`}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Номер телефону</label>
          <input 
            type="text" 
            value={userData.phone} 
            disabled={!isEditing} 
            onChange={(e) => setUserData({...userData, phone: e.target.value})}
            placeholder="+380..."
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${!isEditing ? 'bg-gray-50 text-gray-700' : 'bg-white text-black'}`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Про себе / Нотатки</label>
          <textarea 
            value={userData.bio} 
            disabled={!isEditing} 
            onChange={(e) => setUserData({...userData, bio: e.target.value})}
            rows={3}
            placeholder="Додаткова інформація про користувача..."
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${!isEditing ? 'bg-gray-50 text-gray-700' : 'bg-white text-black'}`}
          />
        </div>

        {/* Кнопки збереження (з'являються лише в режимі редагування) */}
        {isEditing && (
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button 
              type="button" 
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Скасувати
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? 'Збереження...' : 'Зберегти зміни'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
