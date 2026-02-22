# Railway-Specific Configuration

This document contains Railway-specific settings and recommendations for deploying STPMS.

## Railway Service Configuration

### Build Settings

- **Builder**: Nixpacks (auto-detected)
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Root Directory**: `/`
- **Node Version**: 20.x (detected from package.json engines)

### Environment Variables Template

Copy these to Railway's Variables tab:

```env
# Database
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/stpms?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# Cron Security
CRON_SECRET=<generate-with-openssl-rand-base64-32>

# Node Environment
NODE_ENV=production
```

### Using Railway Variables

Railway provides automatic variables you can reference:

- `${{RAILWAY_PUBLIC_DOMAIN}}` - Auto-generated domain
- `${{RAILWAY_ENVIRONMENT}}` - Current environment (production/staging)
- `${{RAILWAY_PROJECT_ID}}` - Your project ID

Example using in NEXTAUTH_URL:
```
NEXTAUTH_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
```

## Health Check Configuration

Railway can monitor your application health:

### Add Health Check Endpoint

Already implemented at: `/api/system-health`

Railway will automatically detect this and use it for health checks.

### Configure in Railway (Optional)

1. Go to Settings → Health Check
2. Set path: `/api/system-health`
3. Expected status code: 200
4. Timeout: 30 seconds

## Resource Allocation

### Recommended Settings

For typical usage (< 1000 users):
- **Memory**: 512 MB - 1 GB
- **CPU**: Shared (default)
- **Replicas**: 1 (scale up as needed)

For higher traffic:
- **Memory**: 2 GB
- **CPU**: 2 shared cores
- **Replicas**: 2-3 with load balancing

## Networking

### Custom Domain Setup

1. Go to Settings → Networking
2. Click "Add Domain"
3. Enter your domain (e.g., `stpms.yourdomain.com`)
4. Add DNS records:
   - Type: CNAME
   - Name: stpms (or @)
   - Value: `<your-railway-domain>`
   - TTL: Auto

5. Update environment variable:
   ```
   NEXTAUTH_URL=https://stpms.yourdomain.com
   ```

### HTTPS

- Automatically enabled on Railway domains
- Auto-renewed SSL certificates
- Forces HTTPS by default

## Database Configuration

### MongoDB Atlas with Railway

Recommended connection string format:
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/stpms?retryWrites=true&w=majority&appName=stpms
```

**Important**: URL encode special characters in password!

Example:
- Password: `p@ss!word#123`
- Encoded: `p%40ss%21word%23123`

### Railway MongoDB Plugin

Alternatively, use Railway's MongoDB:

1. Click "New" → "Database" → "Add MongoDB"
2. Railway generates `MONGO_URL` variable
3. Reference it: `DATABASE_URL=${{MONGO_URL}}`

## Logging

### View Logs

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# View logs (real-time)
railway logs

# View specific service
railway logs --service web
```

### Log Best Practices

- Use `console.log()` for info
- Use `console.error()` for errors
- Railway captures all stdout/stderr
- Logs retained for 7 days on Hobby plan

## Build Cache

Railway caches builds to speed up deployments:

- Node modules are cached
- Next.js `.next` folder is cached
- To clear cache: Redeploy with "Clear cache" option

## Deployment Triggers

### Automatic Deployments

By default, Railway deploys on every push to main branch.

### Configure Triggers

1. Go to Settings → Deployment
2. Choose:
   - **Branch**: main (or your production branch)
   - **Auto Deploy**: Enable/Disable
   - **Root Directory**: (leave blank)

### Manual Deployments

1. Click "Deploy" → "Manual Deploy"
2. Select commit/branch
3. Monitor in Deployments tab

## Environment Isolation

### Multiple Environments

Create separate Railway environments:

1. **Production**: Main branch
   - Domain: `https://your-app.railway.app`
   - Database: Production MongoDB

2. **Staging**: develop branch
   - Domain: `https://staging-your-app.railway.app`
   - Database: Staging MongoDB

Setup:
1. Click environment dropdown → "New Environment"
2. Name: "Staging"
3. Set different variables for each environment

## Performance Optimization

### Enable Edge Caching

Add to `next.config.mjs`:

```javascript
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
};
```

### Optimize Images

```javascript
const nextConfig = {
  images: {
    domains: [
      'your-domain.railway.app',
      'firebasestorage.googleapis.com'
    ],
    formats: ['image/avif', 'image/webp'],
  },
};
```

## Monitoring

### Built-in Metrics

Railway provides:
- CPU usage
- Memory usage
- Network traffic
- Request count
- Response times

Access: Dashboard → Metrics tab

### External Monitoring

Recommended services:
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Better Uptime** - Uptime monitoring

## Backup Strategy

### Database Backups

**MongoDB Atlas** (Recommended):
- Automatic daily backups (free tier)
- Point-in-time recovery (paid)
- Configure in Atlas dashboard

**Railway MongoDB**:
- Manual backups only
- Use `mongodump` via Railway CLI:
  ```bash
  railway run mongodump --uri=$DATABASE_URL --out=./backup
  ```

### Code Backups

- GitHub automatically backs up code
- Tag releases for easy rollback:
  ```bash
  git tag -a v1.0.0 -m "Production release"
  git push origin v1.0.0
  ```

## Security Best Practices

### Environment Variables

- ✅ Never commit secrets to Git
- ✅ Use Railway's encrypted variables
- ✅ Rotate secrets regularly
- ✅ Use different secrets per environment

### Network Security

- ✅ Enable CORS for specific domains only
- ✅ Use CRON_SECRET for scheduled jobs
- ✅ Implement rate limiting
- ✅ Validate all user inputs

### Database Security

- ✅ Use strong MongoDB passwords
- ✅ Enable IP whitelisting
- ✅ Use connection pooling
- ✅ Regular security updates

## Cost Management

### Free Tier Limits

Railway free tier includes:
- $5 credit per month
- Unlimited projects
- 500 GB bandwidth
- 8 GB memory

### Monitor Usage

1. Go to Account → Usage
2. Set up usage alerts
3. Monitor costs daily

### Cost Optimization Tips

1. **Use external cron services** (GitHub Actions) instead of Railway cron service
2. **Optimize builds** to reduce build minutes
3. **Use MongoDB Atlas free tier** instead of Railway MongoDB
4. **Scale down during low traffic** periods
5. **Enable auto-sleep** for development environments

## Troubleshooting

### Build Failures

```bash
# View build logs
railway logs --deployment <deployment-id>

# Debug locally
railway run npm run build
```

### Connection Issues

```bash
# Test database connection
railway run node -e "require('./lib/prisma').getConnection().then(() => console.log('Connected')).catch(console.error)"
```

### Variable Issues

```bash
# List all variables
railway variables

# Set variable
railway variables set KEY=value

# Delete variable
railway variables delete KEY
```

## Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Railway Status**: https://status.railway.app
- **Community Forum**: https://help.railway.app

## Quick Commands Reference

```bash
# Install CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to existing project
railway link

# Deploy
railway up

# View logs
railway logs

# Set variable
railway variables set KEY=value

# Run command in Railway environment
railway run <command>

# Open dashboard
railway open

# Check status
railway status
```

---

Last updated: February 2026
