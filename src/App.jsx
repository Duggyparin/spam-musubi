// App.jsx
import { Routes, Route, useNavigate } from 'react-router-dom'; // Import useNavigate
import { useEffect, useState } from 'react';
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase/firebase";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";

import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard'; // Import Dashboard
import Admin from './pages/Admin';     // Import Admin
import PrivateRoute from './components/PrivateRoute'; // Import your new PrivateRoute component

const ADMIN_EMAIL = "monsanto.bryann@gmail.com";

function App() {
  const [loadingAuth, setLoadingAuth] = useState(true); // Renamed for clarity on what's loading
  const [user, setUser] = useState(null); // State to hold the authenticated user
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    const handleAuthProcess = async () => {
      try {
        // --- Step 1: Handle any pending redirect result FIRST ---
        // This is crucial for Google Sign-In redirect flow.
        // It resolves the credential after the external redirect.
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
          console.log("Redirect sign-in successful:", redirectResult.user.email);
          // Set user state immediately. onAuthStateChanged will confirm later.
          // Note: window.location.replace is commented out here as `onAuthStateChanged`
          // or a more controlled navigation via `navigate` will handle the routing.
          // This ensures that the user state is set consistently before routing.
          // If you still experience issues, uncommenting the replace might be necessary
          // but try without it first for cleaner React Router behavior.
          setUser(redirectResult.user);
        }
      } catch (err) {
        console.error("Error handling redirect result:", err);
        // Optionally handle errors during redirect (e.g., user cancels Google login)
        // You might want to navigate to login or show an error message
        navigate("/login", { replace: true }); // Ensure no infinite loop here
      } finally {
        // --- Step 2: Set up the main authentication state listener ---
        // This listener will fire initially (with current user or null)
        // and on any subsequent authentication state changes (e.g., login, logout).
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          setUser(currentUser); // Update user state for the entire application

          if (currentUser) {
            // User is logged in, perform Firestore updates (online status, last seen)
            try {
              const userRef = doc(db, "users", currentUser.uid);
              await setDoc(userRef, {
                online: true,
                lastSeen: new Date().toISOString()
              }, { merge: true });

              const interval = setInterval(async () => {
                // Ensure currentUser is still valid before updating
                if (auth.currentUser && auth.currentUser.uid === currentUser.uid) {
                  await updateDoc(userRef, {
                    lastSeen: new Date().toISOString()
                  });
                } else {
                  clearInterval(interval); // User logged out or changed, stop interval
                }
              }, 30000);

              const handleBeforeUnload = () => {
                // Only update if user is still logged in to prevent errors
                if (auth.currentUser && auth.currentUser.uid === currentUser.uid) {
                   updateDoc(userRef, {
                    online: false,
                    lastSeen: new Date().toISOString()
                  }).catch((e) => console.error("Error setting offline on unload:", e));
                }
              };
              window.addEventListener("beforeunload", handleBeforeUnload);

              // Clean up function for onAuthStateChanged and related effects
              return () => {
                clearInterval(interval);
                window.removeEventListener("beforeunload", handleBeforeUnload);
                // Set offline status when component unmounts or user logs out
                // Ensure currentUser is still the same user before setting offline
                if (auth.currentUser && auth.currentUser.uid === currentUser.uid) {
                  updateDoc(userRef, {
                    online: false,
                    lastSeen: new Date().toISOString()
                  }).catch((e) => console.error("Error setting offline on cleanup:", e));
                }
              };

            } catch (err) {
              console.error("Error updating user status or setting up cleanup:", err);
            }
          }
          setLoadingAuth(false); // Authentication state is now known
        });

        return () => unsubscribe(); // Cleanup auth state listener
      }
    };

    handleAuthProcess();
  }, [navigate]); // Add navigate to dependency array

  // Display a global loading spinner while authentication state is being determined
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🍱</div>
          <p className="text-white/50">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Firebase iframe route – MUST be first and should return null */}
      <Route path="/__/auth/*" element={null} />

      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected Routes */}
      {/* Use PrivateRoute to wrap routes that require authentication */}
      <Route element={<PrivateRoute user={user} />}>
        {/* Pass the user object to Dashboard and Admin components */}
        <Route path="/dashboard" element={<Dashboard user={user} />} />
        {/* Further logic could be added here to check for admin role */}
        <Route path="/admin-spammusubi" element={<Admin user={user} />} />
      </Route>
    </Routes>
  );
}

export default App;
