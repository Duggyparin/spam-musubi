import { Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { doc, setDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "./firebase/firebase"
import { onAuthStateChanged } from "firebase/auth"
import Landing from './pages/Landing'
import Login from './pages/Login'
import EmailLogin from './pages/EmailLogin'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'

function App() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
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
  }, [])

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/emaillogin" element={<EmailLogin />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin-spammusubi" element={<Admin />} />
    </Routes>
  )
}

export default App