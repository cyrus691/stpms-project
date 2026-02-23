# Cron Jobs Setup Guide for STPMS

This guide explains how to set up scheduled notifications that run even when users are logged out.

## 🎯 Your Endpoint

**URL**: `/api/send-scheduled-notifications`
- **Method**: POST
- **Security**: Requires `X-Cron-Secret` header
- **What it does**: 
  - Sends notifications for tasks due in 1 hour
  - Sends notifications for upcoming timetable classes
  - Sends student reminders
  - Works without user login

---

## ✅ RECOMMENDED: GitHub Actions (FREE)

**You already have this configured!** Just add secrets:

### Step 1: Generate CRON_SECRET
Use this generated secret:
```
kT2mP9xR4vL7nQ3sW8yZ1bC6dF5jH0gM
```

### Step 2: Add GitHub Repository Secrets
1. Go to: https://github.com/cyrus691/stpms-project/settings/secrets/actions
2. Click **New repository secret**
3. Add these two secrets:

**Secret 1:**
```
Name: APP_URL
Value: https://stpms-project.vercel.app
```

**Secret 2:**
```
Name: CRON_SECRET  
Value: kT2mP9xR4vL7nQ3sW8yZ1bC6dF5jH0gM
```

### Step 3: Add CRON_SECRET to Vercel
1. Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   ```
   Name: CRON_SECRET
   Value: kT2mP9xR4vL7nQ3sW8yZ1bC6dF5jH0gM
   ```
3. Select **Production** environment
4. Click **Save**
5. Redeploy your app (automatic deployment will trigger)

### Step 4: Test It
1. Go to: https://github.com/cyrus691/stpms-project/actions
2. Click **Send Scheduled Notifications** workflow
3. Click **Run workflow** button
4. Select **main** branch
5. Click **Run workflow**
6. Watch it run (should complete in ~10 seconds)
7. Check for ✅ green checkmark

### Step 5: Verify It's Working
- Workflow runs automatically every 10 minutes
- Check **Actions** tab to see run history
- View logs to see notifications sent
- No cost (free for public repositories)

---

## 🔶 ALTERNATIVE 1: Cron-Job.org (FREE)

If GitHub Actions doesn't work or you want a backup:

### Setup
1. **Sign up**: https://cron-job.org (free account)
2. **Create new cron job**:
   - **Title**: STPMS Notifications
   - **URL**: `https://stpms-project.vercel.app/api/send-scheduled-notifications`
   - **Schedule**: 
     - Every: **10 minutes**
     - Or use cron expression: `*/10 * * * *`
   - **Request Method**: **POST**
   - **Request Headers** (click "Add custom header"):
     ```
     X-Cron-Secret: kT2mP9xR4vL7nQ3sW8yZ1bC6dF5jH0gM
     Content-Type: application/json
     ```
3. **Save** and **Enable**

### Monitoring
- Dashboard shows execution history
- Email notifications on failures
- Execution logs available

---

## 🔷 ALTERNATIVE 2: Railway Cron Service (PAID)

If you want to deploy a dedicated cron service on Railway:

### Quick Deploy
1. **Create new Railway project**
2. **Connect GitHub repo** or upload folder: `railway-cron-example/`
3. **Add environment variables**:
   ```
   APP_URL=https://stpms-project.vercel.app
   CRON_SECRET=kT2mP9xR4vL7nQ3sW8yZ1bC6dF5jH0gM
   ```
4. **Deploy** - Railway auto-detects Node.js

### Files Provided
I've created example files in `railway-cron-example/`:
- `package.json` - Dependencies (node-cron, node-fetch)
- `index.js` - Cron service that runs every 10 minutes
- `README.md` - Detailed instructions

### Cost
- Free tier: $5/month credit (sufficient for this)
- Minimal resource usage (~50MB memory)
- Runs 24/7 independently

### Pros/Cons
**Pros:**
- ✅ Dedicated service
- ✅ Reliable uptime
- ✅ Easy monitoring

**Cons:**
- ❌ Costs money (after free tier)
- ❌ Requires separate deployment
- ❌ More complex than GitHub Actions

---

## 🔧 Testing Your Cron Endpoint Manually

You can test the endpoint directly:

### Using PowerShell (Windows)
```powershell
$headers = @{
    "X-Cron-Secret" = "kT2mP9xR4vL7nQ3sW8yZ1bC6dF5jH0gM"
    "Content-Type" = "application/json"
}

Invoke-WebRequest -Method POST `
  -Uri "https://stpms-project.vercel.app/api/send-scheduled-notifications" `
  -Headers $headers
```

### Using curl
```bash
curl -X POST https://stpms-project.vercel.app/api/send-scheduled-notifications \
  -H "X-Cron-Secret: kT2mP9xR4vL7nQ3sW8yZ1bC6dF5jH0gM" \
  -H "Content-Type: application/json"
```

### Expected Response
```json
{
  "message": "Notifications processed",
  "taskNotifications": 5,
  "timetableNotifications": 3,
  "reminderNotifications": 2
}
```

---

## 📊 Comparison Table

| Feature | GitHub Actions | Cron-Job.org | Railway Cron |
|---------|---------------|--------------|--------------|
| **Cost** | ✅ FREE | ✅ FREE | ❌ $5+/month |
| **Setup Time** | 2 minutes | 3 minutes | 10 minutes |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Monitoring** | ✅ Logs + Email | ✅ Dashboard | ✅ Railway logs |
| **Already Setup** | ✅ YES | ❌ NO | ❌ NO |

**🏆 RECOMMENDED: Use GitHub Actions** (it's free and already configured!)

---

## 🔐 Security Notes

1. **Never Share CRON_SECRET**: Keep it private like a password
2. **Rotate Regularly**: Change the secret every 3-6 months
3. **Use HTTPS Only**: Always use `https://` URLs
4. **Monitor Logs**: Check for unauthorized access attempts

---

## 🐛 Troubleshooting

### "401 Unauthorized" Response
- ❌ Wrong `X-Cron-Secret` header value
- ✅ Verify secret matches on both sides (Vercel + Cron service)
- ✅ Check for extra spaces or line breaks

### "404 Not Found" Response  
- ❌ Wrong URL
- ✅ Should be: `/api/send-scheduled-notifications` (not `/send-notifications`)
- ✅ Verify deployment is live on Vercel

### Notifications Not Sending
- Check user has FCM token registered
- Verify tasks are due within 1 hour
- Check Firebase credentials in Vercel
- View Vercel function logs for errors

### GitHub Actions Not Running
- Check if workflow is enabled (Actions tab)
- Verify secrets are added correctly
- Check workflow file syntax (`.github/workflows/cron-notifications.yml`)
- Look for error messages in failed runs

---

## 📝 Next Steps

1. ✅ Add GitHub repository secrets (2 minutes)
2. ✅ Add CRON_SECRET to Vercel (1 minute)
3. ✅ Test manual workflow run (30 seconds)
4. ✅ Wait 10 minutes and verify automatic run
5. ✅ Create test task due in 1 hour to verify notifications

---

**Need Help?**
- Check [.github/workflows/cron-notifications.yml](.github/workflows/cron-notifications.yml) for workflow config
- Check [app/api/send-scheduled-notifications/route.ts](app/api/send-scheduled-notifications/route.ts) for endpoint code
- View Vercel function logs for debugging

Last updated: February 2026
