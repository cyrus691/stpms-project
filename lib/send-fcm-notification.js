/* global Promise */
// lib/send-fcm-notification.js
// Utility to send FCM push notifications using Firebase Admin SDK

const admin = require('firebase-admin');

console.log('[Firebase] Admin SDK loaded, version:', admin.SDK_VERSION || 'unknown');
console.log('[Firebase] Admin apps:', admin.apps.length);

let isInitialized = false;

function validateFirebaseEnvVars() {
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_CLIENT_ID',
    'FIREBASE_CLIENT_X509_CERT_URL'
  ];

  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    throw new Error(`Missing Firebase environment variables: ${missing.join(', ')}`);
  }
}

function initializeFirebase() {
  if (isInitialized || admin.apps.length > 0) {
    return;
  }

  try {
    validateFirebaseEnvVars();
    
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
    console.error('[Firebase] Environment vars:', {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? '***' : 'MISSING',
      FIREBASE_PRIVATE_KEY_ID: process.env.FIREBASE_PRIVATE_KEY_ID ? '***' : 'MISSING',
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? '***' : 'MISSING',
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? '***' : 'MISSING',
      FIREBASE_CLIENT_ID: process.env.FIREBASE_CLIENT_ID ? '***' : 'MISSING',
      FIREBASE_CLIENT_X509_CERT_URL: process.env.FIREBASE_CLIENT_X509_CERT_URL ? '***' : 'MISSING'
    });
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

  console.log(`[FCM] Sending notification to ${tokens.length} token(s): "${payload.title}"`);
  
  try {
    const messaging = admin.messaging();
    
    // Send to each token individually (more reliable than sendMulticast)
    const results = await Promise.allSettled(
      tokens.map(token => 
        messaging.send({
          token,
          notification: {
            title: payload.title || '',
            body: payload.body || '',
            imageUrl: payload.image || undefined,
          },
          data: payload.data || {},
          webpush: {
            notification: {
              icon: '/icon-192x192.png',
              badge: '/badge-72x72.png',
              image: payload.image || '/notification-banner.png',
              requireInteraction: true, // NEVER auto-dismiss
              vibrate: [300, 100, 300, 100, 300, 100, 300], // Strong vibration
              sticky: true, // Keep in notification tray (Android)
              renotify: true, // Re-alert if same tag
            },
            fcmOptions: {
              link: payload.link || '/student'
            }
          },
          ...options,
        })
      )
    );
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;
    
    console.log(`[FCM] Sent successfully. Success: ${successCount}, Failed: ${failureCount}`);
    
    if (failureCount > 0) {
      const errors = results
        .filter(r => r.status === 'rejected')
        .map(r => r.reason?.message)
        .join(', ');
      console.error('[FCM] Some sends failed:', errors);
    }
    
    return { successCount, failureCount, results };
  } catch (error) {
    console.error('[FCM] Send failed:', error.message);
    console.error('[FCM] Error stack:', error.stack);
    throw error;
  }
}

module.exports = { sendFcmNotification };
