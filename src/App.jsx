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
  // Global presence tracking – updates online status and lastSeen for all logged-in users
  useEffect(() => {
    let interval = null
    let cleanup = null

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Clear previous interval and cleanup if user changes (e.g., sign out)
      if (interval) clearInterval(interval)
      if (cleanup) cleanup()

      if (user) {
        const userRef = doc(db, "users", user.uid)
        
        // Set online status when user is active
        const setOnline = async () => {
          try {
            await setDoc(userRef, { 
              online: true, 
              lastSeen: new Date().toISOString() 
            }, { merge: true })
          } catch (err) {
            console.error("Error setting online status:", err)
          }
        }
        setOnline()

        // Update lastSeen every 30 seconds while logged in
        interval = setInterval(async () => {
          try {
            await updateDoc(userRef, { lastSeen: new Date().toISOString() })
          } catch (err) {
            console.error("Error updating lastSeen:", err)
          }
        }, 30000)

        // Set offline when user leaves the page or closes the tab
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
      {/* Silence Firebase iframe warning */}
      <Route path="/__/auth/iframe" element={null} />
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin-spammusubi" element={<Admin />} />
    </Routes>
  )
}

export default App