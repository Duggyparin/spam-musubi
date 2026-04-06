import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, collection, doc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, writeBatch, serverTimestamp } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCPLyRka9qib7YdeyrEz5R6FguPOe6i7cA",
  authDomain: "spam-musubi-a1eab.firebaseapp.com",
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

// Analytics
if (typeof window !== "undefined") {
  isSupported().then(supported => supported && getAnalytics(app)).catch(() => {});
}

// ========== EXPOSE MODULAR HELPERS GLOBALLY ==========
if (typeof window !== "undefined") {
  window.fb = {
    auth,
    db,
    collection,
    doc,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    writeBatch,
    serverTimestamp,
    getDocs,
  };
  console.log("🔥 Firebase modular helpers exposed as window.fb");
}