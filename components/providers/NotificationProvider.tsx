'use client';

import { useEffect, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import toast from 'react-hot-toast';
import { useAuth } from '@/components/providers/AuthProvider';
import { getFirebaseMessaging } from '@/lib/firebase';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const registeredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const setupNotifications = async () => {
      if (!user || user.role !== 'patient' || !token) return;
      if (typeof window === 'undefined' || !('Notification' in window)) return;

      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission !== 'granted') return;

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.warn('[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing.');
        return;
      }

      const messaging = await getFirebaseMessaging();
      if (!messaging) return;

      let registration: ServiceWorkerRegistration | undefined;
      if ('serviceWorker' in navigator) {
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      }

      const fcmToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (!fcmToken) return;
      if (registeredTokenRef.current === fcmToken) return;

      await fetch('/api/notifications/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fcmToken }),
      });

      registeredTokenRef.current = fcmToken;

      return onMessage(messaging, (payload) => {
        const title = payload.notification?.title || 'MediQueue Update';
        const body = payload.notification?.body || 'There is an update in your queue.';

        toast.success(`${title}: ${body}`);
        if (Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/logo.png' });
        }
      });
    };

    let unsubscribe: (() => void) | void;
    setupNotifications()
      .then((cleanup) => {
        unsubscribe = cleanup;
      })
      .catch((err) => {
        console.error('[FCM setup error]', err);
      });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, token]);

  return <>{children}</>;
}
