import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../firebase/firebase"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import BrowserRedirect from "../components/BrowserRedirect"

const ADMIN_EMAIL = "monsanto.bryann@gmail.com"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      // Check if email is verified
      if (!user.emailVerified) {
        setError("Please verify your email first. Check your inbox for the verification link.")
        setLoading(false)
        return
      }
      
      if (user.email === ADMIN_EMAIL) {
        navigate("/admin-spammusubi")
      } else {
        navigate("/dashboard")
      }
    } catch (err) {
      console.error(err)
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email. Please sign up first.")
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password")
      } else {
        setError(err.message)
      }
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0a0a0a]">
      <BrowserRedirect />
      <div className="absolute inset-0 z-0">
        <img src="/musubi.png" alt="Spam Musubi" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#0a0a0a]" />
      </div>
      <div className="relative z-10 max-w-md w-full mx-6">
        <div className="bg-[#111111]/95 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🍱</div>
            <h1 className="text-3xl font-black tracking-tight text-white">Welcome Back!</h1>
            <p className="text-white/50 mt-2 text-sm">Sign in to reserve your Delicious Spam Musubi</p>
          </div>
          
          <div className="border-t border-white/10 mb-6" />
          
          <form onSubmit={handleEmailLogin} className="space-y-4">
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
              placeholder="Password"
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
              className="w-full bg-amber-400 text-black font-bold py-3 rounded-xl hover:bg-amber-300 disabled:opacity-50 transition-all"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          
          <div className="text-center mt-4">
            <button
              onClick={() => navigate("/signup")}
              className="text-white/40 text-sm hover:text-amber-400 transition-all"
            >
              Don't have an account? Sign Up →
            </button>
          </div>
          
          <div className="mt-6 text-center text-white/30 text-xs">
            <p>Only USTP students and staff may order</p>
          </div>
        </div>
      </div>
    </div>
  )
}