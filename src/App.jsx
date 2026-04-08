import { Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { auth } from "./firebase/firebase";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

const ADMIN_EMAIL = "monsanto.bryann@gmail.com";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Handle Google redirect result (after user comes back from Google)
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        console.log("Redirect result user:", result.user.email);
        // Full page reload to avoid React Router intercepting
        if (result.user.email === ADMIN_EMAIL) {
          window.location.replace("/admin-spammusubi");
        } else {
          window.location.replace("/dashboard");
        }
      }
    }).catch((err) => console.error("Redirect error:", err));

    // 2. Listen for auth state changes (email/password, or after redirect)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("onAuthStateChanged:", currentUser?.email || "null");
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><div className="text-5xl animate-bounce">🍱</div><p className="text-white/50">Loading...</p></div>;
  }

  return (
    <Routes>
      <Route path="/__/auth/*" element={null} />
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={user ? <Dashboard /> : <Login />} />
      <Route path="/admin-spammusubi" element={user?.email === ADMIN_EMAIL ? <Admin /> : <Login />} />
    </Routes>
  );
}

export default App;