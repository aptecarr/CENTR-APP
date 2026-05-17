importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAh3RHXsiHVY-wk_-xOKUbT3lwUxVRyzSM",
  authDomain: "gen-lang-client-0583117311.firebaseapp.com",
  projectId: "gen-lang-client-0583117311",
  storageBucket: "gen-lang-client-0583117311.firebasestorage.app",
  messagingSenderId: "762694323127",
  appId: "1:762694323127:web:69426135161f06bda63632"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Нове повідомлення';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/vite.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
