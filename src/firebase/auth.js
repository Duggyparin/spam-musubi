// src/firebase/auth.js
import { auth, provider } from "./firebase";
import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";

// Set persistence to local (keeps user logged in)
export const setAuthPersistence = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log("✅ Auth persistence set to LOCAL");
  } catch (error) {
    console.error("Persistence error:", error);
  }
};

// Google Sign-In with popup (best for desktop)
export const signInWithGooglePopup = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return { user: result.user, error: null };
  } catch (error) {
    console.error("Popup error:", error);
    return { user: null, error };
  }
};

// Google Sign-In with redirect (best for mobile)
export const signInWithGoogleRedirect = async () => {
  try {
    await signInWithRedirect(auth, provider);
    return { redirecting: true, error: null };
  } catch (error) {
    console.error("Redirect error:", error);
    return { redirecting: false, error };
  }
};

// Get redirect result (call this when app loads after redirect)
export const getGoogleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      return { user: result.user, error: null };
    }
    return { user: null, error: null };
  } catch (error) {
    console.error("Get redirect result error:", error);
    return { user: null, error };
  }
};

// Main wrapper - automatically chooses best method based on device
export const signInWithGoogleProvider = async (isMobile = false, inAppBrowser = false) => {
  // Always use popup, even if on mobile or in-app browser
  return await signInWithGooglePopup();
};