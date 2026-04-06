import { signInWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence, signInWithRedirect, GoogleAuthProvider } from "firebase/auth"
import { auth } from "../firebase/firebase"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react"
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const ADMIN_EMAIL = "monsanto.bryann@gmail.com"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resetMessage, setResetMessage] = useState("")
  const [inAppBrowser, setInAppBrowser] = useState(false)
  
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  // Detect in‑app browser
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera
    const isFacebook = ua.includes("FBAV") || ua.includes("FBAN")
    const isInstagram = ua.includes("Instagram")
    const isMessenger = ua.includes("Messenger")
    setInAppBrowser(isFacebook || isInstagram || isMessenger)
  }, [])

  // Always set persistence to local (keeps user logged in)
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error)
  }, [])

  // Email/Password login
  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setResetMessage("")
    try {
      await setPersistence(auth, browserLocalPersistence)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      if (user.email !== ADMIN_EMAIL && !user.emailVerified) {
        setError("Please verify your email first. Check your inbox and spam folder.")
        setLoading(false)
        return
      }

      if (user.email === ADMIN_EMAIL) {
        window.location.replace("/admin-spammusubi")
      } else {
        window.location.replace("/dashboard")
      }
    } catch (err) {
      alert(`Login error: ${err.code} – ${err.message}`)
      if (err.code === "auth/user-not-found") setError("No account found. Please sign up.")
      else if (err.code === "auth/wrong-password") setError("Incorrect password")
      else setError(err.message)
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    console.log("Popup success:", result.user.email);
    window.location.replace(result.user.email === ADMIN_EMAIL ? "/admin-spammusubi" : "/dashboard");
  } catch (err) {
    console.error(err);
    alert("Google sign-in failed: " + err.message);
  }
};

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email address first.")
      return
    }
    setLoading(true)
    setError("")
    setResetMessage("")
    try {
      await sendPasswordResetEmail(auth, email)
      setResetMessage(`Reset link sent to ${email}. Check your inbox (and spam).`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src="/musubi.png" alt="Spam Musubi" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#0a0a0a]" />
      </div>

      <div className="relative z-10 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍱</div>
          <h1 className="text-3xl font-black text-white">Welcome Back</h1>
          <p className="text-white/50 mt-2 text-sm">Sign in to reserve your Spam Musubi</p>
        </div>

        {inAppBrowser && (
          <div className="mb-4 p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg text-yellow-400 text-xs text-center">
            ⚠️ You're using an in‑app browser. For the best experience, please open this link in Chrome or Safari.
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="relative">
            <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-all duration-200 ${
              email || emailFocused ? 'text-gray-400' : 'text-gray-600 opacity-0'
            }`} />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none text-white"
              required
            />
          </div>

          <div className="relative">
            <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-all duration-200 ${
              password || passwordFocused ? 'text-gray-400' : 'text-gray-600 opacity-0'
            }`} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/10 border border-white/20 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none text-white"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div></div>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-white/40 hover:text-amber-400 transition-all"
            >
              Forgot password?
            </button>
          </div>

          {error && <div className="text-red-400 text-sm text-center animate-pulse">{error}</div>}
          {resetMessage && <div className="text-green-400 text-sm text-center">{resetMessage}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold py-3 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
          </button>
        </form>

        {/* Google Sign-In Button */}
        <div className="mt-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 border border-white/20"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/signup")}
            className="text-white/40 text-sm hover:text-amber-400 transition-all"
          >
            Don't have an account? Sign Up →
          </button>
        </div>
      </div>
    </div>
  )
}