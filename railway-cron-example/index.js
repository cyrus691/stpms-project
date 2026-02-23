const cron = require('node-cron');
const fetch = require('node-fetch');

const APP_URL = process.env.APP_URL || 'https://stpms-project.vercel.app';
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET environment variable is required');
  process.exit(1);
}

console.log('🚀 STPMS Cron Service Started');
console.log(`📡 Target URL: ${APP_URL}/api/send-scheduled-notifications`);

// Run every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  console.log('⏰ Running scheduled notification check...');
  
  try {
    const response = await fetch(`${APP_URL}/api/send-scheduled-notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Secret': CRON_SECRET
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Notifications sent successfully:', data);
    } else {
      console.error('❌ Failed to send notifications:', response.status, data);
    }
  } catch (error) {
    console.error('❌ Error calling notification endpoint:', error.message);
  }
});

// Keep the service alive
console.log('✨ Cron job scheduled (runs every 10 minutes)');
console.log('Press Ctrl+C to stop');
