# STPS Next.js Migration with Mongoose

Next.js 14 (App Router, TypeScript) scaffold with Mongoose (MongoDB), NextAuth, Tailwind, and ESLint + Prettier.

## Getting started

1. Install deps: `npm install`
2. Copy env: `cp .env.example .env` (on Windows `copy .env.example .env`) and fill `DATABASE_URL` (MongoDB) and `NEXTAUTH_SECRET`.
3. Start dev server: `npm run dev`

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

## Next steps
- Replace placeholder API logic with real rules and access control.
- Connect NextAuth session to dashboards and add middleware/route protection.
- Implement file upload storage (S3/local) in `app/api/uploads`.
- Port UI from PHP dashboards into React components under `app/admin`, `app/student`, and `app/business`.
