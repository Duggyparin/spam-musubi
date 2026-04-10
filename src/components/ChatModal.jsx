import { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase/firebase";
import { collection, query, orderBy, addDoc, onSnapshot, where, getDocs, updateDoc, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Camera, Send } from 'lucide-react';

const ADMIN_EMAIL = "monsanto.bryann@gmail.com";
const ADMIN_UID = "xX2t8o5YOhXq1xXAzA8MxwUYE9D2";
const DEFAULT_ADMIN_AVATAR = "https://i.pravatar.cc/150?img=7";

const Avatar = ({ name, imageUrl }) => {
  if (imageUrl) return <img src={imageUrl} alt={name} className="w-10 h-10 rounded-full object-cover" />;
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "??";
  const colors = ["bg-amber-400", "bg-green-400", "bg-blue-400", "bg-purple-400", "bg-pink-400"];
  const color = colors[name?.charCodeAt(0) % colors.length] || "bg-amber-400";
  return (
    <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center font-black text-black text-sm flex-shrink-0`}>
      {initials}
    </div>
  );
};

const getConversationId = (uid1, uid2) => [uid1, uid2].sort().join('_');

const ChatModal = ({ userId, userName, userEmail, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [otherUserAvatar, setOtherUserAvatar] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState(null);
  const messagesEndRef = useRef(null);
  const currentUser = auth.currentUser;
  const isAdmin = currentUser?.email === ADMIN_EMAIL;
  const otherUserId = userId;
  const conversationId = getConversationId(currentUser.uid, otherUserId);
  const [uploadingImage, setUploadingImage] = useState(false);

  const formatLastSeen = (lastSeenISO) => {
    if (!lastSeenISO) return "Recently";
    const lastSeen = new Date(lastSeenISO);
    const now = new Date();
    const diffMs = now - lastSeen;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", ADMIN_EMAIL));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const adminDoc = snap.docs[0];
          setAdminData(adminDoc.data());
          setOtherUserLastSeen(adminDoc.data().lastSeen || null);
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
      }
    };
    fetchAdminData();
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    const initConversation = async () => {
      try {
        const metaRef = doc(db, "conversations_meta", conversationId);
        const metaSnap = await getDoc(metaRef);
        if (!metaSnap.exists()) {
          await setDoc(metaRef, {
            participants: [currentUser.uid, otherUserId],
            lastMessage: "",
            lastUpdated: serverTimestamp(),
          });
          console.log("✅ Auto-created conversation", conversationId);
        }
      } catch (err) {
        console.error("Auto-create failed:", err);
      }
    };
    initConversation();
  }, [conversationId, currentUser.uid, otherUserId]);

  useEffect(() => {
    if (!otherUserId) return;
    const userStatusRef = doc(db, "users", otherUserId);
    const unsubscribe = onSnapshot(userStatusRef, (docSnap) => {
      const data = docSnap.data();
      if (data) {
        setOtherUserOnline(data.online === true);
        setOtherUserLastSeen(data.lastSeen || null);
      } else {
        setOtherUserOnline(false);
        setOtherUserLastSeen(null);
      }
    });
    return unsubscribe;
  }, [otherUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const msgs = snapshot.docs.map(doc => {
          const data = doc.data();
          let timestampDate = null;
          if (data.timestamp) {
            if (data.timestamp.toDate) timestampDate = data.timestamp.toDate();
            else if (typeof data.timestamp === 'string') timestampDate = new Date(data.timestamp);
          }
          return {
            id: doc.id,
            text: data.text || "",
            sender: data.sender,
            senderName: data.senderName,
            read: data.read === true,
            timestamp: timestampDate,
          };
        });
        setMessages(msgs);
      },
      (error) => console.error("Chat listener error:", error)
    );
    return unsubscribe;
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    const markMessagesAsRead = async () => {
      try {
        const messagesRef = collection(db, "conversations", conversationId, "messages");
        const otherSender = isAdmin ? "customer" : "admin";
        const q = query(messagesRef, where("read", "==", false), where("sender", "==", otherSender));
        const querySnapshot = await getDocs(q);
        const updatePromises = querySnapshot.docs.map(async (document) => {
          await updateDoc(document.ref, { read: true });
        });
        await Promise.all(updatePromises);
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    };
    markMessagesAsRead();
  }, [conversationId, isAdmin]);

  useEffect(() => {
    if (!otherUserId || !isAdmin) return;
    const fetchUserDetails = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", otherUserId));
        let avatar = "", phone = "";
        if (userDoc.exists()) {
          avatar = userDoc.data().avatarUrl || "";
          phone = userDoc.data().contactNumber || "";
        }
        if (!phone) {
          const q = query(collection(db, "reservations"), where("userId", "==", otherUserId), orderBy("createdAt", "desc"), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) phone = snap.docs[0].data().contactNumber || "";
        }
        setOtherUserAvatar(avatar);
        setCustomerPhone(phone);
      } catch (err) { console.error(err); }
    };
    fetchUserDetails();
  }, [otherUserId, isAdmin]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const messageData = {
        text: newMessage,
        sender: isAdmin ? "admin" : "customer",
        senderName: isAdmin ? "Owner" : currentUser?.displayName || "Customer",
        fromUid: currentUser.uid,
        toUid: otherUserId,
        timestamp: serverTimestamp(),
        read: false
      };
      await addDoc(collection(db, "conversations", conversationId, "messages"), messageData);
      setNewMessage("");
    } catch (error) {
      console.error("Send error:", error);
      alert("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  // Compress image - converts iPhone HEIC to JPEG
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1200;
          
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', 0.8);
        };
      };
    });
  };

  const handleCameraUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingImage(true);
    
    try {
      // Compress image (converts HEIC to JPEG for iPhone)
      const compressedBlob = await compressImage(file);
      
      const formData = new FormData();
      formData.append('file', compressedBlob, 'photo.jpg');
      formData.append('upload_preset', 'chat_uploads');
      
      const response = await fetch('https://api.cloudinary.com/v1_1/dvbbusgra/image/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.secure_url) {
        // Send the image URL as a message
        await addDoc(collection(db, "conversations", conversationId, "messages"), {
          imageUrl: data.secure_url,
          text: "",
          sender: isAdmin ? "admin" : "customer",
          senderName: isAdmin ? "Owner" : currentUser?.displayName || "Customer",
          fromUid: currentUser.uid,
          toUid: otherUserId,
          timestamp: serverTimestamp(),
          read: false
        });
      } else {
        alert("Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const otherName = isAdmin ? userName : (adminData?.fullName || "Owner");
  let avatarToShow = isAdmin ? otherUserAvatar : (adminData?.avatarUrl || DEFAULT_ADMIN_AVATAR);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      if (timestamp instanceof Date && !isNaN(timestamp)) {
        return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return "";
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md flex flex-col h-[600px]">
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Avatar name={otherName} imageUrl={avatarToShow} />
            <div>
              <h3 className="font-black text-white">{otherName}</h3>
              <p className="text-white/40 text-xs">
                {otherUserOnline ? <span className="text-green-400">● Online</span> : <span>Last seen {formatLastSeen(otherUserLastSeen)}</span>}
              </p>
              {isAdmin && customerPhone && (
                <a href={`tel:${customerPhone}`} className="text-xs text-green-400 hover:text-green-300 block mt-1">📞 {customerPhone}</a>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl">✕</button>
        </div>

        {/* Messages Display - Shows images directly */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-white/40 py-8">No messages yet. Start the conversation!</div>
          ) : (
            messages.map((msg) => {
              const isMyMessage = msg.sender === (isAdmin ? "admin" : "customer");
              const timeStr = formatTime(msg.timestamp);
              return (
                <div key={msg.id} className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMyMessage ? "bg-amber-400 text-black rounded-br-sm" : "bg-white/10 text-white rounded-bl-sm"}`}>
                    {/* Image - shows directly */}
                    {msg.imageUrl && (
                      <img 
                        src={msg.imageUrl} 
                        alt="Shared" 
                        className="max-w-full rounded-lg mb-2 cursor-pointer"
                        onClick={() => window.open(msg.imageUrl, '_blank')}
                      />
                    )}
                    {/* Text message */}
                    {msg.text && <p className="text-sm break-words">{msg.text}</p>}
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <p className="text-[10px] opacity-60">{timeStr}</p>
                      {isMyMessage && msg.read === true && <span className="text-[10px] text-green-400">✓✓ Seen</span>}
                      {isMyMessage && msg.read !== true && <span className="text-[10px] text-white/40">✓ Delivered</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 focus:border-amber-400 focus:outline-none text-white text-sm"
          />
          
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraUpload}
            className="hidden"
            id="camera-input"
          />
          <label
            htmlFor="camera-input"
            className={`px-4 py-2 rounded-xl bg-green-500 text-white font-bold hover:bg-green-400 cursor-pointer transition-all flex items-center justify-center ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}
            title="Take a photo"
          >
            {uploadingImage ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </label>
          
          <button 
            onClick={sendMessage} 
            disabled={sending} 
            className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold hover:bg-amber-300 disabled:opacity-50 flex items-center justify-center"
          >
            {sending ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
