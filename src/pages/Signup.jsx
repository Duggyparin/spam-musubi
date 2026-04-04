import { useState, useEffect } from "react"
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth"
import { auth } from "../firebase/firebase"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Loader2 } from "lucide-react"

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

  // Facebook-style focus states
  const [fullNameFocused, setFullNameFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false)

  // Load saved form data from localStorage
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
    if (pwd.length < 6) return ["at least 6 characters"]
    return []
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
      <div className="relative min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/musubi.png" alt="Spam Musubi" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#0a0a0a]" />
        </div>
        <div className="relative z-10 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-8 w-full max-w-md text-center">
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
    <div className="relative min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src="/musubi.png" alt="Spam Musubi" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#0a0a0a]" />
      </div>

      <div className="relative z-10 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍱</div>
          <h1 className="text-3xl font-black text-white">Create Account</h1>
          <p className="text-white/50 mt-2 text-sm">Sign up to start ordering</p>
        </div>
        
        <button
          onClick={useSavedInfo}
          className="w-full text-sm text-amber-400 hover:text-amber-300 mb-4 flex items-center justify-center gap-2"
        >
          🔄 Use saved information
        </button>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="relative">
            <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-all duration-200 ${
              fullName || fullNameFocused ? 'text-gray-400' : 'text-gray-600 opacity-0'
            }`} />
            <input
              type="text"
              placeholder="Full Name (optional)"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onFocus={() => setFullNameFocused(true)}
              onBlur={() => setFullNameFocused(false)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none text-white"
            />
          </div>
          
          {/* Email */}
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
          
          {/* Password */}
          <div className="relative">
            <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-all duration-200 ${
              password || passwordFocused ? 'text-gray-400' : 'text-gray-600 opacity-0'
            }`} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password (min. 6 characters)"
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
          
          {/* Confirm Password */}
          <div className="relative">
            <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-all duration-200 ${
              confirmPassword || confirmPasswordFocused ? 'text-gray-400' : 'text-gray-600 opacity-0'
            }`} />
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => setConfirmPasswordFocused(true)}
              onBlur={() => setConfirmPasswordFocused(false)}
              className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/10 border border-white/20 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none text-white"
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
            className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold py-3 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign Up"}
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