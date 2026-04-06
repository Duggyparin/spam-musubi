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
    // Handle Google redirect result first
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          const user = result.user
          console.log("Redirect login success:", user.email)
          if (user.email === ADMIN_EMAIL) {
            navigate("/admin-spammusubi", { replace: true })
          } else {
            navigate("/dashboard", { replace: true })
          }
        }
      })
      .catch((err) => {
        console.error("Redirect error:", err)
      })

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
  }, [navigate])

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
      {/* IMPORTANT: Firebase iframe route – must come BEFORE all other routes */}
      <Route path="/__/auth/*" element={null} />
      
      {/* Your existing routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin-spammusubi" element={<Admin />} />
    </Routes>
  )
}

export default App