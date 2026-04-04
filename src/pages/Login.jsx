import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { auth } from "../firebase/firebase"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Mail, Lock } from "lucide-react"

const ADMIN_EMAIL = "monsanto.bryann@gmail.com"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resetMessage, setResetMessage] = useState("")

  // Normal login
  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setResetMessage("")
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      if (!user.emailVerified) {
        setError("Please verify your email first. Check your inbox (and spam folder) for the verification link.")
        setLoading(false)
        return
      }
      
      if (user.email === ADMIN_EMAIL) {
        navigate("/admin-spammusubi")
      } else {
        navigate("/dashboard")
      }
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("No account found. Please sign up first.")
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password")
      } else {
        setError(err.message)
      }
      setLoading(false)
    }
  }

  // Forgot password – send reset email
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.")
      return
    }
    setLoading(true)
    setError("")
    setResetMessage("")
    try {
      await sendPasswordResetEmail(auth, email)
      setResetMessage(`Password reset email sent to ${email}. Check your inbox (and spam folder).`)
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email.")
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍱</div>
          <h1 className="text-3xl font-black text-white">Welcome Back</h1>
          <p className="text-white/50 mt-2 text-sm">Sign in to reserve your Spam Musubi</p>
        </div>
        
        <form onSubmit={handleEmailLogin} className="space-y-4">
          {/* Email field */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-amber-400 focus:outline-none text-white"
              required
            />
          </div>
          
          {/* Password field */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-amber-400 focus:outline-none text-white"
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
          
          {/* Forgot password link */}
          <div className="text-right">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-white/40 hover:text-amber-400 transition-all"
            >
              Forgot password?
            </button>
          </div>
          
          {/* Error / success messages */}
          {error && <div className="text-red-400 text-sm text-center">{error}</div>}
          {resetMessage && <div className="text-green-400 text-sm text-center">{resetMessage}</div>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-400 text-black font-bold py-3 rounded-xl hover:bg-amber-300 disabled:opacity-50 transition-all"
          >
            {loading ? "Please wait..." : "Sign In"}
          </button>
        </form>
        
        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/signup")}
            className="text-white/40 text-sm hover:text-amber-400"
          >
            Don't have an account? Sign Up →
          </button>
        </div>
      </div>
    </div>
  )
}