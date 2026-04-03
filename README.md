# MediQueue - Smart OPD Queue Management

MediQueue is a role-based OPD queue platform for hospitals and clinics. It provides live token flow for reception, doctors, patients, and a public display board with real-time updates.

Live Preview : https://tech-titans-hc-01-sage-bgx5.vercel.app


## What this project does

- Manages OPD tokens across three roles: `reception`, `doctor`, and `patient`
- Shows live queue and "now serving" updates using Socket.IO
- Supports family-member bookings under a patient account
- Lets doctors complete consultations with structured prescriptions
- Includes an admin panel for staff management and analytics
- Supports optional Firebase Cloud Messaging (FCM) push notifications
- Includes a support chatbot that creates complaint tickets

## Core features

- Role-based authentication and protected dashboards
- Reception workflow:
- create/edit tokens
- assign doctor
- mark priority patients
- toggle doctor availability
- Doctor workflow:
- call next patient
- skip absent patient
- view patient/family consultation history
- write diagnosis + prescription and complete consultation
- Patient workflow:
- join/leave queue (self or family)
- view live wait estimate and queue snapshot
- track consultations and prescriptions
- Public display board at `/display` (optionally filtered by doctor)
- Admin workspace at `/admin` for:
- one-time admin password setup
- staff create/edit/delete
- live operational analytics

## Tech stack

- Next.js `16.2.1` (App Router)
- React `19.2.4`
- TypeScript
- MongoDB + Mongoose
- Socket.IO
- Tailwind CSS v4 (plus custom CSS)
- Firebase (web + admin SDK for notifications)

## Project structure

- `app/` - routes, pages, and API endpoints
- `components/` - UI, layout, and providers
- `models/` - Mongoose models (`User`, `Token`, `Consultation`, etc.)
- `lib/` - auth, DB connection, queue logic, notifications, Firebase setup
- `server.ts` - custom Next.js + Socket.IO server entry
- `scripts/reset-and-seed.ts` - database reset + demo user seed script
- `public/firebase-messaging-sw.js` - service worker for push notifications

## Prerequisites

- Node.js 20+
- npm
- MongoDB instance (local or Atlas)

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with required values:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-strong-secret
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000

# Optional (enable Firebase push notifications)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

3. Start the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`

## Scripts

- `npm run dev` - start custom dev server (`tsx server.ts`)
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint project

Database seed utility:

```bash
npx tsx scripts/reset-and-seed.ts
```

This resets core collections and creates demo users.

## Demo credentials

After seeding via `scripts/reset-and-seed.ts`:

- Reception: `reception@hospital.com` / `password123`
- Doctor: `doctor1@hospital.com` / `password123`
- Doctor: `doctor2@hospital.com` / `password123`
- Patient (phone login): `9000000001` / `password123`
- Patient (phone login): `9000000002` / `password123`
- Patient (phone login): `9000000003` / `password123`

## Important routes

- `/login` - role-based sign-in
- `/register` - patient self-registration
- `/reception/dashboard`
- `/doctor/dashboard`
- `/patient/dashboard`
- `/display` - queue display board
- `/admin` - admin setup/login/dashboard

## Notifications and real-time behavior

- Socket.IO path: `/api/socket`
- Queue events (`token_created`, `token_updated`, `queue_updated`) sync all dashboards
- Optional FCM notifications can alert users about queue movement and status changes

## Notes for contributors

- This project uses a custom server (`server.ts`) instead of plain `next dev`.
- Keep secrets out of version control. Use `.env.local` for local development only.
- Seed endpoints/scripts are for local/dev usage; avoid exposing them in production.
