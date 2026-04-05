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

function AuthHandler() {
  const navigate = useNavigate()
  const [error, setError] = useState(false)
  const [debug, setDebug] = useState("Initializing...")

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        setDebug("Calling getRedirectResult...")
        console.log("AuthHandler: calling getRedirectResult")
        const result = await getRedirectResult(auth)
        console.log("AuthHandler: result =", result)
        setDebug(`Result: ${result ? "User found" : "No result"}`)
        
        if (result) {
          const user = result.user
          console.log("User signed in:", user.email)
          setDebug(`User: ${user.email}`)
          if (user.email === ADMIN_EMAIL) {
            console.log("Navigating to admin")
            navigate("/admin-spammusubi", { replace: true })
          } else {
            console.log("Navigating to dashboard")
            navigate("/dashboard", { replace: true })
          }
        } else {
          console.log("No redirect result, going to login")
          setDebug("No result, redirecting to login...")
          setTimeout(() => navigate("/login", { replace: true }), 1000)
        }
      } catch (err) {
        console.error("AuthHandler error:", err)
        setDebug(`Error: ${err.message}`)
        setError(true)
      }
    }
    handleRedirect()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <div className="text-red-500 text-xl mb-4">Login failed</div>
        <p className="text-white/70 mb-4">Something went wrong. Please try again.</p>
        <button onClick={() => navigate("/login")} className="bg-amber-400 text-black px-6 py-2 rounded-lg">Go to Login</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="text-xl">Completing sign in...</div>
      <div className="text-sm text-white/50 mt-4">{debug}</div>
    </div>
  )
}

function App() {
  // Global presence tracking
  useEffect(() => {
    let interval = null
    let cleanup = null

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (interval) clearInterval(interval)
      if (cleanup) cleanup()

      if (user) {
        const userRef = doc(db, "users", user.uid)
        await setDoc(userRef, { online: true, lastSeen: new Date().toISOString() }, { merge: true })
        interval = setInterval(async () => {
          await updateDoc(userRef, { lastSeen: new Date().toISOString() })
        }, 30000)
        const handleBeforeUnload = () => {
          updateDoc(userRef, { online: false, lastSeen: new Date().toISOString() }).catch(() => {})
        }
        window.addEventListener("beforeunload", handleBeforeUnload)
        cleanup = () => {
          window.removeEventListener("beforeunload", handleBeforeUnload)
          if (interval) clearInterval(interval)
          updateDoc(userRef, { online: false, lastSeen: new Date().toISOString() }).catch(() => {})
        }
      }
    })
    return () => {
      if (interval) clearInterval(interval)
      if (cleanup) cleanup()
      unsubscribe()
    }
  }, [])

  return (
    <Routes>
      <Route path="/__/auth/handler" element={<AuthHandler />} />
      <Route path="/__/auth/iframe" element={null} />
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin-spammusubi" element={<Admin />} />
    </Routes>
  )
}

export default App