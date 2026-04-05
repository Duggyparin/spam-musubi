import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { auth } from "../firebase/firebase"
import { applyActionCode } from "firebase/auth"

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [status, setStatus] = useState("verifying")
  const [error, setError] = useState("")

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const mode = urlParams.get("mode")
    const oobCode = urlParams.get("oobCode")

    if (mode === "verifyEmail" && oobCode) {
      applyActionCode(auth, oobCode)
        .then(() => {
          setStatus("success")
          setTimeout(() => navigate("/login"), 3000)
        })
        .catch((err) => {
          console.error(err)
          setStatus("error")
          setError(err.message)
        })
    } else {
      setStatus("error")
      setError("Invalid verification link")
    }
  }, [navigate])

  if (status === "verifying") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Verifying your email...
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-black text-white mb-2">Email Verified!</h1>
          <p className="text-white/70 mb-4">You can now sign in to your account.</p>
          <button
            onClick={() => navigate("/login")}
            className="bg-amber-400 text-black px-6 py-2 rounded-lg font-bold"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-2xl font-black text-white mb-2">Verification Failed</h1>
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => navigate("/login")}
          className="bg-amber-400 text-black px-6 py-2 rounded-lg font-bold"
        >
          Back to Login
        </button>
      </div>
    </div>
  )
}