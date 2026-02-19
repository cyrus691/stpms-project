"use client";
import { useEffect } from "react";
import * as firebaseMessaging from "@/lib/firebase-messaging";

export default function NotificationRegistrationClient() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .then((registration) => {
          firebaseMessaging.getToken(firebaseMessaging.messaging, { vapidKey: firebaseMessaging.vapidKey, serviceWorkerRegistration: registration })
          .then((currentToken: string | null) => {
            if (currentToken) {
              // Send token to backend
              fetch("/api/save-fcm-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: currentToken }),
              });
            }
          })
          .catch(console.error);
      });
  }, []);
  return null;
}
