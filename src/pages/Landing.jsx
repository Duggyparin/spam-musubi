import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase/firebase'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'

const products = [
  {
    name: 'Classic Spam Musubi',
    description: 'Premium spam glazed with our signature teriyaki sauce, wrapped in seasoned rice and nori.',
    price: '₱30',
    image: '/musubi.png',
    tag: 'Best Discount',
    icon: '🍙',
    color: 'from-amber-400 to-orange-500',
    imageAlt: 'Classic Spam Musubi - Glazed teriyaki spam on seasoned rice wrapped with fresh nori seaweed'
  },
  {
    name: 'Katsubi',
    description: 'Crispy katsu-style musubi with tonkatsu sauce – a crunchy twist on the classic.',
    price: '₱35',
    image: '/katsubimusubi.jpg',
    tag: 'New',
    icon: '🍗',
    color: 'from-amber-500 to-orange-600',
    imageAlt: 'Katsubi - Crispy breaded chicken katsu musubi drizzled with sweet tonkatsu sauce'
  },
  {
    name: 'Kimchi Musubi',
    description: 'Spam musubi with a spicy kimchi twist — bold, tangy, and packed with flavor.',
    price: '₱40',
    image: '/ricebowl.jpg',
    tag: 'Best Seller',
    icon: '🌶️',
    color: 'from-red-400 to-orange-500',
    imageAlt: 'Kimchi Musubi - Savory spam paired with spicy fermented kimchi for a bold flavor explosion'
  },
  {
    name: 'Cheesy Musubi',
    description: 'Classic spam musubi topped with melted cheese for a rich and creamy bite.',
    price: '₱45',
    image: '/cheesymusubi.jpg', 
    tag: 'Fan Favorite',
    icon: '🧀',
    color: 'from-yellow-400 to-amber-500',
    imageAlt: 'Cheesy Musubi - Warm melted cheese stretching over teriyaki glazed spam and rice'
  },
  {
    name: 'Rice Bowl Musubi',
    description: 'Deconstructed musubi in a bowl – spam, kimchi, rice, egg, and nori flakes. Perfect for a hearty meal!',
    price: '₱50',
    image: '/kimchimusubi.jpg',
    tag: 'New',
    icon: '🍚',
    color: 'from-green-400 to-emerald-500',
    imageAlt: 'Rice Bowl Musubi - Deconstructed musubi bowl with spam chunks, kimchi, rice, egg, and nori flakes'
  }
]

const addons = [
  { name: 'Garlic Mayo', price: '+₱5', emoji: '🧄', description: 'Creamy garlic-infused mayonnaise' },
  { name: 'Japanese Mayo', price: '+₱5', emoji: '🍶', description: 'Smooth and tangy Japanese-style mayo' },
  { name: 'Chili Oil', price: '+₱5', emoji: '🌶️', description: 'Spicy chili-infused oil for heat lovers' },
  { name: 'Gochujang', price: '+₱5', emoji: '🔥', description: 'Sweet and spicy Korean red chili paste' },
  { name: 'Egg', price: '+₱5', emoji: '🍳', description: 'Steamed spam-egg mixture, thinly sliced' },
]

