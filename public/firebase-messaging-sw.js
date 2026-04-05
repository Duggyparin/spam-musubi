importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Your Firebase config (copy from src/firebase/firebase.js)
firebase.initializeApp({
  apiKey: "AIzaSyCPLyRka9qib7YdeyrEz5R6FguPOe6i7cA",
  authDomain: "spam-musubi-a1eab.firebaseapp.com",
  projectId: "spam-musubi-a1eab",
  storageBucket: "spam-musubi-a1eab.firebasestorage.app",
  messagingSenderId: "74371417008",
  appId: "1:74371417008:web:338ddfe4618a4a6cdacc75"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message: ', payload);
  const notificationTitle = payload.notification?.title || 'Spam Musubi';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: '/musubi.png',
    badge: '/musubi.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});