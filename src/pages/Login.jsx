import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink 
} from "firebase/auth";
import { auth } from "../firebase/firebase";
import { Mail, Loader2 } from "lucide-react";

const ADMIN_EMAIL = "monsanto.bryann@gmail.com";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [inAppBrowser, setInAppBrowser] = useState(false);

  // Detect in‑app browser
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isFacebook = ua.includes("FBAV") || ua.includes("FBAN");
    const isInstagram = ua.includes("Instagram");
    const isMessenger = ua.includes("Messenger");
    setInAppBrowser(isFacebook || isInstagram || isMessenger);
  }, []);

  // Handle the magic link when user returns to the app
  useEffect(() => {
    // Check if we have a sign-in email link in the URL
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let storedEmail = window.localStorage.getItem("emailForSignIn");
      if (!storedEmail) {
        // If email not stored, prompt user
        storedEmail = window.prompt("Please enter your email to complete sign in.");
      }
      if (storedEmail) {
        setLoading(true);
        signInWithEmailLink(auth, storedEmail, window.location.href)
          .then((result) => {
            window.localStorage.removeItem("emailForSignIn");
            const userEmail = result.user.email;
            if (userEmail === ADMIN_EMAIL) {
              window.location.replace("/admin-spammusubi");
            } else {
              window.location.replace("/dashboard");
            }
          })
          .catch((err) => {
            console.error(err);
            setError("Invalid or expired link. Please request a new one.");
            setLoading(false);
          });
      }
    }
  }, []);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      // Save email locally to complete sign-in later
      window.localStorage.setItem("emailForSignIn", email);
      setMessage(`✨ Magic link sent to ${email}! Check your inbox (and spam folder).`);
      setEmail("");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

        {error && <div className="text-red-400 text-sm text-center animate-pulse mb-4">{error}</div>}
        {message && <div className="text-green-400 text-sm text-center mb-4">{message}</div>}

        <form onSubmit={handleMagicLink} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none text-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold py-3 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "📧 Send Magic Link"}
          </button>
        </form>

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
  );
}