import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { doc, setDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "./firebase/firebase"
import { onAuthStateChanged } from "firebase/auth"
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'

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
      <Route path="/__/auth/iframe" element={null} />
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin-spammusubi" element={<Admin />} />
    </Routes>
  )
}

export default App