import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { auth } from "./firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getGoogleRedirectResult } from "./firebase/auth";
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

const ADMIN_EMAIL = "monsanto.bryann@gmail.com";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle redirect result first
    const handleRedirect = async () => {
      const { user: redirectUser } = await getGoogleRedirectResult();
      if (redirectUser) {
        console.log("✅ Redirect user:", redirectUser.email);
        setUser(redirectUser);
        // Force redirect after state update
        setTimeout(() => {
          if (redirectUser.email === ADMIN_EMAIL) {
            window.location.href = "/admin-spammusubi";
          } else {
            window.location.href = "/dashboard";
          }
        }, 100);
        return;
      }
    };
    
    handleRedirect();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("📡 onAuthStateChanged:", currentUser?.email || "null");
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-5xl animate-bounce">🍱</div>
        <p className="text-white/50 ml-2">Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/__/auth/*" element={null} />
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={!user ? <Login /> : <Navigate to={user.email === ADMIN_EMAIL ? "/admin-spammusubi" : "/dashboard"} />} />
      <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="/admin-spammusubi" element={user?.email === ADMIN_EMAIL ? <Admin /> : <Navigate to="/login" />} />
    </Routes>
  );
}

export default App;