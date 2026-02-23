"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import * as firebaseMessaging from "@/lib/firebase-messaging";

export default function NotificationRegistrationClient() {
  const { data: session } = useSession();
  const [notificationStatus, setNotificationStatus] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!session?.user) return;

    const userId = (session.user as any)?.id;
    if (!userId) return;

    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIOS && !isStandalone) {
      setNotificationStatus("⚠️ For notifications on iPhone: Tap Share → Add to Home Screen");
      console.warn("iOS requires PWA installation for push notifications");
      return;
    }

    // Check if notifications are supported
    if (!("Notification" in window)) {
      setNotificationStatus("⚠️ This browser doesn't support notifications");
      return;
    }

    // Check if service workers are supported
    if (!("serviceWorker" in navigator)) {
      setNotificationStatus("⚠️ Service workers not supported");
      return;
    }

    // Request notification permission
    const requestNotificationPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        
        if (permission !== "granted") {
          setNotificationStatus("⚠️ Notification permission denied");
          return;
        }

        // Register service worker
        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        await navigator.serviceWorker.ready;
        
        // Get FCM token
        const currentToken = await firebaseMessaging.getToken(
          firebaseMessaging.messaging, 
          { 
            vapidKey: firebaseMessaging.vapidKey, 
            serviceWorkerRegistration: registration 
          }
        );

        if (currentToken) {
          // Send token to backend
          const response = await fetch("/api/save-fcm-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: currentToken, userId }),
          });
          
          if (response.ok) {
            setNotificationStatus("✅ Notifications enabled");
            console.log("FCM token saved:", currentToken);
          } else {
            setNotificationStatus("⚠️ Failed to save notification token");
          }
        } else {
          setNotificationStatus("⚠️ No FCM token received");
        }
      } catch (error) {
        console.error("Notification setup error:", error);
        setNotificationStatus("❌ Notification setup failed");
      }
    };

    requestNotificationPermission();
  }, [session]);
  
  return notificationStatus ? (
    <div className="fixed bottom-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-2 rounded shadow-lg text-sm z-50">
      {notificationStatus}
    </div>
  ) : null;
}
