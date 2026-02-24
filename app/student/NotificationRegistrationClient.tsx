"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import * as firebaseMessaging from "@/lib/firebase-messaging";

export default function NotificationRegistrationClient() {
  const { data: session } = useSession();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!session?.user) return;

    const userId = (session.user as any)?.id;
    if (!userId) return;

    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    
    console.log("[FCM] Platform detection - userAgent:", navigator.userAgent);
    console.log("[FCM] isIOS:", isIOS, "isStandalone:", isStandalone);
    
    if (isIOS && !isStandalone) {
      console.warn("[FCM] iOS requires PWA installation for push notifications");
      return;
    }

    // Check if notifications are supported
    if (!("Notification" in window)) {
      console.warn("Notifications not supported in this browser");
      return;
    }

    // Check if service workers are supported
    if (!("serviceWorker" in navigator)) {
      console.warn("Service workers not supported");
      return;
    }

    // Request notification permission
    const requestNotificationPermission = async () => {
      try {
        console.log("[FCM] Starting notification permission request...");
        const permission = await Notification.requestPermission();
        console.log("[FCM] Notification permission result:", permission);
        
        if (permission !== "granted") {
          console.log("[FCM] Notification permission denied by user");
          return;
        }

        console.log("[FCM] Permission granted! Registering service worker...");
        
        // Wait a bit for service worker infrastructure to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Register service worker
        let registration;
        try {
          registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/", updateViaCache: 'none' });
          console.log("[FCM] ✅ Service worker registered successfully", registration);
          
          if (!registration) {
            console.error("[FCM] ❌ Registration returned null");
            return;
          }
        } catch (regError) {
          const regErrorMsg = regError instanceof Error ? regError.message : String(regError);
          console.error("[FCM] ❌ Service worker registration FAILED:", regErrorMsg);
          return;
        }

        // Wait for service worker to be ready with longer timeout
        try {
          const readyPromise = navigator.serviceWorker.ready;
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Service worker ready timeout")), 5000)
          );
          await Promise.race([readyPromise, timeoutPromise]);
          console.log("[FCM] ✅ Service worker ready");
        } catch (readyError) {
          const readyMsg = readyError instanceof Error ? readyError.message : String(readyError);
          console.error("[FCM] ⚠️ Service worker ready check issue:", readyMsg);
          console.log("[FCM] Continuing anyway, might still work...");
        }
        
        // Get FCM token
        console.log("[FCM] Getting FCM token from Firebase...");
        console.log("[FCM] Config - vapidKey:", firebaseMessaging.vapidKey ? "✅ set" : "❌ missing");
        console.log("[FCM] Config - messaging:", firebaseMessaging.messaging ? "✅ set" : "❌ missing");
        console.log("[FCM] Config - registration:", registration ? "✅ exists" : "❌ null");
        
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
          console.error("[FCM] ❌ Failed to get FCM token:", tokenMsg);
          return;
        }
        console.log("[FCM] Firebase token received:", currentToken ? currentToken.substring(0, 30) + "..." : "null");

        if (currentToken) {
          // Send token to backend
          console.log("[FCM] Sending token to save-fcm-token endpoint...");
          console.log("[FCM] userId:", userId);
          console.log("[FCM] token:", currentToken.substring(0, 30) + "...");
          
          const response = await fetch("/api/save-fcm-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: currentToken, userId }),
            credentials: "include" // IMPORTANT: include cookies for authentication
          });
          
          console.log("[FCM] Response status:", response.status);
          
          const responseData = await response.json();
          console.log("[FCM] Response body:", responseData);
          
          if (response.ok) {
            console.log("[FCM] ✅ FCM token saved successfully");
          } else {
            console.error("[FCM] ❌ Failed to save token. Status:", response.status);
            console.error("[FCM] Error details:", responseData);
          }
        } else {
          console.error("[FCM] ❌ No FCM token received from Firebase");
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[FCM] ❌ Notification setup error:", errorMsg);
      }
    };

    requestNotificationPermission();
  }, [session]);
  
  return null;
}
