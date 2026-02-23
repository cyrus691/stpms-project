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
  const notificationTitle = payload.notification.title || '🔔 STPMS Reminder';
  const notificationOptions = {
    body: payload.notification.body || '',
    icon: payload.notification.icon || '/icon-192x192.png',
    image: payload.notification.image || '/notification-banner.png',
    badge: '/badge-72x72.png',
    requireInteraction: true, // NEVER auto-dismiss - stays until user acts
    persistent: true,
    sticky: true, // Android-specific: notification stays in tray
    vibrate: [300, 100, 300, 100, 300, 100, 300], // Longer vibration
    tag: payload.data?.reminderId || payload.data?.taskId || payload.data?.timetableId || 'stpms-notification',
    renotify: true, // Re-alert even if tag is same
    silent: false,
    data: payload.data || {},
    actions: [
      {
        action: 'view',
        title: '👁️ View',
        icon: '/action-view.png'
      },
      {
        action: 'dismiss',
        title: '✖️ Dismiss',
        icon: '/action-dismiss.png'
      }
    ],
    // Maximum visibility
    dir: 'auto',
    lang: 'en',
    timestamp: Date.now()
  };
  
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  // ONLY close if user clicks "Dismiss" button - otherwise keep notification visible
  if (event.action === 'dismiss') {
    event.notification.close();
    return;
  }
  
  // For "View" button or clicking notification body - open app but KEEP notification
  if (event.action === 'view') {
    const urlToOpen = event.notification.data?.url || '/student';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(function(clientList) {
          // Check if there's already a window open
          for (let i = 0; i < clientList.length; i++) {
            let client = clientList[i];
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus().then(client => client.navigate(urlToOpen));
            }
          }
          // If no window is open, open a new one
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  } else {
    // Default click (not on an action button) - open the app, keep notification
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(function(clientList) {
          for (let i = 0; i < clientList.length; i++) {
            let client = clientList[i];
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow('/student');
          }
        })
    );
  }
});
