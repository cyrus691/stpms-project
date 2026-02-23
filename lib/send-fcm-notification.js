// lib/send-fcm-notification.js
// Utility to send FCM push notifications using Firebase Admin SDK

const admin = require('firebase-admin');

let isInitialized = false;

function initializeFirebase() {
  if (isInitialized || admin.apps.length > 0) {
    return;
  }

  try {
    const credential = admin.credential.cert({
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    });
    
    admin.initializeApp({
      credential: credential,
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    console.log('[Firebase] Admin SDK initialized successfully');
    isInitialized = true;
  } catch (error) {
    console.error('[Firebase] Initialization failed:', error.message);
    console.error('[Firebase] Check that all FIREBASE_* environment variables are set');
    throw error;
  }
}

/**
 * Send FCM notification to a list of tokens
 * @param {string[]} tokens - Array of FCM tokens
 * @param {object} payload - Notification payload (title, body, data)
 * @param {object} [options] - Optional FCM message options
 * @returns {Promise<object>} - FCM response
 */
async function sendFcmNotification(tokens, payload, options = {}) {
  // Initialize Firebase on first use
  initializeFirebase();

  if (!Array.isArray(tokens) || tokens.length === 0) {
    throw new Error('No FCM tokens provided');
  }
  if (tokens.length === 0) {
    console.log('[FCM] No tokens to send to');
    return { successCount: 0, failureCount: 0 };
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
  
  console.log(`[FCM] Sending notification to ${tokens.length} token(s): "${message.notification.title}"`);
  
  try {
    // Send multicast message
    const response = await admin.messaging().sendMulticast(message);
    console.log(`[FCM] Sent successfully. Success: ${response.successCount}, Failed: ${response.failureCount}`);
    return response;
  } catch (error) {
    console.error('[FCM] Send failed:', error.message);
    throw error;
  }
}

module.exports = { sendFcmNotification };
