import { Routes, Route } from 'react-router-dom'
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Handle redirect result from Google Sign‑In
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          const user = result.user
          console.log("Redirect login success:", user.email)
          // ✅ Use full page reload to bypass React Router
          if (user.email === ADMIN_EMAIL) {
            window.location.replace("/admin-spammusubi")
          } else {
            window.location.replace("/dashboard")
          }
        }
      })
      .catch((err) => console.error("Redirect error:", err))

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid)
          await setDoc(userRef, {
            online: true,
            lastSeen: new Date().toISOString()
          }, { merge: true })

          const interval = setInterval(async () => {
            await updateDoc(userRef, {
              lastSeen: new Date().toISOString()
            })
          }, 30000)

          const handleBeforeUnload = () => {
            updateDoc(userRef, {
              online: false,
              lastSeen: new Date().toISOString()
            }).catch(() => {})
          }
          window.addEventListener("beforeunload", handleBeforeUnload)

          setLoading(false)

          return () => {
            clearInterval(interval)
            window.removeEventListener("beforeunload", handleBeforeUnload)
            updateDoc(userRef, {
              online: false,
              lastSeen: new Date().toISOString()
            }).catch(() => {})
          }
        } catch (err) {
          console.error("Error updating user status:", err)
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🍱</div>
          <p className="text-white/50">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* ✅ Firebase iframe route – MUST be first */}
      <Route path="/__/auth/*" element={null} />
      
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin-spammusubi" element={<Admin />} />
    </Routes>
  )
}

export default App