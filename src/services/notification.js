import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";

const VAPID_PUBLIC_KEY = "2wkmHaTDkC78b-HZp0Wn4SogGteoaLc2pxXDq5JF_Vw";

export const requestNotificationPermission = async () => {
  try {
    const messaging = getMessaging();
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Notification permission granted");
      return await saveFCMToken(messaging);
    } else {
      console.log("Notification permission denied");
      return null;
    }
  } catch (error) {
    console.error("Error requesting permission:", error);
    return null;
  }
};

const saveFCMToken = async (messaging) => {
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_PUBLIC_KEY });
    if (token && auth.currentUser) {
      await setDoc(doc(db, "users", auth.currentUser.uid), {
        fcmToken: token,
        fcmTokenUpdated: new Date().toISOString()
      }, { merge: true });
      console.log("FCM token saved:", token);
      return token;
    }
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    const messaging = getMessaging();
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
