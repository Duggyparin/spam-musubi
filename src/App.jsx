import { Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

const ADMIN_EMAIL = "monsanto.bryann@gmail.com";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Single source of truth: onAuthStateChanged
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Update online status in Firestore
        try {
          const userRef = doc(db, "users", currentUser.uid);
          await setDoc(userRef, {
            online: true,
            lastSeen: new Date().toISOString()
          }, { merge: true });

          const interval = setInterval(async () => {
            await updateDoc(userRef, { lastSeen: new Date().toISOString() });
          }, 30000);

          const handleBeforeUnload = () => {
            updateDoc(userRef, { online: false, lastSeen: new Date().toISOString() }).catch(() => {});
          };
          window.addEventListener("beforeunload", handleBeforeUnload);

          return () => {
            clearInterval(interval);
            window.removeEventListener("beforeunload", handleBeforeUnload);
            updateDoc(userRef, { online: false, lastSeen: new Date().toISOString() }).catch(() => {});
          };
        } catch (err) {
          console.error("Error updating user status:", err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🍱</div>
          <p className="text-white/50">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/__/auth/*" element={null} />
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/dashboard"
        element={user ? <Dashboard /> : <Login />}
      />
      <Route
        path="/admin-spammusubi"
        element={user?.email === ADMIN_EMAIL ? <Admin /> : <Login />}
      />
    </Routes>
  );
}

export default App;