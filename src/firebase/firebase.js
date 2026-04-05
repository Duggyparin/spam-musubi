import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCPLyRka9qib7YdeyrEz5R6FguPOe6i7cA",
  authDomain: "spam-musubi.vercel.app",
  projectId: "spam-musubi-a1eab",
  storageBucket: "spam-musubi-a1eab.firebasestorage.app",
  messagingSenderId: "74371417008",
  appId: "1:74371417008:web:338ddfe4618a4a6cdacc75"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

if (typeof window !== "undefined") {
  isSupported().then(supported => supported && getAnalytics(app)).catch(() => {});
}