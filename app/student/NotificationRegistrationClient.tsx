"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import * as firebaseMessaging from "@/lib/firebase-messaging";

export default function NotificationRegistrationClient() {
  const { data: session } = useSession();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (!session?.user) return;

    const userId = (session.user as any)?.id;
    if (!userId) return;

    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .then((registration) => {
          firebaseMessaging.getToken(firebaseMessaging.messaging, { vapidKey: firebaseMessaging.vapidKey, serviceWorkerRegistration: registration })
          .then((currentToken: string | null) => {
            if (currentToken) {
              // Send token to backend with userId
              fetch("/api/save-fcm-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: currentToken, userId }),
              });
            }
          })
          .catch(console.error);
      });
  }, [session]);
  return null;
}
