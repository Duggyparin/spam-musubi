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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for redirect result (for fallback)
    getRedirectResult(auth).then((result) => {
      if (result) {
        const user = result.user
        if (user.email === ADMIN_EMAIL) {
          navigate("/admin-spammusubi", { replace: true })
        } else {
          navigate("/dashboard", { replace: true })
        }
      }
    }).catch(console.error)

    // Listen for auth state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid)
        setDoc(userRef, { online: true, lastSeen: new Date().toISOString() }, { merge: true })
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
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin-spammusubi" element={<Admin />} />
    </Routes>
  )
}

export default App