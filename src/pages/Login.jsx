import { signInWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth"
import { auth } from "../firebase/firebase"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react"

const ADMIN_EMAIL = "monsanto.bryann@gmail.com"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resetMessage, setResetMessage] = useState("")
  const [rememberMe, setRememberMe] = useState(false)

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setResetMessage("")
    try {
      // Set persistence before sign in
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      if (!user.emailVerified) {
        setError("Please verify your email first. Check your inbox and spam folder.")
        setLoading(false)
        return
      }
      if (user.email === ADMIN_EMAIL) {
        navigate("/admin-spammusubi")
      } else {
        navigate("/dashboard")
      }
    } catch (err) {
      if (err.code === "auth/user-not-found") setError("No account found. Please sign up.")
      else if (err.code === "auth/wrong-password") setError("Incorrect password")
      else setError(err.message)
      setLoading(false)
    }
  }

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
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/musubi.png"
          alt="Spam Musubi"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#0a0a0a]" />
      </div>

      {/* Login card */}
      <div className="relative z-10 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍱</div>
          <h1 className="text-3xl font-black text-white">Welcome Back</h1>
          <p className="text-white/50 mt-2 text-sm">Sign in to reserve your Spam Musubi</p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          {/* Email field */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray/400" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none text-white"
              required
            />
          </div>

          {/* Password field with show/hide */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray/400" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          {/* Remember me & Forgot password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-white/50">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/10 focus:ring-amber-400"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-white/40 hover:text-amber-400 transition-all"
            >
              Forgot password?
            </button>
          </div>

          {/* Error / success messages */}
          {error && <div className="text-red-400 text-sm text-center animate-pulse">{error}</div>}
          {resetMessage && <div className="text-green-400 text-sm text-center">{resetMessage}</div>}

          {/* Submit button with spinner */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold py-3 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
          </button>
        </form>

        {/* Sign up link */}
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