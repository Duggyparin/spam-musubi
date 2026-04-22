import { auth, db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { addDoc, collection, query, where, orderBy, getDocs, doc, getDoc, updateDoc, setDoc, writeBatch, serverTimestamp, onSnapshot } from "firebase/firestore";
import ConversationList from "../components/ConversationList";
import { getMessaging } from "firebase/messaging";
import { requestNotificationPermission, onMessageListener } from "../services/notification";
import PublicReviews from "../components/PublicReviews";
import NotificationCenter from "../components/NotificationCenter";


const ADMIN_EMAIL = "monsanto.bryann@gmail.com";
const ADMIN_UID = "xX2t8o5YOhXq1xXAzA8MxwUYE9D2";


// ----- PRODUCTS -----
const PRODUCTS = [
    { id: "classic", name: "Classic Spam Musubi", desc: "Premium spam glazed with our signature teriyaki sauce.", price: 30, tag: "Best Discount", image: "/musubi.png" },
    { id: "katsubi", name: "Katsubi",              desc: "Crispy katsu-style musubi with tonkatsu sauce.", price: 35, tag: "New", image: "/katsubimusubi.jpg" },
    { id: "kimchi",  name: "Kimchi Musubi",       desc: "Spam musubi with a spicy kimchi twist.", price: 40, tag: "Best Seller", image: "/ricebowl.jpg" },
    { id: "cheesy",  name: "Cheesy Musubi",        desc: "Classic spam musubi topped with melted cheese.", price: 45, tag: "Fan Favorite", image: "/cheesymusubi.jpg" },
    { id: "ricebowl", name: "🍚 Rice Bowl Musubi",  desc: "Deconstructed musubi in a bowl – spam,kimchi, rice, egg, and nori flakes.", price: 50, tag: "New", image: "/kimchimusubi.jpg" },
  ];

const SAUCES = [
  { value: "none",         label: "No sauce" },
  { value: "cheese sauce",   label: "🧄 Cheese Sauce" },
  { value: "japanesemayo", label: "🍶 Japanese Mayo" },
  { value: "gochujang",    label: "🔥 Gochujang" },
];

const DEPARTMENT_OPTIONS = [
  { value: "faculty", label: "👨‍🏫 Faculty" },
  { value: "admin", label: "📋 Admin Staff" },
  { value: "library", label: "📚 Library Staff" },
  { value: "security", label: "🛡️ Security" },
  { value: "maintenance", label: "🔧 Maintenance" },
  { value: "canteen", label: "🍽️ Canteen Staff" },
  { value: "guidance", label: "💬 Guidance Office" },
  { value: "registrar", label: "📝 Registrar" },
  { value: "it", label: "💻 IT Department" },
  { value: "others", label: "✨ Others" },
];

const generateTimeOptions = (slot) => {
  if (!slot) return [];
  const options = [];
  const startH = Math.floor(slot.start);
  const endH = Math.floor(slot.end);
  for (let h = startH; h <= endH; h++) {
    const minutes = h === endH ? [0] : [0, 15, 30, 45];
    for (let m of minutes) {
      if (h + m / 60 > slot.end) break;
      if (h + m / 60 < slot.start) continue;
      const period = h >= 12 ? "PM" : "AM";
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const displayM = m.toString().padStart(2, "0");
      options.push(`${displayH}:${displayM} ${period}`);
    }
  }
  return options;
};

// ----- STEP INDICATOR -----
const StepIndicator = ({ current, total, labels }) => (
  <div className="mb-8">
    <div className="flex items-center justify-between gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex-1">
          <div className={`h-1 rounded-full transition-all ${i + 1 <= current ? "bg-amber-400" : "bg-white/10"}`} />
          <p className={`text-[10px] mt-2 text-center hidden sm:block ${i + 1 <= current ? "text-amber-400" : "text-white/30"}`}>
            {labels[i]}
          </p>
        </div>
      ))}
    </div>
    <p className="text-white/40 text-xs text-center mt-4">Step {current} of {total}</p>
  </div>
);

// ----- TOAST -----
const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = "success", icon = "✅") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, icon }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));
  return { toasts, addToast, removeToast };
};

