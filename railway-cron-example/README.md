# STPMS Railway Cron Service

This is a standalone cron service that can be deployed to Railway to trigger scheduled notifications.

## Setup on Railway

1. **Create new Railway project** from this folder
2. **Add environment variables**:
   ```
   APP_URL=https://stpms-project.vercel.app
   CRON_SECRET=kT2mP9xR4vL7nQ3sW8yZ1bC6dF5jH0gM
   ```
3. **Deploy** - Railway will auto-detect and deploy
4. **Monitor logs** to verify it's running every 10 minutes

## How It Works

- Uses `node-cron` to schedule tasks
- Runs every 10 minutes (`*/10 * * * *`)
- Sends POST request to your main app's `/api/send-scheduled-notifications`
- Includes `X-Cron-Secret` header for authentication
- Runs independently even when users are logged out

## Cost

Railway free tier ($5/month credit) is sufficient since this service:
- Uses minimal CPU (only runs every 10 minutes)
- Low memory footprint (~50MB)
- Minimal network traffic

## Alternative: Use GitHub Actions Instead

This Railway cron service costs money. Consider using GitHub Actions (free) instead:
- Already configured in `.github/workflows/cron-notifications.yml`
- Completely free for public repositories
- Just add `APP_URL` and `CRON_SECRET` secrets to your GitHub repo
