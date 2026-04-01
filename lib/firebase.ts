// Firebase client-side SDK — only used in browser components
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: "AIzaSyBJZhy7Ww-3tMj84ikE4hrKADUFsyD2QPw",
  authDomain: "hc-2-80e59.firebaseapp.com",
  projectId: "hc-2-80e59",
  storageBucket: "hc-2-80e59.firebasestorage.app",
  messagingSenderId: "198806911967",
  appId: "1:198806911967:web:2ff08e4207c40b5ed9a26a",
  measurementId: "G-3HDDKJY6P6",
};

// Avoid re-initialising on hot reloads
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const firebaseAuth = getAuth(app);

let messagingPromise: Promise<Messaging | null> | null = null;

export function getFirebaseMessaging() {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      if (typeof window === 'undefined') return null;
      const supported = await isSupported().catch(() => false);
      if (!supported) return null;
      return getMessaging(app);
    })();
  }
  return messagingPromise;
}

export default app;
