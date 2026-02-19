// firebase-messaging-sw.js
// Service worker for Firebase Cloud Messaging

importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDWjcgV1E_dkv43xz-u0sWVXECS3ePkUTc",
  authDomain: "stpms-eda51.firebaseapp.com",
  projectId: "stpms-eda51",
  storageBucket: "stpms-eda51.appspot.com",
  messagingSenderId: "1010271336283",
  appId: "1:1010271336283:web:31b4534c931ad403488c7e"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  self.registration.showNotification(
    '🔔 STPMS Reminder',
    {
      body: '✨ ' + payload.notification.title + '\n' + payload.notification.body,
      icon: payload.notification.icon || '/icon.png', 
      image: payload.notification.image || '/banner.png', 
      badge: '/badge.png', 
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200], 
      actions: [
        {
          action: 'dismiss',
          title: 'Dismiss',
        }
      ]
    }
  );
});

self.addEventListener('notificationclick', function(event) {
  if (event.action === 'dismiss') {
    event.notification.close();
  } else {
    // Optionally focus/open the app
    event.notification.close();
  }
});
