import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reservations, setReservations] = useState([])

  // Check auth state on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchReservations(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchReservations(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchReservations = async (userId) => {
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setReservations(data)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    })
    if (error) setError(error.message)
    else alert('Check your email for confirmation link!')
    setLoading(false)
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      },
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  // Show dashboard if logged in
  if (user) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="bg-amber-400/20 border-b border-amber-400/30 px-6 py-4">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🍱</span>
              <div>
                <h1 className="font-black text-amber-400">Nori-Knot</h1>
                <p className="text-white/40 text-xs">Reservation System</p>
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm hover:bg-red-500/30 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto px-6 py-10">
          {/* Welcome Card */}
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/30 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-amber-400/20 flex items-center justify-center text-3xl">
                {user.email?.[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black text-white">
                  Welcome, {user.email?.split('@')[0]}! 👋
                </h2>
                <p className="text-green-400 text-sm">✅ Google Sign-In works on mobile!</p>
                <p className="text-white/40 text-xs mt-1">User ID: {user.id.slice(0, 8)}...</p>
              </div>
            </div>
          </div>

          {/* Your Reservations */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-black text-amber-400 mb-4">📋 Your Reservations</h3>
            {reservations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/40">No reservations yet.</p>
                <p className="text-white/20 text-sm mt-2">Reservation form coming soon!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reservations.map(res => (
                  <div key={res.id} className="bg-white/5 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-bold">₱{res.total_price}</p>
                        <p className="text-white/40 text-sm">
                          {res.pickup_date} at {res.pickup_time}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        res.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        res.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                        res.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {res.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Login screen
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3 animate-bounce">🍱</div>
          <h1 className="text-3xl font-black text-white">Nori-Knot</h1>
          <p className="text-white/50 text-sm mt-2">Reserve your Spam Musubi</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-3 rounded-xl mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSignIn}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white placeholder-white/40 focus:border-amber-400 focus:outline-none"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white placeholder-white/40 focus:border-amber-400 focus:outline-none"
            required
          />
          
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-amber-400 text-black font-bold py-3 rounded-xl hover:bg-amber-300 transition-all disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="flex-1 bg-white/20 text-white font-bold py-3 rounded-xl hover:bg-white/30 transition-all disabled:opacity-50"
            >
              Sign Up
            </button>
          </div>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-black/40 px-2 text-white/50">OR</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-3 border border-white/20 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        <p className="text-white/30 text-xs text-center mt-6">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  )
}

export default App
