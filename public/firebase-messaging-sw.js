/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBJZhy7Ww-3tMj84ikE4hrKADUFsyD2QPw',
  authDomain: 'hc-2-80e59.firebaseapp.com',
  projectId: 'hc-2-80e59',
  storageBucket: 'hc-2-80e59.firebasestorage.app',
  messagingSenderId: '198806911967',
  appId: '1:198806911967:web:2ff08e4207c40b5ed9a26a',
  measurementId: 'G-3HDDKJY6P6',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'MediQueue Update';
  const body = payload.notification?.body || 'There is an update in your queue.';
  const link = payload.data?.link || '/patient/dashboard';

  self.registration.showNotification(title, {
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    data: { link },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification?.data?.link || '/patient/dashboard';
  event.waitUntil(clients.openWindow(link));
});
