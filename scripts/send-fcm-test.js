// send-fcm-test.js
// Usage: node send-fcm-test.js <FCM_TOKEN>

const fetch = require('node-fetch');

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || 'YOUR_SERVER_KEY_HERE'; // Replace with your Firebase server key
const FCM_TOKEN = process.argv[2];

if (!FCM_TOKEN) {
  console.error('Usage: node send-fcm-test.js <FCM_TOKEN>');
  process.exit(1);
}

const payload = {
  to: FCM_TOKEN,
  notification: {
    title: '🔔 STPMS Test Notification',
    body: 'This is a test notification from your local backend.',
    icon: '/icon.png',
    image: '/banner.png',
    badge: '/badge.png',
    requireInteraction: true
  }
};

fetch('https://fcm.googleapis.com/fcm/send', {
  method: 'POST',
  headers: {
    'Authorization': `key=${FCM_SERVER_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
  .then(res => res.json())
  .then(data => {
    console.log('FCM response:', data);
  })
  .catch(err => {
    console.error('Error sending FCM:', err);
  });
