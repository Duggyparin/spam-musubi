import { useState } from "react"
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth"
import { auth } from "../firebase/firebase"
import { useNavigate } from "react-router-dom"

export default function Signup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Password strength validation
  const validatePassword = (pwd) => {
    const errors = []
    if (pwd.length < 8) errors.push("at least 8 characters")
    if (!/[A-Z]/.test(pwd)) errors.push("one uppercase letter")
    if (!/[a-z]/.test(pwd)) errors.push("one lowercase letter")
    if (!/[0-9]/.test(pwd)) errors.push("one number")
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) errors.push("one special character (!@#$%^&*)")
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    // Check password match
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }
    
    // Validate password strength
    const passwordErrors = validatePassword(password)
    if (passwordErrors.length > 0) {
      setError(`Password must contain: ${passwordErrors.join(", ")}`)
      setLoading(false)
      return
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await sendEmailVerification(userCredential.user)
      setSuccess(true)
    } catch (err) {
      console.error(err)
      if (err.code === "auth/email-already-in-use") {
        setError("Email already registered. Please sign in instead.")
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address")
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please choose a stronger password.")
      } else {
        setError(err.message)
      }
      setLoading(false)
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
          <p className="text-white/50 text-sm mb-6">
            Please check your inbox and click the verification link to complete your registration.
          </p>
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
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-amber-400 focus:outline-none text-white"
            required
          />
          
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-amber-400 focus:outline-none text-white pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-amber-400 focus:outline-none text-white pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
            >
              {showConfirmPassword ? "🙈" : "👁️"}
            </button>
          </div>
          
          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-400 text-black font-bold py-3 rounded-xl hover:bg-amber-300 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>
        
        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/login")}
            className="text-white/50 text-sm hover:text-amber-400"
          >
            Already have an account? Sign In →
          </button>
        </div>
      </div>
    </div>
  )
}