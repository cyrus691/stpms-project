// lib/send-fcm-notification.js
// Utility to send FCM push notifications using Firebase Admin SDK

const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // Optionally, add projectId or other config if needed
  });
}

/**
 * Send FCM notification to a list of tokens
 * @param {string[]} tokens - Array of FCM tokens
 * @param {object} payload - Notification payload (title, body, data)
 * @param {object} [options] - Optional FCM message options
 * @returns {Promise<object>} - FCM response
 */
async function sendFcmNotification(tokens, payload, options = {}) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    throw new Error('No FCM tokens provided');
  }
  // Compose message
  const message = {
    tokens,
    notification: {
      title: payload.title || '',
      body: payload.body || '',
    },
    data: payload.data || {},
    ...options,
  };
  // Send multicast message
  return admin.messaging().sendMulticast(message);
}

module.exports = { sendFcmNotification };
