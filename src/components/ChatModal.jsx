import { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase/firebase";
import { collection, query, orderBy, addDoc, onSnapshot, where, getDocs, updateDoc, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const ADMIN_EMAIL = "monsanto.bryann@gmail.com";
const ADMIN_UID = "xX2t8o5YOhXq1xXAzA8MxwUYE9D2"; // Updated to your actual UID
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

  // Fetch admin data by email (no hardcoded UID)
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

  // ✅ AUTO-CREATE CONVERSATION IF IT DOESN'T EXIST (THIS IS KEY)
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

  // Real-time online status for other user
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

  // Real‑time messages from single conversation
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

  // Mark messages as read
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

  // Fetch customer details (for admin)
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
                    <p className="text-sm break-words">{msg.text}</p>
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
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-white/10 flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 focus:border-amber-400 focus:outline-none text-white text-sm"
          />
          <button onClick={sendMessage} disabled={sending} className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold hover:bg-amber-300 disabled:opacity-50">
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;