const Toast = ({ toasts, removeToast }) => (
  <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
    {toasts.map((t) => (
      <div key={t.id}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-bold max-w-xs ${
          t.type === "success" ? "bg-green-400/10 border-green-400/30 text-green-400" :
          t.type === "error"   ? "bg-red-400/10 border-red-400/30 text-red-400" :
          "bg-amber-400/10 border-amber-400/30 text-amber-400"
        }`}>
        <span>{t.icon}</span>
        <span>{t.message}</span>
        <button onClick={() => removeToast(t.id)} className="ml-auto opacity-50 hover:opacity-100">✕</button>
      </div>
    ))}
  </div>
);

// ----- ONBOARDING TOUR -----
const OnboardingTour = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const steps = [
    { target: ".step1-target", title: "🎓 Who Are You?", content: "First, tell us if you're a USTP student or staff member.", icon: "👤", color: "from-amber-400 to-orange-500" },
    { target: ".step2-target", title: "⏰ When to Pick Up?", content: "Choose a time window, then select your exact pickup time.", icon: "📅", color: "from-blue-400 to-cyan-500" },
    { target: ".step3-target", title: "🍱 Build Your Order", content: "Tap any musubi to customize it. Add sauce, egg, or adjust quantity.", icon: "🍽️", color: "from-green-400 to-emerald-500" },
    { target: ".step4-target", title: "✅ Confirm & Submit", content: "Review your order before placing it.", icon: "📋", color: "from-purple-400 to-pink-500" },
    { target: ".next-button", title: "🎉 Ready to Order!", content: "Click 'Next' to continue or 'Place Order' to submit.", icon: "🚀", color: "from-red-400 to-orange-500" },
  ];

  const nextStep = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else { setShowConfetti(true); setTimeout(onComplete, 1500); }
  };

  return (
    <>
      {showConfetti && (
        <div className="fixed inset-0 z-[300] pointer-events-none flex items-center justify-center">
          <div className="text-8xl animate-bounce">🎉✨🎊</div>
        </div>
      )}
      <div className="fixed inset-0 z-[200] pointer-events-none">
        <div className="absolute inset-0 bg-black/80 pointer-events-auto" />
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute ${steps[step].target} ring-4 ring-amber-400 ring-offset-2 ring-offset-black rounded-xl shadow-2xl animate-pulse`} style={{ transform: 'scale(1.02)' }} />
        </div>
        
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[201]">
          <div className="w-[90%] max-w-md bg-gradient-to-br from-[#111] to-[#1a1a1a] border-2 border-amber-400/50 rounded-2xl p-6 pointer-events-auto shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${steps[step].color} flex items-center justify-center text-2xl shadow-lg flex-shrink-0`}>
                {steps[step].icon}
              </div>
              <div>
                <h3 className="text-xl font-black text-amber-400">{steps[step].title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-white/40 text-xs">Step {step + 1} of {steps.length}</p>
                  <div className="flex gap-1">
                    {steps.map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-4 bg-amber-400" : "w-1.5 bg-white/30"}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-white/80 text-base mb-6 leading-relaxed">{steps[step].content}</p>
            
            <div className="flex justify-between items-center mt-2">
              <button 
                onClick={onSkip} 
                className="text-white/40 text-sm hover:text-white/60 transition-all px-4 py-2 rounded-lg hover:bg-white/5"
              >
                Skip tutorial
              </button>
              <button 
                onClick={nextStep} 
                className={`px-6 py-2.5 rounded-xl bg-gradient-to-r ${steps[step].color} text-black font-bold hover:scale-105 transition-all transform shadow-lg`}
              >
                {step < steps.length - 1 ? "Next →" : "Let's Go! 🎉"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .animate-pulse {
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(245, 158, 11, 0);
          }
        }
      `}</style>
    </>
  );
};

// ----- QR MODAL (with download PNG) -----
const QRModal = ({ onClose }) => {
  const qrContainerRef = useRef(null);
  const qrCanvasRef = useRef(null);
  const APP_URL = "https://spam-musubi.vercel.app";

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    script.onload = () => {
      if (qrContainerRef.current) {
        qrContainerRef.current.innerHTML = "";
        new window.QRCode(qrContainerRef.current, {
          text: APP_URL,
          width: 200,
          height: 200,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.H,
        });
        setTimeout(() => {
          const canvas = qrContainerRef.current.querySelector("canvas");
          if (canvas) qrCanvasRef.current = canvas;
        }, 100);
      }
    };
    document.head.appendChild(script);
    return () => document.head.removeChild(script);
  }, []);

  const downloadPNG = () => {
    if (qrCanvasRef.current) {
      const link = document.createElement("a");
      link.download = "spam-musubi-qr.png";
      link.href = qrCanvasRef.current.toDataURL();
      link.click();
    } else {
      alert("QR code not ready yet, please try again.");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(APP_URL);
    alert("Link copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-6">
      <div className="bg-[#111] border border-amber-400/30 rounded-2xl w-full max-w-sm p-6 text-center">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black text-amber-400">🍱 Share & Reserve</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
        </div>

        <div className="bg-white rounded-xl p-4 inline-block mb-4">
          <div ref={qrContainerRef} />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 mb-4">
          <p className="text-amber-400 text-sm font-mono">{APP_URL}</p>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={copyLink}
            className="flex-1 bg-amber-400/20 border border-amber-400/50 text-amber-400 py-2 rounded-lg text-sm font-medium hover:bg-amber-400/30 transition-all"
          >
            Copy Link
          </button>
          <button
            onClick={downloadPNG}
            className="flex-1 bg-amber-400/20 border border-amber-400/50 text-amber-400 py-2 rounded-lg text-sm font-medium hover:bg-amber-400/30 transition-all"
          >
            📸 Download PNG
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left">
          <p className="text-white/60 text-xs leading-relaxed">
            📸 <span className="text-white/80 font-bold">Save or share</span> the QR code above.<br/>
            Friends scan it with their camera → opens directly in Safari/Chrome → Google Sign‑In works perfectly.
          </p>
        </div>
        <p className="text-white/30 text-xs mt-4">
          Tip: scanning with camera bypasses Messenger/Instagram browser issues ✓
        </p>
      </div>
    </div>
  );
};

// ========== PROFILE MODAL ==========
const ProfileModal = ({ onClose, onProfileUpdate }) => {
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [formData, setFormData] = useState({ contactNumber: "", studentId: "", department: "", customDepartment: "" });
 
  const CLOUD_NAME = "dvbbusgra";
  const UPLOAD_PRESET = "spam_musubi_preset";

  const loadSavedFormData = () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    const saved = localStorage.getItem(`spamMusubi_user_${currentUser.uid}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const updateSavedFormData = (updates) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const saved = loadSavedFormData() || {};
    const newSaved = { ...saved, ...updates };
    localStorage.setItem(`spamMusubi_user_${currentUser.uid}`, JSON.stringify(newSaved));
  };

  const savedUserData = loadSavedFormData();
  const userType = savedUserData?.userType || userProfile?.userType || 'student';

  const fetchPendingOrders = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setLoadingPending(true);
    try {
      const q = query(
        collection(db, "reservations"),
        where("userId", "==", currentUser.uid),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      setPendingOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        let firestoreData = {};
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
          firestoreData = {
            contactNumber: userDoc.data().contactNumber || "",
            studentId: userDoc.data().studentId || "",
            department: userDoc.data().department || "",
            customDepartment: userDoc.data().customDepartment || "",
          };
        }
        const savedData = loadSavedFormData();

        const mergedData = {
          contactNumber: firestoreData.contactNumber || savedData?.contactNumber || "",
          studentId: firestoreData.studentId || savedData?.studentId || "",
          department: firestoreData.department || savedData?.department || "",
          customDepartment: firestoreData.customDepartment || savedData?.customDepartment || "",
        };

        setFormData(mergedData);

        const loyaltyRef = doc(db, "loyalty", currentUser.uid);
        const loyaltySnap = await getDoc(loyaltyRef);
        if (loyaltySnap.exists()) setLoyaltyData(loyaltySnap.data());
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchData();
    fetchPendingOrders();
    
    const interval = setInterval(fetchPendingOrders, 60000);
    return () => clearInterval(interval);
  }, []);

  const getOrderAge = (createdAt) => {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now - created;
    return diffMs / (1000 * 60 * 60);
  };

  const canCancelOrder = (order) => {
    if (order.status !== "pending") return false;
    const [year, month, day] = order.pickupDate.split("-").map(Number);
    const cutoff = new Date(year, month - 1, day, 12, 0, 0);
    return new Date() < cutoff;
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await updateDoc(doc(db, "reservations", orderId), { status: "cancelled" });
      fetchPendingOrders();
      alert("Order cancelled successfully.");
    } catch (error) {
      console.error("Cancel error:", error);
      alert("Failed to cancel order.");
    }
  };

  const openCloudinaryWidget = () => {
    const currentUser = auth.currentUser;
    if (!window.cloudinary) {
      alert("Cloudinary widget not loaded. Please refresh the page.");
      return;
    }
    setUploading(true);
    window.cloudinary.openUploadWidget(
      {
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        sources: ["local", "camera"],
        cropping: true,
        multiple: false,
        maxFileSize: 5000000,
      },
      async (error, result) => {
        setUploading(false);
        if (error) {
          console.error(error);
          alert("Upload failed.");
          return;
        }
        if (result && result.event === "success") {
          const imageUrl = result.info.secure_url;
          try {
            await setDoc(doc(db, "users", currentUser.uid), { avatarUrl: imageUrl }, { merge: true });
            setUserProfile(prev => ({ ...prev, avatarUrl: imageUrl }));
            if (onProfileUpdate) onProfileUpdate();
            alert("Avatar updated!");
          } catch (err) {
            console.error(err);
            alert("Failed to save avatar URL.");
          }
        }
      }
    );
  };

  const updateContactInfo = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const updateData = {
        contactNumber: formData.contactNumber,
      };
      if (userType === 'student') {
        updateData.studentId = formData.studentId;
      } else {
        updateData.department = formData.department;
        if (formData.department === 'others') {
          updateData.customDepartment = formData.customDepartment;
        }
      }
      await setDoc(doc(db, "users", currentUser.uid), updateData, { merge: true });

      const saved = loadSavedFormData() || {};
      const updatedSaved = { ...saved, ...updateData };
      localStorage.setItem(`spamMusubi_user_${currentUser.uid}`, JSON.stringify(updatedSaved));

      if (onProfileUpdate) onProfileUpdate();
      alert("Contact info saved!");
    } catch (error) {
      console.error("Update failed:", error);
      alert("Failed to update info.");
    }
  };

  const clearSavedData = () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      localStorage.removeItem(`spamMusubi_user_${currentUser.uid}`);
      alert("Saved form data cleared.");
    }
  };

  const signOut = async () => {
    await auth.signOut();
    window.location.href = "/login";  
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-6">
      <div className="bg-[#111] border border-amber-400/30 rounded-2xl w-full max-w-sm p-6 text-center max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black text-amber-400">👤 Profile</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex flex-col items-center mb-4">
          <div className="w-24 h-24 rounded-full bg-amber-400/20 flex items-center justify-center text-4xl overflow-hidden">
            {userProfile?.avatarUrl ? (
              <img src={userProfile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-amber-400">{auth.currentUser?.displayName?.[0] || "👤"}</span>
            )}
          </div>
          <button
            onClick={openCloudinaryWidget}
            disabled={uploading}
            className="mt-2 text-xs bg-amber-400/20 border border-amber-400/50 text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-400/30 transition-all"
          >
            {uploading ? "Uploading..." : "Change picture"}
          </button>
        </div>

        <div className="bg-white/5 rounded-xl p-3 mb-4 text-left">
          <p className="text-white/70 text-sm font-medium">Account</p>
          <p className="text-white text-sm">{auth.currentUser?.displayName || "User"}</p>
          <p className="text-white/40 text-xs">{auth.currentUser?.email}</p>
        </div>

        <div className="bg-white/5 rounded-xl p-3 mb-4 text-left">
          <p className="text-white/70 text-sm font-medium mb-2">Contact Info</p>
          <input
            type="text"
            placeholder="Contact Number"
            value={formData.contactNumber}
            onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
            className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white text-sm mb-2 focus:outline-none"
          />
          {userType === 'student' ? (
            <input
              type="text"
              placeholder="Student ID"
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white text-sm mb-2 focus:outline-none"
            />
          ) : (
            <>
              <select
                value={formData.department}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, department: val }));
                }}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white text-sm mb-2 focus:outline-none"
              >
                <option value="" disabled>Select your department</option>
                {DEPARTMENT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {formData.department === 'others' && (
                <input
                  type="text"
                  placeholder="Please specify"
                  value={formData.customDepartment}
                  onChange={(e) => setFormData({ ...formData, customDepartment: e.target.value })}
                  className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white text-sm mb-2 focus:outline-none"
                />
              )}
            </>
          )}
          <button onClick={updateContactInfo} className="w-full bg-amber-400/20 text-amber-400 py-1 rounded text-sm">Save</button>
        </div>

        {loyaltyData && (
          <div className="bg-white/5 rounded-xl p-3 mb-4 text-left">
            <p className="text-white/70 text-sm font-medium mb-1">⭐ Loyalty</p>
            <div className="flex justify-between text-xs"><span className="text-white/60">Total Musubi</span><span className="text-amber-400">{loyaltyData.totalPurchased || 0}</span></div>
            <div className="flex justify-between text-xs"><span className="text-white/60">Rewards Earned</span><span className="text-green-400">{loyaltyData.rewardsEarned || 0}</span></div>
            <div className="flex justify-between text-xs"><span className="text-white/60">Available</span><span className="text-amber-400">{(loyaltyData.rewardsEarned || 0) - (loyaltyData.rewardsRedeemed || 0)}</span></div>
          </div>
        )}

        <div className="bg-white/5 rounded-xl p-3 mb-4 text-left">
          <div className="flex justify-between items-center mb-2">
            <p className="text-white/70 text-sm font-medium">⏳ Pending Orders</p>
            <button onClick={fetchPendingOrders} className="text-xs text-amber-400 hover:text-amber-300">🔄 Refresh</button>
          </div>
          {loadingPending ? (
            <p className="text-white/40 text-xs">Loading...</p>
          ) : pendingOrders.length === 0 ? (
            <p className="text-white/40 text-xs">No pending orders.</p>
          ) : (
            <div className="space-y-2">
              {pendingOrders.map(order => {
                const age = getOrderAge(order.createdAt);
                const isExpired = age > 22;
                const canCancel = canCancelOrder(order);
                return (
                  <div key={order.id} className={`border-b border-white/10 pb-2 transition-opacity ${isExpired ? 'opacity-40' : 'opacity-100'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-white/80 text-xs">{order.pickupDate} • {order.pickupSlot}</p>
                        <p className="text-white/60 text-xs mt-0.5">
                          {order.items?.map(i => `${i.productName} x${i.quantity}`).join(', ') || `Classic x${order.quantity}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-amber-400 text-xs font-bold">₱{order.totalPrice}</p>
                        {canCancel && (
                          <button
                            onClick={() => cancelOrder(order.id)}
                            className="mt-1 text-xs bg-red-400/20 text-red-400 px-2 py-0.5 rounded hover:bg-red-400/30 transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <p className="text-white/30 text-[10px]">
                        {isExpired ? '⏳ Expired (over 22h)' : `⌛ ${Math.round(age)} hours ago`}
                      </p>
                      {!isExpired && !canCancel && order.status === "pending" && (
                        <span className="text-amber-400/70 text-[10px]">cannot cancel after 12PM on pickup day</span>
                      )}
                      {!isExpired && canCancel && (
                        <span className="text-green-400/70 text-[10px]">cancel available until 12PM</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button onClick={clearSavedData} className="w-full bg-red-400/10 border border-red-400/30 text-red-400 py-2 rounded-lg text-sm font-medium hover:bg-red-400/20 transition-all mb-2">Clear Saved Info</button>
        <button onClick={signOut} className="w-full bg-white/10 text-white py-2 rounded-lg text-sm font-medium hover:bg-white/20 transition-all">Sign Out</button>
        <p className="text-white/20 text-xs mt-4">v1.0.0 • Spam Musubi</p>
      </div>
    </div>
  );
};

// ========== ORDER CONFIRMATION DIALOG ==========
const ConfirmationDialog = ({ isOpen, onClose, onConfirm, orderDetails }) => {
  if (!isOpen) return null;
  
  const total = orderDetails?.total || orderDetails?.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
  
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-amber-400/30 rounded-2xl w-full max-w-md p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🍱</div>
          <h2 className="text-xl font-black text-amber-400 mb-3">Confirm Your Order</h2>
          <p className="text-white/70 mb-4">Are you sure you want to place this order?</p>
          
          <div className="bg-white/5 rounded-xl p-4 mb-6 text-left max-h-60 overflow-y-auto">
            <p className="text-white/60 text-sm mb-2">Order Summary:</p>
            {orderDetails?.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between text-white text-sm mt-1">
                <span>{item.productName} x{item.quantity}</span>
                <span className="text-amber-400">₱{item.price * item.quantity}</span>
              </div>
            ))}
            <div className="border-t border-white/10 mt-2 pt-2 flex justify-between font-bold">
              <span className="text-white">Total</span>
              <span className="text-amber-400">₱{total}</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 bg-white/10 text-white font-bold py-2 rounded-xl hover:bg-white/20 transition-all">
              No, Cancel
            </button>
            <button onClick={onConfirm} className="flex-1 bg-amber-400 text-black font-bold py-2 rounded-xl hover:bg-amber-300 transition-all">
              Yes, Place Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ========== NOTIFICATION GUIDE COMPONENT ==========
const NotificationGuide = () => {
  const [showGuide, setShowGuide] = useState(false);
  const [browser, setBrowser] = useState('chrome');

  useEffect(() => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Firefox')) setBrowser('firefox');
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) setBrowser('safari');
    else if (userAgent.includes('Edg')) setBrowser('edge');
    else setBrowser('chrome');
  }, []);

  const getNotificationLink = () => {
    if (browser === 'chrome' || browser === 'edge') {
      return `chrome://settings/content/siteDetails?site=${encodeURIComponent(window.location.origin)}`;
    }
    return null;
  };

  if (Notification.permission === 'granted') return null;

  return (
    <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔔</span>
        <div className="flex-1">
          <p className="text-yellow-400 font-bold text-sm">Get instant notifications!</p>
          <p className="text-white/60 text-xs mt-1">
            Enable notifications to receive messages from the owner instantly.
          </p>
          <button
            onClick={() => setShowGuide(true)}
            className="text-amber-400 text-xs underline mt-2"
          >
            Enable notifications →
          </button>
        </div>
      </div>

      {showGuide && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-yellow-400/30 rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-amber-400">🔔 Enable Notifications</h3>
              <button onClick={() => setShowGuide(false)} className="text-white/40 text-xl">✕</button>
            </div>

            {browser === 'chrome' && (
              <>
                <p className="text-white/70 text-sm mb-4">Click the button below to open Chrome settings:</p>
                <a
                  href={getNotificationLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-amber-400 text-black text-center font-bold py-3 rounded-xl mb-4 hover:bg-amber-300"
                >
                  Open Notification Settings →
                </a>
                <p className="text-white/50 text-xs">Then find "spam-musubi.vercel.app" and change to "Allow".</p>
              </>
            )}

            {browser === 'firefox' && (
              <div className="space-y-3">
                <p className="text-white/60 text-sm">Follow these steps:</p>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white font-bold text-sm">Step 1:</p>
                  <p className="text-white/60 text-xs">Click the lock icon 🔒 in the address bar</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white font-bold text-sm">Step 2:</p>
                  <p className="text-white/60 text-xs">Click "Connection Secure" → "More Information"</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white font-bold text-sm">Step 3:</p>
                  <p className="text-white/60 text-xs">Go to "Permissions" → Find "Notifications" → Set to "Allow"</p>
                </div>
                <button onClick={() => window.location.reload()} className="w-full bg-amber-400 text-black font-bold py-2 rounded-xl mt-2">I've enabled it, refresh →</button>
              </div>
            )}

            {browser === 'safari' && (
              <div className="space-y-3">
                <p className="text-white/60 text-sm">Follow these steps:</p>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white font-bold text-sm">Step 1:</p>
                  <p className="text-white/60 text-xs">Click "Safari" in the menu bar → "Settings"</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white font-bold text-sm">Step 2:</p>
                  <p className="text-white/60 text-xs">Click "Websites" → "Notifications"</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white font-bold text-sm">Step 3:</p>
                  <p className="text-white/60 text-xs">Find "spam-musubi.vercel.app" and set to "Allow"</p>
                </div>
                <button onClick={() => window.location.reload()} className="w-full bg-amber-400 text-black font-bold py-2 rounded-xl mt-2">I've enabled it, refresh →</button>
              </div>
            )}

            <button
              onClick={() => {
                if (Notification.permission !== 'denied') {
                  Notification.requestPermission().then(() => window.location.reload());
                }
              }}
              className="w-full bg-white/10 text-white py-2 rounded-xl mt-3 text-sm"
            >
              Try requesting permission again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ========== MAIN DASHBOARD COMPONENT ==========
export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentItem, setCurrentItem] = useState({ sauce: "none", egg: false, quantity: 1 });
  const [popularProducts, setPopularProducts] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCustomDepartment, setShowCustomDepartment] = useState(false);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [isStockLimit, setIsStockLimit] = useState(false);
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [redeemingReward, setRedeemingReward] = useState(false);
  const [form, setForm] = useState({
    userType: "student",
    fullName: "",
    studentId: "",
    department: "",
    customDepartment: "",
    contactNumber: "",
    pickupSlot: "",
    pickupTime: "",
  });
  const [errors, setErrors] = useState({});
  const [showQR, setShowQR] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processingPayment, setProcessingPayment] = useState(false);
  const stepContainerRef = useRef(null);
  const { toasts, addToast, removeToast } = useToast();
  const [showChatList, setShowChatList] = useState(false);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState(null);
  const [productStock, setProductStock] = useState({});
  const [stockLoading, setStockLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState(null);
  const [gcashAvailable, setGcashAvailable] = useState(false);
  
  // State for pending orders on main dashboard
  const [pendingOrdersMain, setPendingOrdersMain] = useState([]);
  const [loadingPendingMain, setLoadingPendingMain] = useState(false);
  const [openChatUserId, setOpenChatUserId] = useState(null);

  const [unreadCustomerCount, setUnreadCustomerCount] = useState(0);


  
  const scrollToForm = () => {
    if (stepContainerRef.current) {
      stepContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Online/offline presence for customer
 useEffect(() => {
    if (!user) return;
    const userStatusRef = doc(db, "users", user.uid);
    
    // Set online when dashboard loads
    setDoc(userStatusRef, { 
      online: true, 
      lastSeen: new Date().toISOString() 
   }, { merge: true });
    
    // Set offline when page closes or refreshes
    const handleBeforeUnload = () => {
     setDoc(userStatusRef, { 
        online: false, 
       lastSeen: new Date().toISOString() 
      }, { merge: true });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    // Clean up when component unmounts
    return () => {
      setDoc(userStatusRef, { 
       online: false, 
       lastSeen: new Date().toISOString() 
      }, { merge: true });
     window.removeEventListener("beforeunload", handleBeforeUnload);
   };
  }, [user]);

  const refreshUserProfile = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) setUserProfile(userDoc.data());
    } catch (err) {
      console.error("Error refreshing profile:", err);
    }
  };

  const markAllAdminMessagesAsRead = async () => {
  if (!user || user.email === "monsanto.bryann@gmail.com") return;
  try {
    // Optimistic update: clear badge immediately
    setUnreadCustomerCount(0);

    const metaRef = collection(db, "conversations_meta");
    const q = query(metaRef, where("participants", "array-contains", user.uid));
    const metaSnap = await getDocs(q);
    for (const metaDoc of metaSnap.docs) {
      const convId = metaDoc.id;
      const messagesRef = collection(db, "conversations", convId, "messages");
      const unreadQuery = query(messagesRef, where("sender", "==", "admin"), where("read", "==", false));
      const unreadSnap = await getDocs(unreadQuery);
      if (unreadSnap.empty) continue;
      const batch = writeBatch(db);
      unreadSnap.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });
      await batch.commit();
    }
  } catch (error) {
    console.error("Error marking messages as read:", error);
    // Revert optimistic update by re-fetching the actual unread count
    const metaRef2 = collection(db, "conversations_meta");
    const q2 = query(metaRef2, where("participants", "array-contains", user.uid));
    const metaSnap2 = await getDocs(q2);
    let total = 0;
    for (const metaDoc of metaSnap2.docs) {
      const convId = metaDoc.id;
      const messagesRef = collection(db, "conversations", convId, "messages");
      const msgQuery = query(messagesRef, where("read", "==", false), where("sender", "==", "admin"));
      const msgSnap = await getDocs(msgQuery);
      total += msgSnap.size;
    }
    setUnreadCustomerCount(total);
  }
};

  const saveFormData = () => {
    if (!user) return;
    const dataToSave = {
      userType: form.userType,
      fullName: form.fullName,
      studentId: form.studentId,
      department: form.department,
      customDepartment: form.customDepartment,
      contactNumber: form.contactNumber,
    };
    localStorage.setItem(`spamMusubi_user_${user.uid}`, JSON.stringify(dataToSave));
  };

  const loadSavedFormData = () => {
    if (!user) return null;
    const saved = localStorage.getItem(`spamMusubi_user_${user.uid}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const applySavedData = (savedData) => {
    setForm(prev => ({
      ...prev,
      ...savedData,
      department: savedData.department || '',
      customDepartment: savedData.customDepartment || '',
    }));
    if (savedData.department === 'others') {
      setShowCustomDepartment(true);
    }
    addToast("Previous info loaded!", "success", "📋");
  };

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("spamMusubiTutorial");
    if (!hasSeenTutorial) setShowOnboarding(true);
  }, []);

  useEffect(() => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    setUser(currentUser);
    const loadUserData = async () => {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) setUserProfile(userDoc.data());
      
      const saved = loadSavedFormData();
      if (saved) {
        setForm(prev => ({
          ...prev,
          fullName: currentUser.displayName || saved.fullName || "",
          ...saved,
        }));
        if (saved.department === 'others') setShowCustomDepartment(true);
      } else {
        setForm(prev => ({ ...prev, fullName: currentUser.displayName || "" }));
      }
    };
    loadUserData();
  }
  // No else – no redirect. The route is already protected by App.jsx.
}, []);

  useEffect(() => {
    const fetchSoldOutStatus = async () => {
      try {
        const docRef = doc(db, "settings", "soldOut");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setIsSoldOut(docSnap.data().isSoldOut);
        }
      } catch (error) {
        console.error("Error fetching sold out status:", error);
      }
    };
    fetchSoldOutStatus();
  }, []);

  useEffect(() => {
    const fetchStockLimitStatus = async () => {
      try {
        const docRef = doc(db, "settings", "stockLimit");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setIsStockLimit(docSnap.data().isStockLimit);
        }
      } catch (error) {
        console.error("Error fetching stock limit status:", error);
      }
    };
    fetchStockLimitStatus();
  }, []);
  
// Auto-create conversation with admin when customer loads dashboard
useEffect(() => {
  if (!user || user.email === ADMIN_EMAIL) return; // Only for customers
  
  const createConversation = async () => {
    try {
      const adminUid = "xX2t8o5YOhXq1xXAzA8MxwUYE9D2"; // Your admin UID
      const conversationId = [user.uid, adminUid].sort().join('_');
      const metaRef = doc(db, "conversations_meta", conversationId);
      const metaSnap = await getDoc(metaRef);
      
      if (!metaSnap.exists()) {
        await setDoc(metaRef, {
          participants: [user.uid, adminUid],
          lastMessage: "",
          lastUpdated: serverTimestamp(),
        });
        console.log("✅ Auto-created conversation for customer:", user.email);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };
  
  createConversation();
}, [user]);




  useEffect(() => {
    const fetchLoyaltyData = async () => {
      if (!user) return;
      try {
        const loyaltyRef = doc(db, "loyalty", user.uid);
        const loyaltySnap = await getDoc(loyaltyRef);
        if (loyaltySnap.exists()) {
          setLoyaltyData(loyaltySnap.data());
        } else {
          setLoyaltyData({ totalPurchased: 0, rewardsEarned: 0, rewardsRedeemed: 0 });
        }
      } catch (error) {
        console.error("Error fetching loyalty:", error);
        setLoyaltyData({ totalPurchased: 0, rewardsEarned: 0, rewardsRedeemed: 0 });
      }
    };
    fetchLoyaltyData();
  }, [user]);

  useEffect(() => {
    const fetchPopularProducts = async () => {
      try {
        const res = await fetch(`/api/analytics?secret=mySecret123`);
        const data = await res.json();
        if (data.popularProducts) setPopularProducts(data.popularProducts);
      } catch (error) { console.error('Failed to fetch popular products:', error); }
    };
    fetchPopularProducts();
  }, []);

  // ----- FETCH PRODUCT STOCK (with auto‑create) -----
useEffect(() => {
  const fetchStock = async () => {
    try {
      setStockLoading(true);
      const stockRef = collection(db, "productStock");
      const snapshot = await getDocs(stockRef);
      
      if (snapshot.empty) {
        console.log("No stock documents found. Creating default stock...");
        // Create default stock for each product
        for (const product of PRODUCTS) {
          const stockDoc = doc(db, "productStock", product.id);
          await setDoc(stockDoc, { stock: 50 }, { merge: true });
        }
        // Refetch after creating
        const newSnapshot = await getDocs(stockRef);
        const stockData = {};
        newSnapshot.forEach(doc => {
          stockData[doc.id] = doc.data().stock || 0;
        });
        setProductStock(stockData);
      } else {
        const stockData = {};
        snapshot.forEach(doc => {
          stockData[doc.id] = doc.data().stock || 0;
        });
        setProductStock(stockData);
      }
    } catch (error) {
      console.error("Error fetching stock:", error);
      addToast("Unable to load stock. Please refresh the page.", "error", "⚠️");
    } finally {
      setStockLoading(false);
    }
  };
  fetchStock();
}, []);

  // ----- FETCH COMPLETED ORDERS FOR REVIEW AND PENDING ORDERS FOR MAIN DASHBOARD -----
  const fetchCompletedOrders = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "reservations"),
        where("userId", "==", user.uid),
        where("status", "==", "completed")
      );
      const snapshot = await getDocs(q);
      setCompletedOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching completed orders:", error);
    }
  };

  const fetchPendingOrdersMain = async () => {
    if (!user) return;
    setLoadingPendingMain(true);
    try {
      const q = query(
        collection(db, "reservations"),
        where("userId", "==", user.uid),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      setPendingOrdersMain(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching pending orders:", err);
    } finally {
      setLoadingPendingMain(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchCompletedOrders();
    fetchPendingOrdersMain();
    
    const intervalCompleted = setInterval(fetchCompletedOrders, 60000);
    const intervalPending = setInterval(fetchPendingOrdersMain, 60000);
    return () => {
      clearInterval(intervalCompleted);
      clearInterval(intervalPending);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    const initNotifications = async () => {
      try {
        await requestNotificationPermission();
        onMessageListener().then((payload) => {
          console.log("Foreground message:", payload);
          addToast(payload.notification.body, "info", "🔔");
        });
      } catch (error) {
        console.error("Notification init error:", error);
      }
    };
    
    initNotifications();
  }, [user]);

  // Unread message count for customer badge
useEffect(() => {
  if (!user || user.email === "monsanto.bryann@gmail.com") return; // admin doesn't need this badge
  const metaRef = collection(db, "conversations_meta");
  const q = query(metaRef, where("participants", "array-contains", user.uid));
  const unsubscribe = onSnapshot(q, async (snapshot) => {
    let total = 0;
    for (const metaDoc of snapshot.docs) {
      const convId = metaDoc.id;
      const messagesRef = collection(db, "conversations", convId, "messages");
      const msgQuery = query(messagesRef, where("read", "==", false), where("sender", "==", "admin"));
      const msgSnap = await getDocs(msgQuery);
      total += msgSnap.size;
    }
    setUnreadCustomerCount(total);
  });
  return () => unsubscribe();
}, [user]);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().split("T")[0];
  const dayOfWeek = tomorrow.toLocaleDateString("en-US", { weekday: "long" });
  const tomorrowDisplay = tomorrow.toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const getTimeSlots = () => {
    switch (dayOfWeek) {
      case "Monday":    return [{ label: "🌅 Morning", range: "8:00 AM – 1:00 PM", start: 8, end: 13 }, { label: "🌇 Afternoon", range: "2:30 PM – 3:45 PM", start: 14.5, end: 15.75 }];
      case "Tuesday":   return [{ label: "🌅 Morning", range: "8:00 AM – 12:00 PM", start: 8, end: 12 }, { label: "🌇 Afternoon", range: "3:00 PM – 3:45 PM", start: 15, end: 15.75 }];
      case "Wednesday": return [{ label: "🌇 Afternoon", range: "1:00 PM – 6:00 PM", start: 13, end: 18 }];
      case "Thursday":  return [{ label: "🌅 Morning", range: "8:00 AM – 9:00 AM", start: 8, end: 9 }, { label: "🌇 Afternoon", range: "2:30 PM – 6:30 PM", start: 14.5, end: 18.5 }];
      case "Friday":    return [{ label: "🌅 Morning", range: "8:00 AM – 12:00 PM", start: 8, end: 12 }, { label: "🌇 Afternoon", range: "12:00 PM – 7:00 PM", start: 12, end: 19 }];
      case "Saturday":  return [{ label: "🌇 Afternoon", range: "1:00 PM – 6:00 PM", start: 13, end: 18 }];
      default:          return [];
    }
  };

  const timeSlots = getTimeSlots();
  const isClosed = timeSlots.length === 0;
  const selectedSlot = timeSlots.find(s => s.label === form.pickupSlot);
  const timeOptions = generateTimeOptions(selectedSlot);

  const calcItemTotal = (item) => {
    if (item.isFree) return 0;
    const product = PRODUCTS.find(p => p.id === item.productId);
    const base = product?.price || 0;
    const sauce = item.sauce !== "none" ? 5: 0;
    const egg = item.egg ? 5: 0;
    return (base + sauce + egg) * item.quantity;
  };

  const grandTotal = orderItems.reduce((sum, item) => sum + calcItemTotal(item), 0);

  const calculateServiceFee = (total) => {
    if (paymentMethod !== 'gcash') return 0;
    return total <= 100 ? 5 : 10;
  };
  const finalTotal = grandTotal + calculateServiceFee(grandTotal);

  const getProgress = () => {
    if (!loyaltyData) return { purchased: 0, remaining: 10, progressPercent: 0 };
    const purchased = loyaltyData.totalPurchased % 10;
    const remaining = 10 - purchased;
    const progressPercent = (purchased / 10) * 100;
    return { purchased, remaining, progressPercent };
  };

  const hasAvailableReward = () => {
    if (!loyaltyData) return false;
    return (loyaltyData.rewardsEarned - (loyaltyData.rewardsRedeemed || 0)) > 0;
  };

  const handleRedeemReward = () => {
    if (!hasAvailableReward()) {
      addToast("No free musubi available yet!", "info", "🎁");
      return;
    }
    setRedeemingReward(true);
  };

  const handleAddFreeItem = async (product) => {
    const freeItem = {
      id: Date.now(),
      productId: product.id,
      productName: product.name,
      productPrice: 0,
      sauce: "none",
      egg: false,
      quantity: 1,
      isFree: true
    };
    setOrderItems([...orderItems, freeItem]);
    setRedeemingReward(false);
    addToast(`🎉 ${product.name} added to your order for FREE!`, "success", "🎁");
    
    try {
      const loyaltyRef = doc(db, "loyalty", user.uid);
      await updateDoc(loyaltyRef, {
        rewardsRedeemed: (loyaltyData.rewardsRedeemed || 0) + 1,
        lastRedeemed: new Date().toISOString()
      });
      setLoyaltyData({
        ...loyaltyData,
        rewardsRedeemed: (loyaltyData.rewardsRedeemed || 0) + 1
      });
    } catch (error) {
      console.error("Error updating loyalty:", error);
    }
  };

  const handleAddToOrder = () => {
    if (!selectedProduct) return;
    const newItem = {
      id: Date.now(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productPrice: selectedProduct.price,
      sauce: currentItem.sauce,
      egg: currentItem.egg,
      quantity: currentItem.quantity,
      isFree: false
    };
    setOrderItems([...orderItems, newItem]);
    setSelectedProduct(null);
    setCurrentItem({ sauce: "none", egg: false, quantity: 1 });
  };

  const removeItem = (id) => setOrderItems(orderItems.filter(item => item.id !== id));

  const validateStep1 = () => {
    const newErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = "Full name is required";
    if (form.userType === "student") {
      if (!form.studentId) newErrors.studentId = "Student ID is required";
      else if (!/^\d{10}$/.test(form.studentId)) newErrors.studentId = "Must be exactly 10 digits";
      else {
        const year = parseInt(form.studentId.substring(0, 4));
        if (year < 2018 || year > 2026) newErrors.studentId = "First 4 digits must be a valid year (2018–2026)";
      }
    } else {
      if (!form.department) newErrors.department = "Please select a department/role";
      else if (form.department === "others" && !form.customDepartment.trim()) newErrors.customDepartment = "Please enter your department/role";
    }
    if (!form.contactNumber) newErrors.contactNumber = "Contact number is required";
    else if (!/^09\d{9}$/.test(form.contactNumber)) newErrors.contactNumber = "Must be 11 digits starting with 09";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const cancelOrderMain = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await updateDoc(doc(db, "reservations", orderId), { status: "cancelled" });
      fetchPendingOrdersMain();
      addToast("Order cancelled successfully.", "success", "✅");
    } catch (error) {
      console.error("Cancel error:", error);
      addToast("Failed to cancel order.", "error", "❌");
    }
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!form.pickupSlot) newErrors.pickupSlot = "Please select a time window";
    if (!form.pickupTime) newErrors.pickupTime = "Please select your preferred pickup time";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (orderItems.length === 0) newErrors.order = "Please add at least one product";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) setStep(4);
  };

  const handleBack = () => { if (step > 1) setStep(step - 1); };

  const handleSubmit = () => {
    if (!validateStep3()) return;
    
    const orderSummary = {
      items: orderItems.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        price: calcItemTotal(item) / item.quantity
      })),
      total: finalTotal
    };
    
    setPendingOrderData(orderSummary);
    setShowConfirmDialog(true);
  };

  const submitOrder = async () => {
    setShowConfirmDialog(false);
    setLoading(true);
    try {
      let finalDepartment = form.department;
      if (form.department === "others") finalDepartment = form.customDepartment;

      const orderData = {
        userId: user.uid, userEmail: user.email, userName: user.displayName,
        fullName: form.fullName, userType: form.userType,
        studentId: form.userType === "student" ? form.studentId : null,
        department: form.userType === "staff" ? finalDepartment : null,
        contactNumber: form.contactNumber,
        items: orderItems.map(({ id, ...rest }) => rest),
        totalPrice: grandTotal,
        finalTotal: finalTotal,
        pickupDate: tomorrowDate,
        pickupSlot: form.pickupSlot, pickupTime: form.pickupTime,
        status: "pending",
        paymentMethod,
        paymentStatus: paymentMethod === 'cash' ? 'pending_cash' : 'pending_payment',
        createdAt: new Date().toISOString(),
      };

      

      const docRef = await addDoc(collection(db, "reservations"), orderData);
      const orderId = docRef.id;

      // Create notification for customer (move it here)
await addDoc(collection(db, "notifications"), {
  userId: user.uid,
  message: "🍱 Your order has been placed. Please wait for admin confirmation.",
  read: false,
  createdAt: serverTimestamp(),
  type: "order_placed",
  orderId: orderId,
})


  
      if (paymentMethod === 'gcash') {
        if (!gcashAvailable) {
          addToast("💳 GCash is temporarily unavailable. Please select Cash on Pickup.", "error", "⚠️");
          setLoading(false);
          setProcessingPayment(false);
          return;
        }
        
        setProcessingPayment(true);
        const response = await fetch('/api/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: finalTotal,
            orderId: orderId,
            description: `Spam Musubi Order #${orderId}`,
          }),
        });
        const data = await response.json();
        if (response.ok) {
          window.location.href = data.checkoutUrl;
        } else {
          throw new Error(data.error || 'Payment creation failed');
        }
      } else {
        saveFormData();
        await setDoc(doc(db, "users", user.uid), {
          fullName: form.fullName, 
          contactNumber: form.contactNumber,
          studentId: form.userType === "student" ? form.studentId : null,
          department: form.userType === "staff" ? finalDepartment : null,
        }, { merge: true });
        refreshUserProfile();
        addToast("Reservation submitted! We'll notify you by email. 🍱", "success", "🎉");
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Error:", error);
      addToast("Something went wrong. Please try again.", "error", "❌");
    } finally {
      setLoading(false);
      setProcessingPayment(false);
    }
  };

  if (!user) return <div className="text-white p-8">Loading...</div>;

  if (submitted) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center bg-black/60 border border-amber-400/30 rounded-3xl p-10">
        <div className="text-7xl mb-6 animate-bounce">🎉</div>
        <h2 className="text-3xl font-black text-amber-400 mb-3">You're all set!</h2>
        <p className="text-white/70 mb-2">Your reservation has been received!</p>
        <p className="text-white/50 text-sm mb-8">Wait for the business owner's confirmation.<br />We will do our best to accommodate your order. 🍱</p>
        <div className="bg-amber-400/5 border border-amber-400/20 rounded-2xl p-5 text-left mb-6">
          <p className="text-xs text-amber-400 mb-3 font-semibold">Reservation Summary</p>
          <div className="flex items-center gap-2 text-sm mb-2 text-white"><span>📅</span><span>{tomorrowDisplay}</span></div>
          <div className="flex items-center gap-2 text-sm mb-2 text-white"><span>⏰</span><span>{form.pickupSlot} — {form.pickupTime}</span></div>
          <div className="border-t border-white/10 pt-2 mt-2">
            {orderItems.map(item => (
              <div key={item.id} className="flex justify-between text-sm text-white/80">
                <span>{item.productName} x{item.quantity}{item.sauce !== "none" ? " + sauce" : ""}{item.egg ? " + egg" : ""}{item.isFree ? " 🎁 FREE" : ""}</span>
                <span className="text-amber-400 font-bold">{item.isFree ? "FREE" : `₱${calcItemTotal(item)}`}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-2 mt-2 flex justify-between font-black">
            <span className="text-white">Total</span>
            <span className="text-amber-400 text-xl font-bold">₱{finalTotal}</span>
          </div>
          {orderItems.some(item => item.isFree) && (
            <div className="mt-3 p-2 bg-green-400/10 border border-green-400/30 rounded-lg">
              <p className="text-xs text-green-400 text-center">🎉 You redeemed a FREE musubi! 🎉</p>
            </div>
          )}
        </div>
        <button onClick={() => { setSubmitted(false); setOrderItems([]); setStep(1); setForm({ userType: "student", fullName: user.displayName || "", studentId: "", department: "", customDepartment: "", contactNumber: "", pickupSlot: "", pickupTime: "" }); }}
          className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black py-3 rounded-xl">
          Make Another Reservation
        </button>
      </div>
    </div>
  );

  const stepLabels = ["About You", "Pickup Time", "Your Order", "Confirm"];
  const progress = getProgress();
  const availableRewards = loyaltyData ? (loyaltyData.rewardsEarned - (loyaltyData.rewardsRedeemed || 0)) : 0;
  const savedData = user ? loadSavedFormData() : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      <div className="fixed inset-0 z-0">
        <img src="/musubi.png" alt="Spam Musubi" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#0a0a0a]" />
      </div>

      <div className="relative z-10">
        <Toast toasts={toasts} removeToast={removeToast} />
        {false && <OnboardingTour onComplete={() => { localStorage.setItem("spamMusubiTutorial", "completed"); setShowOnboarding(false); }} onSkip={() => { localStorage.setItem("spamMusubiTutorial", "skipped"); setShowOnboarding(false); }} />}

       <div className="bg-black/80 border-b border-amber-400/20 px-6 py-4 sticky top-0 z-50 backdrop-blur">
  <div className="max-w-2xl mx-auto flex justify-between items-center">
    <div className="flex items-center gap-3">
      <span className="text-2xl">🍱</span>
      <div className="relative">
        <button
          onClick={async () => {
            await markAllAdminMessagesAsRead();
            setShowChatList(true);
          }}
          className="text-xs border border-amber-400/40 text-amber-400 px-3 py-1.5 rounded-lg"
        >
          💬
        </button>
        {unreadCustomerCount > 0 && (
  <span className="absolute -top-2 -right-2 bg-amber-400 text-black text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
    {unreadCustomerCount > 9 ? "9+" : unreadCustomerCount}
  </span>
)}
      </div>
      <div>
        <p className="font-black text-amber-400 leading-none">Spam Musubi</p>
        <p className="text-white/40 text-xs">Reserve for tomorrow</p>
      </div>
    </div>  {/* ← This closes the flex items-center gap-3 div */}
    <div className="flex items-center gap-2">
      <NotificationCenter />   {/* ← add this line */}
      <button onClick={() => setShowQR(true)} className="text-xs border border-amber-400/40 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-400/10 transition-all">🔗 Share</button>
      <button onClick={() => auth.signOut()} className="text-xs border border-white/20 px-3 py-1.5 rounded-lg hover:border-red-400/50 hover:text-red-400 transition-all">Sign out</button>
    </div>
  </div>
</div>

        <div className="max-w-2xl mx-auto px-6 py-10" ref={stepContainerRef}>
          <div className="mb-6"><h1 className="text-2xl font-black">Hello, <span className="text-amber-400">{user.displayName?.split(" ")[0]}!</span> 👋</h1><p className="text-white/50 text-sm">Reserve your Spam Musubi for tomorrow</p></div>

          <NotificationGuide />

          <div className="bg-black/40 border border-white/10 rounded-2xl p-5 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-amber-400/20 flex items-center justify-center overflow-hidden">
                {userProfile?.avatarUrl ? (
                  <img src={userProfile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl text-amber-400">{user.displayName?.[0] || "👤"}</span>
                )}
              </div>
              <div>
                <p className="font-bold text-white text-lg">{form.fullName || user.displayName}</p>
                <p className="text-white/50 text-sm">{user.email}</p>
                <p className="text-white/40 text-xs mt-1">{form.contactNumber || "No contact number"}</p>
                {form.userType === "student" && form.studentId && <p className="text-white/40 text-xs">ID: {form.studentId}</p>}
                {form.userType === "staff" && (form.department === "others" ? form.customDepartment : DEPARTMENT_OPTIONS.find(d => d.value === form.department)?.label) && (
                  <p className="text-white/40 text-xs">{DEPARTMENT_OPTIONS.find(d => d.value === form.department)?.label || form.customDepartment}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-amber-400/10 border border-amber-400/30 rounded-2xl px-6 py-4 mb-8 flex items-center justify-between">
            <div><p className="text-xs text-amber-400/70 uppercase">Pickup Date</p><p className="text-white font-black">{tomorrowDisplay}</p></div>
            <span className="text-3xl">📅</span>
          </div>

          {loyaltyData && (
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/30 rounded-2xl p-5 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  <h3 className="font-black text-amber-400">Loyalty Rewards</h3>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/40">Buy 10 Get 1 Free</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-white">{loyaltyData.totalPurchased || 0}</p>
                  <p className="text-xs text-white/40">Total Musubi</p>
                  <span className="text-sm">🍱</span>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-amber-400">{availableRewards}</p>
                  <p className="text-xs text-white/40">Free Musubi</p>
                  <span className="text-sm">🎁</span>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-green-400">{loyaltyData.rewardsEarned || 0}</p>
                  <p className="text-xs text-white/40">Rewards Earned</p>
                  <span className="text-sm">⭐</span>
                </div>
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60">Next Free Musubi</span>
                  <span className="text-amber-400 font-bold">{progress.remaining} more to go</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3">
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progress.progressPercent}%` }} />
                </div>
                <p className="text-xs text-white/40 mt-1 text-center">🍱 {progress.purchased} of 10 musubi purchased</p>
              </div>
              {availableRewards > 0 && (
                <div className="mt-3 p-3 bg-amber-400/20 border border-amber-400/50 rounded-xl animate-pulse">
                  <p className="text-sm text-amber-400 text-center font-bold">🎉 You have {availableRewards} FREE musubi waiting! 🎉</p>
                  <p className="text-xs text-white/40 text-center mt-1">Redeem on your next order</p>
                  <button onClick={handleRedeemReward} className="mt-2 w-full bg-amber-400 text-black font-bold py-2 rounded-lg hover:bg-amber-300 transition-all text-sm">Redeem Free Musubi 🎁</button>
                </div>
              )}
            </div>
          )}

          {/* Pending Orders Card on Main Dashboard */}
          {pendingOrdersMain.length > 0 && (
            <div className="bg-black/40 border border-amber-400/30 rounded-2xl p-5 mb-8">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-black text-amber-400">⏳ Your Pending Orders</h3>
                <button onClick={fetchPendingOrdersMain} className="text-xs text-amber-400 hover:text-amber-300">🔄 Refresh</button>
              </div>
              <div className="space-y-3">
                {pendingOrdersMain.map(order => {
                  const [year, month, day] = order.pickupDate.split("-").map(Number);
                  const cutoff = new Date(year, month - 1, day, 12, 0, 0);
                  const canCancel = new Date() < cutoff;
                  return (
                    <div key={order.id} className="bg-white/5 rounded-xl p-3 flex justify-between items-center">
                      <div>
                        <p className="text-white text-sm font-bold">
                          {order.items?.[0]?.productName || "Classic Spam Musubi"} x{order.items?.[0]?.quantity || order.quantity || 1}
                        </p>
                        <p className="text-white/40 text-xs">{order.pickupDate} • {order.pickupSlot} — {order.pickupTime}</p>
                        {!canCancel && order.status === "pending" && (
                          <span className="text-amber-400/70 text-[10px]">cannot cancel after 12PM on pickup day</span>
                        )}
                        {canCancel && (
                          <span className="text-green-400/70 text-[10px]">cancel available until 12PM</span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-amber-400 font-bold">₱{order.totalPrice}</p>
                        {canCancel && (
                          <button
                            onClick={() => cancelOrderMain(order.id)}
                            className="mt-1 text-xs bg-red-400/20 text-red-400 px-3 py-1 rounded hover:bg-red-400/30 transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed Orders - Write Review */}
          <PublicReviews />
          {completedOrders.length > 0 && (
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-black text-amber-400 mb-4">📦 Your Completed Orders</h3>
              <div className="space-y-3">
                {completedOrders.map((order) => {
                  let items = order.items;
                  if (!Array.isArray(items) && items && typeof items === 'object') {
                    items = [items];
                  }
                  const firstItem = items?.[0] || { productName: "Classic Spam Musubi", productId: "classic", quantity: 1 };
                  
                  return (
                    <div key={order.id} className="bg-white/5 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <p className="text-white font-bold text-sm">
                          {firstItem.productName} x{firstItem.quantity || 1}
                        </p>
                        <p className="text-white/40 text-xs">{order.pickupDate ? new Date(order.pickupDate).toLocaleDateString() : "Date not available"}</p>
                      </div>
                      <button
                        onClick={() => setSelectedOrderForReview({
                          productId: firstItem.productId || "classic",
                          productName: firstItem.productName || "Classic Spam Musubi",
                          orderId: order.id
                        })}
                        className="px-4 py-2 rounded-xl bg-amber-400/20 border border-amber-400/50 text-amber-400 text-sm font-medium hover:bg-amber-400/30 transition-all"
                      >
                        Write a Review ✍️
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {redeemingReward && (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center px-4">
              <div className="bg-gradient-to-br from-[#111] to-[#1a1a1a] border border-amber-400/30 rounded-2xl w-full max-w-md p-6">
                <div className="text-center">
                  <div className="text-5xl mb-4">🎁</div>
                  <h2 className="text-xl font-black text-amber-400 mb-3">Redeem Free Musubi!</h2>
                  <p className="text-white/60 mb-4">Choose your free musubi:</p>
                  <div className="space-y-2 mb-6">
                    {PRODUCTS.map(product => (
                      <button key={product.id} onClick={() => handleAddFreeItem(product)} className="w-full flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/50 transition-all">
                        <span className="font-bold text-white">{product.name}</span>
                        <span className="text-amber-400 font-bold">FREE</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setRedeemingReward(false)} className="w-full bg-white/10 text-white font-bold py-2 rounded-xl hover:bg-white/20 transition-all">Cancel</button>
                </div>
              </div>
            </div>
          )}

          <StepIndicator current={step} total={4} labels={stepLabels} />

          {isSoldOut ? (
            <div className="bg-black/40 border border-red-400/30 rounded-2xl p-8 text-center my-8">
              <div className="text-6xl mb-4 animate-pulse">🚫</div>
              <h2 className="text-2xl font-black text-red-400 mb-3">Sold Out Today!</h2>
              <p className="text-white/70 mb-4">We've reached our capacity for today. Please check back tomorrow for reservations!</p>
              <div className="bg-white/5 rounded-xl p-4 mt-4">
                <p className="text-white/40 text-sm">🍱 Our kitchen is busy preparing delicious musubi for our lucky customers today!</p>
                <p className="text-amber-400/60 text-xs mt-2">New reservations will open again at midnight.</p>
              </div>
            </div>
          ) : isStockLimit ? (
            <div className="bg-black/40 border border-orange-400/30 rounded-2xl p-8 text-center my-8">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-black text-orange-400 mb-3">Stock Limit Reached</h2>
              <p className="text-white/70 mb-4">We've hit our ingredient limit for today. Reservations will reopen after we restock. Thank you for your patience!</p>
              <div className="bg-white/5 rounded-xl p-4 mt-4">
                <p className="text-white/40 text-sm">🍱 We're preparing the current orders and will be back soon!</p>
                <p className="text-amber-400/60 text-xs mt-2">Check back tomorrow for new slots.</p>
              </div>
            </div>
          ) : (
            <>
              {isClosed ? (
                <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
                  <div className="text-5xl mb-4">😴</div>
                  <h2 className="text-xl font-bold text-white/70">We're closed tomorrow</h2>
                  <p className="text-white/40 mt-2">Check back tomorrow for the next available slot!</p>
                </div>
              ) : (
                <>
                  {step === 1 && (
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-7 space-y-6 step1-target">
                      <div className="flex justify-between items-center">
                        <h2 className="text-lg font-black text-amber-400">About You</h2>
                        {savedData && (
                          <button onClick={() => applySavedData(savedData)} className="text-xs bg-amber-400/20 border border-amber-400/50 text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-400/30 transition-all">📋 Use saved info</button>
                        )}
                      </div>
                      <div className="flex gap-3">
                        {["student", "staff"].map((type) => (
                          <button key={type} type="button" onClick={() => setForm({ ...form, userType: type, department: "", customDepartment: "" })}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${form.userType === type ? "bg-amber-400 text-black border-amber-400" : "bg-white/10 text-white/80 border-white/20 hover:border-amber-400/50"}`}>
                            {type === "student" ? "🎓 USTP Student" : "🏫 Staff / Faculty / Other"}
                          </button>
                        ))}
                      </div>
                      <div>
                        <label className="text-xs text-white/50 uppercase mb-1.5 block">Full Name</label>
                        <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 focus:border-amber-400 focus:outline-none text-white placeholder-white/40" />
                        {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
                      </div>
                      {form.userType === "student" ? (
                        <div>
                          <label className="text-xs text-white/50 uppercase mb-1.5 block">Student ID (10 digits)</label>
                          <input type="text" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                            placeholder="e.g. 2023306520" maxLength={10}
                            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 focus:border-amber-400 focus:outline-none text-white placeholder-white/40" />
                          {errors.studentId && <p className="text-red-400 text-xs mt-1">{errors.studentId}</p>}
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="text-xs text-amber-400/80 uppercase mb-1.5 block">Select your department/role</label>
                            <select
                              value={form.department}
                              onChange={(e) => {
                                const value = e.target.value;
                                setForm({ ...form, department: value });
                                setShowCustomDepartment(value === "others");
                              }}
                              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 focus:border-amber-400 focus:outline-none text-white text-base"
                            >
                              <option value="" disabled className="bg-[#1a1a1a] text-white/60">Choose your department</option>
                              {DEPARTMENT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-[#1a1a1a] text-white">{opt.label}</option>
                              ))}
                            </select>
                            {errors.department && <p className="text-red-400 text-xs mt-1">{errors.department}</p>}
                          </div>
                          {showCustomDepartment && (
                            <div>
                              <label className="text-xs text-amber-400/80 uppercase mb-1.5 block">Please specify</label>
                              <input
                                type="text"
                                value={form.customDepartment}
                                onChange={(e) => setForm({ ...form, customDepartment: e.target.value })}
                                placeholder="e.g. Research Office, Student Affairs, etc."
                                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 focus:border-amber-400 focus:outline-none text-white text-base placeholder-white/40"
                              />
                              {errors.customDepartment && <p className="text-red-400 text-xs mt-1">{errors.customDepartment}</p>}
                            </div>
                          )}
                        </>
                      )}
                      <div>
                        <label className="text-xs text-white/50 uppercase mb-1.5 block">Contact Number</label>
                        <input type="tel" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                          placeholder="09xxxxxxxxx" maxLength={11}
                          className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 focus:border-amber-400 focus:outline-none text-white placeholder-white/40" />
                        {errors.contactNumber && <p className="text-red-400 text-xs mt-1">{errors.contactNumber}</p>}
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-7 space-y-6 step2-target">
                      <h2 className="text-lg font-black text-amber-400">Pickup Time</h2>
                      <div>
                        <label className="text-xs text-white/50 uppercase mb-3 block">Available windows tomorrow</label>
                        <div className="grid grid-cols-1 gap-3">
                          {timeSlots.map((slot) => (
                            <button key={slot.label} type="button" onClick={() => setForm({ ...form, pickupSlot: slot.label, pickupTime: "" })}
                              className={`w-full flex items-center justify-between px-5 py-5 rounded-xl border transition-all ${form.pickupSlot === slot.label ? "bg-amber-400/10 border-amber-400 text-white" : "bg-white/5 border-white/10 text-white/60 hover:border-amber-400/30"}`}>
                              <span className="font-bold">{slot.label}</span>
                              <span className={`text-sm ${form.pickupSlot === slot.label ? "text-amber-400" : "text-white/40"}`}>{slot.range}</span>
                            </button>
                          ))}
                        </div>
                        {errors.pickupSlot && <p className="text-red-400 text-xs mt-2">{errors.pickupSlot}</p>}
                      </div>
                      {form.pickupSlot && selectedSlot && (
                        <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-4">
                          <label className="text-xs text-amber-400/80 uppercase mb-1.5 block">Pick your exact time 🕐</label>
                          <p className="text-white/40 text-xs mb-3">Within {selectedSlot.range}</p>
                          <select value={form.pickupTime} onChange={(e) => setForm({ ...form, pickupTime: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-amber-400/30 focus:border-amber-400 focus:outline-none text-white cursor-pointer">
                            <option value="" disabled>Select a time</option>
                            {timeOptions.map((time) => (<option key={time} value={time}>{time}</option>))}
                          </select>
                          {errors.pickupTime && <p className="text-red-400 text-xs mt-2">{errors.pickupTime}</p>}
                        </div>
                      )}
                    </div>
                  )}

                  {step === 3 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 space-y-6 step3-target">
                        <div className="bg-black/40 border border-white/10 rounded-2xl p-7 space-y-5">
                          <h2 className="text-lg font-black text-amber-400">Build Your Order</h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {PRODUCTS.map((product) => (
                              <button
                                key={product.id}
                                onClick={() => {
                                  if ((productStock[product.id] || 0) <= 0) {
                                    addToast(`Sorry, ${product.name} is sold out! Please check back tomorrow.`, "error", "🚫");
                                    return;
                                  }
                                  setSelectedProduct(product);
                                }}
                                className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${selectedProduct?.id === product.id ? "border-amber-400 ring-2 ring-amber-400/50 scale-[1.02]" : "border-white/10 hover:border-amber-400/30 hover:scale-[1.01]"}`}
                              >
                                <img src={product.image} alt={product.name} className="w-full h-36 object-cover" />
                                <div className="absolute top-2 left-2 bg-amber-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">{product.tag}</div>
                                <div className="p-3 bg-black/60">
                                  <p className="font-bold text-white text-sm">{product.name}</p>
                                  <div className="flex justify-between items-center">
                                    <p className="text-amber-400 font-black">₱{product.price}</p>
                                    <p className={`text-xs ${(productStock[product.id] || 0) <= 0 ? 'text-red-400' : (productStock[product.id] || 0) <= 5 ? 'text-orange-400' : 'text-white/60'}`}>
                                      📦 {productStock[product.id] !== undefined ? productStock[product.id] : '0...'} left
                                      {(productStock[product.id] || 0) <= 5 && (productStock[product.id] || 0) > 0 && ' ⚠️'}
                                      {(productStock[product.id] || 0) <= 0 && ' ❌'}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                          {selectedProduct && (
                            <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-5 space-y-4">
                              <p className="font-black text-amber-400">Customize: {selectedProduct.name}</p>
                              <div>
                                <label className="text-xs text-white/50 uppercase mb-2 block">Sauce (optional)</label>
                                <div className="grid grid-cols-2 gap-2">
                                  {SAUCES.map((sauce) => (
                                    <button key={sauce.value} type="button" onClick={() => setCurrentItem({ ...currentItem, sauce: sauce.value })}
                                      className={`flex justify-between px-3 py-2 rounded-xl border text-sm ${currentItem.sauce === sauce.value ? "bg-amber-400/10 border-amber-400 text-white" : "bg-white/5 border-white/10 text-white/80"}`}>
                                      <span>{sauce.label}</span>
                                      {sauce.value !== "none" && <span className="text-amber-400">+₱5</span>}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <button type="button" onClick={() => setCurrentItem({ ...currentItem, egg: !currentItem.egg })}
                                className={`w-full flex justify-between px-4 py-3 rounded-xl border ${currentItem.egg ? "bg-amber-400/10 border-amber-400 text-white" : "bg-white/5 border-white/10 text-white/80"}`}>
                                <span>🍳 Add Egg</span><span className="text-amber-400">+₱10</span>
                              </button>
                              <div>
                                <label className="text-xs text-white/50 uppercase mb-2 block">Quantity</label>
                                <div className="flex items-center gap-4">
                                  <button type="button" onClick={() => setCurrentItem({ ...currentItem, quantity: Math.max(1, currentItem.quantity - 1) })}
                                    className="w-10 h-10 rounded-xl bg-white/10 text-white text-xl">−</button>
                                  <span className="text-2xl font-black w-8 text-center text-white">{currentItem.quantity}</span>
                                  <button type="button" onClick={() => setCurrentItem({ ...currentItem, quantity: Math.min(20, currentItem.quantity + 1) })}
                                    className="w-10 h-10 rounded-xl bg-white/10 text-white text-xl">+</button>
                                </div>
                              </div>
                              <div className="flex justify-between pt-2 border-t border-white/10">
                                <span className="text-white/60">Item Total</span>
                                <span className="text-amber-400 font-black">₱{(selectedProduct.price + (currentItem.sauce !== "none" ? 10 : 0) + (currentItem.egg ? 10 : 0)) * currentItem.quantity}</span>
                              </div>

                              <button 
                                type="button" 
                                onClick={handleAddToOrder}
                                disabled={(productStock[selectedProduct?.id] || 0) <= 0}
                                className={`w-full font-black py-3 rounded-xl transition-all ${
                                  (productStock[selectedProduct?.id] || 0) <= 0 
                                    ? "bg-gray-500 text-black cursor-not-allowed" 
                                    : "bg-amber-400 text-black hover:bg-amber-300"
                                }`}
                              >
                                {(productStock[selectedProduct?.id] || 0) <= 0 ? "❌ Sold Out" : "✅ Add to Order"}
                              </button>
                            </div>
                          )}
                          {orderItems.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs text-white/50 uppercase mb-2">Current Order</p>
                              <div className="space-y-2">
                                {orderItems.map((item) => (
                                  <div key={item.id} className="flex justify-between items-center bg-white/5 rounded-xl px-4 py-3">
                                    <div>
                                      <p className="font-bold text-sm text-white">{item.productName} x{item.quantity}{item.isFree && <span className="ml-2 text-xs text-green-400">🎁 FREE</span>}</p>
                                      <p className="text-white/40 text-xs">{item.sauce !== "none" ? `Sauce` : ""}{item.egg ? " + Egg" : ""}</p>
                                    </div>
                                    <div className="flex items-center gap-3"><span className="text-amber-400 font-black">{item.isFree ? "FREE" : `₱${calcItemTotal(item)}`}</span><button onClick={() => removeItem(item.id)} className="text-white/30 hover:text-red-400">✕</button></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {errors.order && <p className="text-red-400 text-xs">{errors.order}</p>}
                        </div>
                      </div>
                      <div className="lg:col-span-1 space-y-6">
                        {popularProducts.length > 0 && (
                          <div className="bg-black/40 border border-white/10 rounded-2xl p-5 sticky top-24">
                            <h3 className="text-amber-400 font-black mb-3">🏆 Customer Favorites</h3>
                            <div className="space-y-2">
                              {popularProducts.slice(0, 3).map((product, idx) => {
                                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                                return (<div key={product.name} className="flex items-center gap-2"><span className="text-lg">{medal}</span><span className="text-white/80 text-sm">{product.name}</span></div>);
                              })}
                            </div>
                            <p className="text-white/30 text-xs mt-3 text-center">Most ordered by our customers</p>
                          </div>
                        )}
                        {orderItems.length > 0 && (
                          <div className="bg-black/40 border border-white/10 rounded-2xl p-5">
                            <h3 className="text-amber-400 font-black mb-3">🧾 Your Receipt</h3>
                            <div className="space-y-2 mb-3">
                              {orderItems.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <span className="text-white/80">{item.productName} x{item.quantity}{item.sauce !== "none" ? " + sauce" : ""}{item.egg ? " + egg" : ""}{item.isFree && " 🎁 FREE"}</span>
                                  <span className="text-amber-400">{item.isFree ? "FREE" : `₱${calcItemTotal(item)}`}</span>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-white/10 pt-2 flex justify-between font-black"><span className="text-white">Total</span><span className="text-amber-400 text-xl">₱{grandTotal}</span></div>
                            {orderItems.some(item => item.isFree) && (
                              <div className="mt-2 text-center"><p className="text-xs text-green-400">✨ You saved ₱{orderItems.filter(i => i.isFree).reduce((sum, i) => { const product = PRODUCTS.find(p => p.id === i.productId); return sum + (product?.price || 0); }, 0)} with your loyalty reward! ✨</p></div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-7 space-y-6 step4-target">
                      <h2 className="text-lg font-black text-amber-400">Confirm Your Order</h2>
                      <div className="space-y-4">
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-white/50 text-xs uppercase mb-2">Customer Details</p>
                          <p className="text-white"><span className="text-white/70">Name:</span> {form.fullName}</p>
                          <p className="text-white"><span className="text-white/70">Contact:</span> {form.contactNumber}</p>
                          {form.userType === "student" ? (
                            <p className="text-white"><span className="text-white/70">Student ID:</span> {form.studentId}</p>
                          ) : (
                            <p className="text-white"><span className="text-white/70">Department:</span> {form.department === "others" ? form.customDepartment : DEPARTMENT_OPTIONS.find(opt => opt.value === form.department)?.label || form.department}</p>
                          )}
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-white/50 text-xs uppercase mb-2">Pickup Details</p>
                          <p className="text-white"><span className="text-white/70">Date:</span> {tomorrowDisplay}</p>
                          <p className="text-white"><span className="text-white/70">Time:</span> {form.pickupSlot} — {form.pickupTime}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-white/50 text-xs uppercase mb-2">Order Summary</p>
                          {orderItems.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-white/80">{item.productName} x{item.quantity}{item.sauce !== "none" ? " + sauce" : ""}{item.egg ? " + egg" : ""}{item.isFree && " 🎁 FREE"}</span>
                              <span className="text-amber-400">{item.isFree ? "FREE" : `₱${calcItemTotal(item)}`}</span>
                            </div>
                          ))}
                          <div className="border-t border-white/10 pt-2 mt-2">
                            <div className="flex justify-between text-sm">
                              <span>Subtotal</span>
                              <span>₱{grandTotal}</span>
                            </div>
                            {paymentMethod === 'gcash' && (
                              <div className="flex justify-between text-sm text-amber-400">
                                <span>Service Fee (GCash)</span>
                                <span>₱{calculateServiceFee(grandTotal)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-black mt-1">
                              <span>Total</span>
                              <span className="text-amber-400 text-xl">₱{finalTotal}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-white/50 text-xs uppercase mb-2">Payment Method</p>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                              <input type="radio" name="paymentMethod" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} />
                              <span>Cash on Pickup</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input type="radio" name="paymentMethod" value="gcash" checked={paymentMethod === 'gcash'} onChange={() => setPaymentMethod('gcash')} />
                              <span>GCash (service fee applies)</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between mt-8 gap-4">
                    {step > 1 && <button onClick={handleBack} className="px-6 py-3 rounded-xl border border-white/20 text-white/70 hover:border-amber-400/50 hover:text-amber-400 transition-all">← Back</button>}
                    {step < 4 ? <button onClick={handleNext} className="ml-auto px-8 py-3 rounded-xl bg-amber-400 text-black font-bold hover:bg-amber-300 transition-all next-button">Next →</button> : <button onClick={handleSubmit} disabled={loading || processingPayment} className="ml-auto px-8 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold hover:shadow-lg transition-all disabled:opacity-50 next-button">{loading || processingPayment ? (processingPayment ? "Redirecting to payment..." : "Placing Order...") : "🍱 Place Order"}</button>}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-amber-400/30 py-2 px-4 z-50">
          <div className="max-w-2xl mx-auto flex justify-around items-center">
            <button onClick={() => { setActiveTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${activeTab === 'home' ? 'text-amber-400' : 'text-white/60 hover:text-white/80'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9L12 3L21 9L19 12M3 9V19H9V13H15V19H21V9" /></svg>
              <span className="text-[10px] font-medium">Home</span>
            </button>
            <button onClick={() => { setActiveTab('orders'); scrollToForm(); }} className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${activeTab === 'orders' ? 'text-amber-400' : 'text-white/60 hover:text-white/80'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4H20V20H4V4Z" /><path d="M8 8H16" /><path d="M8 12H16" /><path d="M8 16H12" /></svg>
              <span className="text-[10px] font-medium">My Orders</span>
            </button>
            <button onClick={() => { setActiveTab('share'); setShowQR(true); }} className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${activeTab === 'share' ? 'text-amber-400' : 'text-white/60 hover:text-white/80'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12V20H20V12" /><path d="M12 2V14M12 14L9 11M12 14L15 11" /></svg>
              <span className="text-[10px] font-medium">Share</span>
            </button>
            <button onClick={() => { setActiveTab('profile'); setShowProfile(true); }} className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${activeTab === 'profile' ? 'text-amber-400' : 'text-white/60 hover:text-white/80'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" /><circle cx="12" cy="7" r="4" /></svg>
              <span className="text-[10px] font-medium">Profile</span>
            </button>
          </div>
        </div>

        {showQR && <QRModal onClose={() => setShowQR(false)} />}
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} onProfileUpdate={refreshUserProfile} />}
       {showChatList && (
  <ConversationList 
    key={Date.now()}   // ← Add this line
    onClose={() => { 
      setShowChatList(false); 
      setOpenChatUserId(null); 
    }} 
    preselectedUserId={openChatUserId} 
  />
)}
        
        {selectedOrderForReview && (
          <ReviewSystem
            productId={selectedOrderForReview.productId}
            productName={selectedOrderForReview.productName}
            orderId={selectedOrderForReview.orderId}
            onClose={() => setSelectedOrderForReview(null)}
          />
        )}

        {showConfirmDialog && (
          <ConfirmationDialog
            isOpen={showConfirmDialog}
            onClose={() => setShowConfirmDialog(false)}
            onConfirm={submitOrder}
            orderDetails={pendingOrderData}
          />
        )}
      </div>
    </div> 
  );
}
