import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

let adminApp: App | null = null;

function getAdminApp() {
  if (adminApp) return adminApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  if (getApps().length === 0) {
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    adminApp = getApps()[0]!;
  }

  return adminApp;
}

export async function sendFcmMulticast(tokens: string[], payload: NotificationPayload) {
  const app = getAdminApp();
  if (!app || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] as string[] };
  }

  const messaging = getMessaging(app);
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data,
    webpush: {
      fcmOptions: {
        link: payload.data?.link || '/patient/dashboard',
      },
    },
  });

  const invalidTokens: string[] = [];
  response.responses.forEach((item, idx) => {
    const code = item.error?.code;
    if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
      invalidTokens.push(tokens[idx]);
    }
  });

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    invalidTokens,
  };
}

export function isFcmAdminConfigured() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}
