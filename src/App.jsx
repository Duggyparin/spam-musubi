import { Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { doc, setDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "./firebase/firebase"
import { onAuthStateChanged, getRedirectResult } from "firebase/auth"
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'

const ADMIN_EMAIL = "monsanto.bryann@gmail.com"

function App() {
  const navigate = useNavigate()
  const [authChecked, setAuthChecked] = useState(false)

  // Handle redirect result (for mobile) AND auth state
  useEffect(() => {
    let isMounted = true

    const handleAuth = async () => {
      // First, check if there's a redirect result
      try {
        const result = await getRedirectResult(auth)
        if (result && isMounted) {
          const user = result.user
          console.log("Redirect login success:", user.email)
          if (user.email === ADMIN_EMAIL) {
            navigate("/admin-spammusubi", { replace: true })
          } else {
            navigate("/dashboard", { replace: true })
          }
          return
        }
      } catch (err) {
        console.error("Redirect result error:", err)
      }

      // Then, listen for auth state changes (covers popup login and page refresh)
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!isMounted) return
        if (user) {
          console.log("Auth state changed:", user.email)
          if (user.email === ADMIN_EMAIL) {
            navigate("/admin-spammusubi", { replace: true })
          } else {
            navigate("/dashboard", { replace: true })
          }
        }
        setAuthChecked(true)
      })

      return () => unsubscribe()
    }

    handleAuth()
    return () => { isMounted = false }
  }, [navigate])

  // Global presence tracking (only runs when user is logged in)
  useEffect(() => {
    if (!auth.currentUser) return

    let interval = null
    const userRef = doc(db, "users", auth.currentUser.uid)

    const setOnline = async () => {
      await setDoc(userRef, { online: true, lastSeen: new Date().toISOString() }, { merge: true })
    }
    setOnline()

    interval = setInterval(async () => {
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
  }, [])

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading...
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin-spammusubi" element={<Admin />} />
    </Routes>
  )
}

export default App