export default function Landing() {
  const navigate = useNavigate()
  const [isNavigating, setIsNavigating] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const [slotsLeft, setSlotsLeft] = useState(null)
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [topReview, setTopReview] = useState(null)
  const [loadingReview, setLoadingReview] = useState(true)

  useEffect(() => {
    const fetchSlotsLeft = async () => {
      setLoadingSlots(true)
      try {
        const stockSnap = await getDocs(collection(db, "productStock"))
        let total = 0
        stockSnap.forEach(doc => total += doc.data().stock || 0)
        setSlotsLeft(total)
      } catch (error) {
        console.error("Error fetching stock:", error)
        setSlotsLeft(null)
      } finally {
        setLoadingSlots(false)
      }
    }
    fetchSlotsLeft()
  }, [])

  useEffect(() => {
    const fetchTopReview = async () => {
      setLoadingReview(true)
      try {
        const q = query(collection(db, "reviews"), orderBy("rating", "desc"), limit(1))
        const snapshot = await getDocs(q)
        if (!snapshot.empty) {
          setTopReview(snapshot.docs[0].data())
        }
      } catch (error) {
        console.error("Error fetching review:", error)
      } finally {
        setLoadingReview(false)
      }
    }
    fetchTopReview()
  }, [])

  const handleReserveClick = () => {
    setFadeOut(true)
    setIsNavigating(true)
    setTimeout(() => {
      navigate('/login')
    }, 400)
  }

  const getBannerText = () => {
    if (loadingSlots) return "⏳ Checking availability..."
    if (slotsLeft === null) return "⚠️ Unable to load stock – please refresh."
    if (slotsLeft <= 0) return "😢 Sold out for tomorrow! Check back after midnight."
    if (slotsLeft <= 5) return `🔥 Only ${slotsLeft} musubi left for tomorrow! Reserve now! 🔥`
    return `⚡ Only ${slotsLeft} musubi available for tomorrow! Reserve while spots last. ⚡`
  }

  return (
    <div className={`min-h-screen bg-[#0a0a0a] text-white font-sans ${fadeOut ? 'fade-out' : ''}`}>

      <div className={`text-center py-2 text-sm font-medium transition-colors ${
        loadingSlots ? 'bg-gray-600' :
        slotsLeft === null ? 'bg-red-600' :
        slotsLeft <= 0 ? 'bg-red-700' :
        slotsLeft <= 5 ? 'bg-gradient-to-r from-red-600 to-orange-600' :
        'bg-gradient-to-r from-amber-600 to-orange-600'
      } text-white`}>
        {getBannerText()}
      </div>

      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/musubi.png"
            alt="Background pattern of Spam Musubi"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#0a0a0a]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2 text-sm text-white/80 mb-6">
            🎟️ Limited Slots – Reserve in Advance
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
            Spam
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              Musubi
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/70 max-w-xl mx-auto mb-8 leading-relaxed">
            Glazed teriyaki spam on seasoned rice – wrapped in nori. Made fresh daily for USTP.
          </p>

          <div className="flex flex-wrap justify-center gap-6 mb-10">
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <span className="text-amber-400">✅</span> 100% Fresh
            </div>
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <span className="text-amber-400">📍</span> Campus Pickup
            </div>
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <span className="text-amber-400">💰</span> No Hidden Fees
            </div>
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <span className="text-amber-400">⭐</span> 4.8 ★ (120+ reviews)
            </div>
          </div>

          <button
            onClick={handleReserveClick}
            disabled={isNavigating}
            className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold text-lg px-10 py-4 rounded-full hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {isNavigating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Redirecting...</span>
              </>
            ) : (
              <>
                <span>Start Your Reservation</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-1 transition-transform">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>

          <p className="mt-4 text-white/40 text-sm">
            Login with Gmail to reserve your order
          </p>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-white/50 rounded-full" />
          </div>
        </div>
      </section>

      <section className="py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-amber-400 text-sm font-semibold tracking-widest uppercase">About Us</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 mb-6">
            What is Spam Musubi?
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
            Spam Musubi is a popular Hawaiian snack — a slice of grilled spam on top of
            seasoned rice, wrapped together with nori. Our version is glazed with a
            homemade teriyaki sauce that makes it extra special.
            Perfect for students on a budget! 🍱
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
          {[
            { num: '₱30', label: 'Starting Price', icon: '💰' },
            { num: '100%', label: 'Homemade', icon: '🧑‍🍳' },
            { num: '🏫', label: 'Campus Pickup', icon: '📍' },
          ].map((stat, i) => (
            <div key={i} className="text-center p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-black text-amber-400">{stat.num}</div>
              <div className="text-white/50 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 px-6 bg-white/[0.02] border-y border-white/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-amber-400 text-sm font-semibold tracking-widest uppercase">How It Works</span>
            <h2 className="text-4xl md:text-5xl font-black mt-3">
              How to Reserve
            </h2>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent -translate-y-1/2" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              {[
                { step: '01', title: 'Login', desc: 'Sign in with your Gmail account.', icon: '🔐' },
                { step: '02', title: 'Choose', desc: 'Pick your musubi, sauce, and add-ons.', icon: '🍱' },
                { step: '03', title: 'Reserve', desc: 'Select your pickup time for tomorrow.', icon: '📅' },
                { step: '04', title: 'Pickup', desc: 'Get confirmation, then pick up on campus.', icon: '✅' },
              ].map((item, i) => (
                <div key={i} className="relative text-center group z-10">
                  <div className="bg-black/40 rounded-full w-20 h-20 mx-auto flex items-center justify-center text-4xl border border-amber-400/30 mb-4 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <div className="text-amber-400/30 text-6xl font-black absolute -top-2 right-0 leading-none md:right-auto md:left-1/2 md:-translate-x-1/2 md:top-0">{item.step}</div>
                  <h3 className="text-xl font-bold mb-2 mt-2">{item.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-amber-400 text-sm font-semibold tracking-widest uppercase">Our Menu</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3">
            Our Products
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto mt-4">
            Choose from our delicious selection of freshly made Spam Musubi varieties
          </p>
        </div>

        {products.map((product, i) => (
          <div key={i} className="flex flex-col md:flex-row gap-8 items-center bg-white/5 border border-white/10 rounded-3xl p-8 mb-6 hover:border-amber-400/30 transition-all duration-300 group">
            <div className="relative flex-shrink-0">
              <img 
                src={product.image} 
                alt={product.imageAlt}
                className="w-48 h-48 rounded-2xl object-cover shadow-xl group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/musubi.png';
                }}
              />
              <span className="absolute -top-3 -right-3 bg-amber-400 text-black text-xs font-bold px-3 py-1 rounded-full">
                {product.tag}
              </span>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-black mb-3">{product.name}</h3>
              <p className="text-white/60 mb-6 leading-relaxed">{product.description}</p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <div className="text-4xl font-black text-amber-400">{product.price}</div>
                <div className="text-white/40 text-sm flex items-center gap-1">
                  <span>📸</span>
                  <span>{product.imageAlt.split(' - ')[0]}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="mt-12">
          <h3 className="text-2xl font-black text-center mb-3">Available Add-ons</h3>
          <p className="text-center text-white/40 text-sm mb-8">
            Choose 1 sauce + optional egg — each add-on is only +₱5
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {addons.map((addon, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/30 transition-all duration-300 group">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{addon.emoji}</div>
                <div className="font-bold mb-1 text-sm">{addon.name}</div>
                <div className="text-amber-400 font-black">{addon.price}</div>
                <div className="text-white/30 text-xs mt-2 hidden md:block">{addon.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-white/[0.02] border-y border-white/10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-5xl mb-4">⭐</div>
          <h2 className="text-3xl md:text-4xl font-black mb-6">What Our Customers Say</h2>
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            {loadingReview ? (
              <p className="text-white/60">Loading real reviews...</p>
            ) : topReview ? (
              <>
                <div className="flex justify-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} className={`text-2xl ${star <= topReview.rating ? 'text-amber-400' : 'text-white/30'}`}>★</span>
                  ))}
                </div>
                <p className="text-white/80 text-lg italic mb-4">“{topReview.comment}”</p>
                <p className="text-amber-400 font-bold">— {topReview.name}</p>
              </>
            ) : (
              <p className="text-white/60">No reviews yet. Be the first to share your experience!</p>
            )}
          </div>
          <p className="text-white/40 text-sm mt-6">Join 120+ happy customers who've reserved their musubi!</p>
        </div>
      </section>

      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black mb-6">Ready to Order? 🍱</h2>
          <p className="text-white/60 mb-10 text-lg">
            Reserve your Spam Musubi today for tomorrow's pickup.
            Limited slots available daily!
          </p>
          <button
            onClick={handleReserveClick}
            disabled={isNavigating}
            className="group inline-flex items-center gap-3 bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold text-lg px-10 py-4 rounded-full hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {isNavigating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Redirecting...</span>
              </>
            ) : (
              <>
                <span>Reserve Now</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-1 transition-transform">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-white/40 text-sm">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-bold text-white/60">Spam Musubi</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-amber-400 transition-colors">Instagram</a>
            <a href="#" className="hover:text-amber-400 transition-colors">Facebook</a>
            <a href="#" className="hover:text-amber-400 transition-colors">Contact</a>
          </div>
          <div className="flex gap-6">
            <a href="/privacy" target="_blank" className="hover:text-amber-400 transition-colors">Privacy Policy</a>
            <a href="/terms" target="_blank" className="hover:text-amber-400 transition-colors">Terms of Service</a>
          </div>
          <span>© 2026 Spam Musubi. All rights reserved.</span>
        </div>
      </footer>

      <style>{`
        .fade-out {
          animation: fadeOut 0.4s ease forwards;
        }
        @keyframes fadeOut {
          to {
            opacity: 0;
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  )
}
