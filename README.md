This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Theme Toggle

A global theme toggle is available in the **top-right corner on all pages**.

- `Dark` mode = existing dark UI
- `Light` mode = light blue palette
- Preference is saved in local storage (`opd_theme`)

## FCM Notifications Setup

Patient push notifications are enabled for:

- Queue cancellation / absent (missed) updates
- Reminder when estimated wait reaches **15-20 minutes**

Add these environment variables to `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_web_push_vapid_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_service_account_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Notes:

- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is required on client side to get browser FCM token.
- Admin credentials (`FIREBASE_*`) are required server-side to send push notifications.
- Service worker file used: `public/firebase-messaging-sw.js`

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## AI Tools Used

This project was developed with support from **AntiGravity**, **Codex**, and **ChatGPT**.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
