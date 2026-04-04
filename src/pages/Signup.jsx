import { useState, useEffect } from "react"
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth"
import { auth } from "../firebase/firebase"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from "lucide-react"

export default function Signup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Load saved form data from localStorage (if returning user)
  useEffect(() => {
    const saved = localStorage.getItem("spamMusubiSignupInfo")
    if (saved) {
      try {
        const { email: savedEmail, fullName: savedName } = JSON.parse(saved)
        if (savedEmail) setEmail(savedEmail)
        if (savedName) setFullName(savedName)
      } catch (e) {}
    }
  }, [])

  const validatePassword = (pwd) => {
    const errors = []
    if (pwd.length < 8) errors.push("at least 8 characters")
    if (!/[A-Z]/.test(pwd)) errors.push("one uppercase letter")
    if (!/[a-z]/.test(pwd)) errors.push("one lowercase letter")
    if (!/[0-9]/.test(pwd)) errors.push("one number")
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) errors.push("one special character")
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }
    
    const passwordErrors = validatePassword(password)
    if (passwordErrors.length > 0) {
      setError(`Password must contain: ${passwordErrors.join(", ")}`)
      setLoading(false)
      return
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await sendEmailVerification(userCredential.user)
      
      // Save signup info for next time
      localStorage.setItem("spamMusubiSignupInfo", JSON.stringify({ email, fullName }))
      
      setSuccess(true)
    } catch (err) {
      console.error(err)
      if (err.code === "auth/email-already-in-use") {
        setError("Email already registered. Please sign in instead.")
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address")
      } else {
        setError(err.message)
      }
      setLoading(false)
    }
  }

  const useSavedInfo = () => {
    const saved = localStorage.getItem("spamMusubiSignupInfo")
    if (saved) {
      try {
        const { email: savedEmail, fullName: savedName } = JSON.parse(saved)
        if (savedEmail) setEmail(savedEmail)
        if (savedName) setFullName(savedName)
      } catch (e) {}
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-[#111] border border-white/10 rounded-2xl p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">📧</div>
          <h1 className="text-2xl font-black text-white mb-4">Verify Your Email</h1>
          <p className="text-white/70 mb-4">
            We've sent a verification email to <strong className="text-amber-400">{email}</strong>
          </p>
          <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-white/70 text-sm">
                <strong className="text-amber-400">Check your spam folder!</strong> Sometimes our emails get filtered. If you don't see it in your inbox, please check your spam/junk folder and mark it as "Not spam".
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="w-full bg-amber-400 text-black font-bold py-3 rounded-xl hover:bg-amber-300"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍱</div>
          <h1 className="text-3xl font-black text-white">Create Account</h1>
          <p className="text-white/50 mt-2 text-sm">Sign up to start ordering</p>
        </div>
        
        {/* Saved info button */}
        <button
          onClick={useSavedInfo}
          className="w-full text-sm text-amber-400 hover:text-amber-300 mb-4 flex items-center justify-center gap-2"
        >
          🔄 Use saved information
        </button>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name (optional but good for UX) */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Full Name (optional)"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-amber-400 focus:outline-none text-white"
            />
          </div>
          
          {/* Email */}
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
          
          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password (min 8 chars, 1 uppercase, 1 number, 1 special)"
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
          
          {/* Confirm Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-amber-400 focus:outline-none text-white"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          {error && <div className="text-red-400 text-sm text-center">{error}</div>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-400 text-black font-bold py-3 rounded-xl hover:bg-amber-300 disabled:opacity-50 transition-all"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>
        
        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/login")}
            className="text-white/40 text-sm hover:text-amber-400"
          >
            Already have an account? Sign In →
          </button>
        </div>
      </div>
    </div>
  )
}