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
        console.log("[FCM] Starting notification permission request...");
        const permission = await Notification.requestPermission();
        console.log("[FCM] Notification permission result:", permission);
        
        if (permission !== "granted") {
          console.error("[FCM] ❌ User denied notification permission");
          setNotificationStatus("⚠️ Notification permission denied");
          return;
        }

        console.log("[FCM] Permission granted! Registering service worker...");
        // Register service worker
        let registration;
        try {
          registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
          console.log("[FCM] ✅ Service worker registered successfully", registration);
        } catch (regError) {
          const regErrorMsg = regError instanceof Error ? regError.message : String(regError);
          console.error("[FCM] ❌ Service worker registration FAILED:", regErrorMsg, regError);
          setNotificationStatus("❌ Service worker registration failed: " + regErrorMsg);
          return;
        }

        if (!registration) {
          console.error("[FCM] ❌ Registration object is null/undefined!");
          setNotificationStatus("❌ Service worker registration returned null");
          return;
        }

        try {
          await navigator.serviceWorker.ready;
          console.log("[FCM] ✅ Service worker ready");
        } catch (readyError) {
          const readyMsg = readyError instanceof Error ? readyError.message : String(readyError);
          console.error("[FCM] ❌ Service worker ready check failed:", readyMsg);
          setNotificationStatus("❌ Service worker not ready: " + readyMsg);
          return;
        }
        
        // Get FCM token
        console.log("[FCM] Getting FCM token from Firebase...");
        console.log("[FCM] Config - vapidKey:", firebaseMessaging.vapidKey ? "✅ set" : "❌ missing");
        console.log("[FCM] Config - messaging:", firebaseMessaging.messaging ? "✅ set" : "❌ missing");
        
        let currentToken;
        try {
          currentToken = await firebaseMessaging.getToken(
            firebaseMessaging.messaging, 
            { 
              vapidKey: firebaseMessaging.vapidKey, 
              serviceWorkerRegistration: registration 
            }
          );
        } catch (tokenError) {
          const tokenMsg = tokenError instanceof Error ? tokenError.message : String(tokenError);
          console.error("[FCM] ❌ Failed to get FCM token:", tokenMsg, tokenError);
          setNotificationStatus("❌ Failed to get FCM token: " + tokenMsg);
          return;
        }
        console.log("[FCM] Firebase token received:", currentToken ? currentToken.substring(0, 30) + "..." : "null");

        if (currentToken) {
          // Send token to backend
          console.log("[FCM] Sending token to save-fcm-token endpoint...");
          const response = await fetch("/api/save-fcm-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: currentToken, userId }),
            credentials: "include" // IMPORTANT: include cookies for authentication
          });
          
          console.log("[FCM] Response status:", response.status);
          if (response.ok) {
            setNotificationStatus("✅ Notifications enabled");
            console.log("[FCM] ✅ FCM token saved successfully");
          } else {
            const errorData = await response.text();
            console.error("[FCM] ❌ Failed to save token. Status:", response.status, "Body:", errorData);
            setNotificationStatus("⚠️ Failed to save notification token: " + response.status);
          }
        } else {
          console.error("[FCM] ❌ No FCM token received from Firebase");
          setNotificationStatus("⚠️ No FCM token received");
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[FCM] ❌ Notification setup error:", errorMsg, error);
        setNotificationStatus("❌ Notification setup failed: " + errorMsg);
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
