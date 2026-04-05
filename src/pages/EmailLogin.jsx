import { useState } from "react"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "../firebase/firebase"
import { useNavigate } from "react-router-dom"

const ADMIN_EMAIL = "monsanto.bryann@gmail.com"

export default function EmailLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    try {
      let userCredential
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password)
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password)
      }
      const user = userCredential.user
      if (user.email === ADMIN_EMAIL) {
        navigate("/admin-spammusubi")
      } else {
        navigate("/dashboard")
      }
    } catch (err) {
      console.error(err)
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email")
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password")
      } else if (err.code === "auth/email-already-in-use") {
        setError("Email already registered")
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters")
      } else {
        setError(err.message)
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍱</div>
          <h1 className="text-3xl font-black text-white">{isSignUp ? "Create Account" : "Welcome Back"}</h1>
          <p className="text-white/50 mt-2 text-sm">
            {isSignUp ? "Sign up to start ordering" : "Sign in to continue"}
          </p>
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
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-amber-400 focus:outline-none text-white"
            required
          />
          
          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-400 text-black font-bold py-3 rounded-xl hover:bg-amber-300 disabled:opacity-50"
          >
            {loading ? "Please wait..." : (isSignUp ? "Sign Up" : "Sign In")}
          </button>
        </form>
        
        <div className="text-center mt-6">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-white/50 text-sm hover:text-amber-400"
          >
            {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
          </button>
        </div>
        
        <div className="text-center mt-4">
          <button
            onClick={() => window.location.href = "/login"}
            className="text-white/30 text-xs hover:text-white/50"
          >
            ← Try Google Sign In
          </button>
        </div>
      </div>
    </div>
  )
}