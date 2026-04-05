import { Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { doc, setDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "./firebase/firebase"
import { onAuthStateChanged, getRedirectResult } from "firebase/auth"
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'

const ADMIN_EMAIL = "monsanto.bryann@gmail.com"

// This component handles the redirect after Google sign-in
function AuthHandler() {
  const navigate = useNavigate()
  const [processed, setProcessed] = useState(false)

  useEffect(() => {
    if (processed) return

    const handleRedirect = async () => {
      try {
        console.log("AuthHandler: Checking redirect result...")
        const result = await getRedirectResult(auth)
        console.log("Redirect result:", result)
        
        if (result) {
          const user = result.user
          console.log("User found:", user.email)
          if (user.email === ADMIN_EMAIL) {
            navigate("/admin-spammusubi", { replace: true })
          } else {
            navigate("/dashboard", { replace: true })
          }
        } else {
          console.log("No redirect result, going to login")
          navigate("/login", { replace: true })
        }
      } catch (error) {
        console.error("Redirect error:", error)
        navigate("/login", { replace: true })
      }
      setProcessed(true)
    }
    
    handleRedirect()
  }, [navigate, processed])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      Completing sign in...
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

        interval = setInterval(async () => {
          try {
            await updateDoc(userRef, { lastSeen: new Date().toISOString() })
          } catch (err) {
            console.error("Error updating lastSeen:", err)
          }
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
      {/* IMPORTANT: This route handles the Google redirect */}
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