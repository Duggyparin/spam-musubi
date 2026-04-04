import { Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { doc, setDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "./firebase/firebase"
import { onAuthStateChanged, getRedirectResult } from "firebase/auth"
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'

const ADMIN_EMAIL = "monsanto.bryann@gmail.com"

function App() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Handle redirect result (for Google sign-in)
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          const user = result.user
          console.log("Redirect login success:", user.email)
          if (user.email === ADMIN_EMAIL) {
            navigate("/admin-spammusubi", { replace: true })
          } else {
            navigate("/dashboard", { replace: true })
          }
        }
      })
      .catch((err) => console.error("Redirect error:", err))

    // Listen for auth state (for email/password and page refresh)
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("Auth state changed:", user.email)
        const userRef = doc(db, "users", user.uid)
        await setDoc(userRef, { online: true, lastSeen: new Date().toISOString() }, { merge: true })
        
        // Update lastSeen every 30 seconds
        const interval = setInterval(async () => {
          await updateDoc(userRef, { lastSeen: new Date().toISOString() })
        }, 30000)
        
        const handleBeforeUnload = () => {
          updateDoc(userRef, { online: false, lastSeen: new Date().toISOString() }).catch(() => {})
        }
        window.addEventListener("beforeunload", handleBeforeUnload)
        
        return () => {
          clearInterval(interval)
          window.removeEventListener("beforeunload", handleBeforeUnload)
          updateDoc(userRef, { online: false, lastSeen: new Date().toISOString() }).catch(() => {})
        }
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [navigate])

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin-spammusubi" element={<Admin />} />
    </Routes>
  )
}

export default App