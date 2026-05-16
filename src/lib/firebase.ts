import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // Зберігаємо імпорт сховища для фото

// Конфігурація вашого Firebase проекту
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Ініціалізація додатка Firebase
const app = initializeApp(firebaseConfig);

// Експорт основних сервісів
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * Функція обробки помилок Firestore, яку вимагає src/components/Layout.tsx
 */
export function handleFirestoreError(error: any): string {
  console.error("Firestore Error:", error);
  
  if (!error || !error.code) return "Сталася невідома помилка бази даних.";

  switch (error.code) {
    case 'permission-denied':
      return "У вас немає прав для доступу до цих даних або виконання цієї дії.";
    case 'unavailable':
      return "Сервер тимчасово недоступний. Перевірте підключення до інтернету.";
    case 'not-found':
      return "Запитуваний документ не знайдено.";
    default:
      return error.message || "Помилка при взаємодії з сервером.";
  }
}

export default app;
