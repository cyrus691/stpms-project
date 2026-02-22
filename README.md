# Student Project Management System (STPMS)

Next.js 14 (App Router, TypeScript) student management platform with Mongoose (MongoDB), NextAuth, Firebase Cloud Messaging, Tailwind CSS, and real-time notifications.

## Features

- 🔐 **Multi-role Authentication** - Admin, Student, and Business user types
- 📚 **Student Dashboard** - Tasks, reminders, timetable management
- 🔔 **Push Notifications** - Firebase Cloud Messaging for scheduled reminders
- 📊 **Admin Panel** - User management, announcements, system health monitoring
- 💼 **Business Features** - Sales tracking, inventory, expense management
- 🌐 **Internationalization** - Multi-language support (English, Luganda)

## Getting Started

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Windows
   copy .env.example .env
   
   # macOS/Linux
   cp .env.example .env
   ```
   
   Edit `.env` and fill in:
   - `DATABASE_URL` - MongoDB connection string
   - `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` - `http://localhost:3000` for local dev
   - Firebase credentials (from Firebase Console)

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Open http://localhost:3000
   - Create admin user: `npm run seed:admin`

## Deployment

### Deploy to Railway

See detailed deployment guide: [DEPLOYMENT.md](DEPLOYMENT.md)

Quick steps:
1. Push code to GitHub
2. Create Railway project from GitHub repo
3. Set environment variables in Railway
4. Deploy automatically
5. Set up cron jobs for notifications

### Cron Job Setup

For scheduled notifications, see: [CRON_SETUP.md](CRON_SETUP.md)

Recommended: Use [cron-job.org](https://cron-job.org) (free) or GitHub Actions

### Deployment Checklist

Use [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) to ensure all steps are completed.

## Tech stack
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Mongoose + MongoDB
- NextAuth (credentials provider placeholder)
- ESLint + Prettier + Tailwind plugin

## Project structure
- `app/` React routes and API route handlers
- `app/api/auth/[...nextauth]/` NextAuth credentials provider
- `lib/models/` Mongoose schemas (User, Announcement, Task, Reminder, TimetableEntry, Expense, Setting, Upload)
- `lib/prisma.ts` MongoDB connection handler (legacy name, uses Mongoose internally)
- `lib/auth.ts` Authentication helpers

## Mapping from PHP features
- Sessions/auth → NextAuth credentials provider in `app/api/auth`
- User/admin actions → `app/api/users`, `app/api/announcements`, `app/api/settings`
- Student features → `app/api/timetable`, `app/api/tasks`, `app/api/reminders`, `app/api/uploads`
- Business features → `app/api/expenses`

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run seed:admin   # Create admin user
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Student Features
- `GET/POST /api/student-tasks` - Manage tasks
- `GET/POST /api/student-reminders` - Manage reminders
- `GET/POST /api/student-timetable` - Manage timetable
- `GET/POST /api/student-groups` - Study groups

### Admin Features
- `GET/POST /api/users` - User management
- `GET/POST /api/announcements` - Announcements
- `GET /api/audit-logs` - Audit trail
- `GET /api/system-health` - System health check

### Business Features
- `GET/POST /api/business-sales` - Sales tracking
- `GET/POST /api/inventory` - Inventory management
- `GET/POST /api/expenses` - Expense tracking

### Scheduled Jobs
- `POST /api/send-scheduled-notifications` - Trigger notifications (cron)

## Environment Variables

See [.env.example](.env.example) for all required variables:

- `DATABASE_URL` - MongoDB connection string
- `NEXTAUTH_SECRET` - NextAuth encryption secret
- `NEXTAUTH_URL` - Application URL
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_PRIVATE_KEY` - Firebase admin private key
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- `CRON_SECRET` - Secret for securing cron endpoints

## Troubleshooting

### Database Connection Issues
- Verify MongoDB connection string
- Check network access in MongoDB Atlas
- Ensure IP whitelist includes your IP

### Authentication Not Working
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Clear browser cookies and try again

### Notifications Not Sending
- Verify Firebase credentials
- Check FCM tokens are being saved
- Review Railway/server logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
