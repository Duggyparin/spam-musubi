import { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase/firebase";
import { collection, query, orderBy, addDoc, onSnapshot, where, getDocs, updateDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";

const ADMIN_EMAIL = "monsanto.bryann@gmail.com";
const ADMIN_UID = "Ptyo15VS93VJxT4PS6POmwpQQfC2";
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

const ChatModal = ({ userId, userName, userEmail, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [otherUserAvatar, setOtherUserAvatar] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState(null);
  const [lastReadTimestamp, setLastReadTimestamp] = useState(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [showNewSeparator, setShowNewSeparator] = useState(false);
  
  const currentUser = auth.currentUser;
  const isAdmin = currentUser?.email === ADMIN_EMAIL;
  const otherUserId = userId;

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
      const adminDoc = await getDoc(doc(db, "users", ADMIN_UID));
      if (adminDoc.exists()) {
        setAdminData(adminDoc.data());
        setOtherUserLastSeen(adminDoc.data().lastSeen || null);
      }
    };
    fetchAdminData();
  }, []);

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

  // ========== REAL-TIME MESSAGES (fixed) ==========
  useEffect(() => {
    if (!otherUserId) return;
    const messagesRef = collection(db, "chats", otherUserId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`📨 Messages loaded for ${isAdmin ? 'admin' : 'customer'}:`, msgs.length);
        setMessages(msgs);
      },
      (error) => {
        console.error("Chat listener error:", error);
      }
    );
    return unsubscribe;
  }, [otherUserId, isAdmin]);

  // Mark messages as read when chat opens
  useEffect(() => {
    if (!otherUserId) return;
    const markMessagesAsRead = async () => {
      try {
        const messagesRef = collection(db, "chats", otherUserId, "messages");
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
  }, [otherUserId, isAdmin]);

  // Last read timestamp from localStorage
  useEffect(() => {
    const key = `lastRead_${otherUserId}`;
    const stored = localStorage.getItem(key);
    if (stored) setLastReadTimestamp(stored);
    else setLastReadTimestamp(new Date().toISOString());
  }, [otherUserId]);

  useEffect(() => {
    if (!lastReadTimestamp || messages.length === 0) return;
    const latestMessageTime = messages[messages.length - 1]?.timestamp;
    if (latestMessageTime && latestMessageTime > lastReadTimestamp) setShowNewSeparator(true);
    else setShowNewSeparator(false);
  }, [messages, lastReadTimestamp]);

  const markAsReadAndUpdate = () => {
    if (messages.length === 0) return;
    const lastMsgTime = messages[messages.length - 1]?.timestamp;
    if (lastMsgTime) {
      localStorage.setItem(`lastRead_${otherUserId}`, lastMsgTime);
      setLastReadTimestamp(lastMsgTime);
      setShowNewSeparator(false);
    }
  };

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const isBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
      if (isBottom) markAsReadAndUpdate();
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [messages]);

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
      const recipientId = otherUserId;
      const senderId = currentUser.uid;
      const messageData = {
        text: newMessage,
        sender: isAdmin ? "admin" : "customer",
        senderName: isAdmin ? "Owner" : currentUser?.displayName || "Customer",
        fromUid: senderId,
        toUid: recipientId,
        timestamp: serverTimestamp(), // ✅ Firestore Timestamp
        read: false
      };
      await addDoc(collection(db, "chats", recipientId, "messages"), messageData);
      await addDoc(collection(db, "chats", senderId, "messages"), messageData);
      setNewMessage("");
      setTimeout(() => markAsReadAndUpdate(), 100);
    } catch (error) {
      console.error("Send error:", error);
      alert("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  
   const groupMessagesByDate = () => {
  const groups = {};
  messages.forEach(msg => {
    if (!msg.timestamp) return;
    let dateObj;
    if (msg.timestamp.toDate) dateObj = msg.timestamp.toDate();
    else dateObj = new Date(msg.timestamp);
    const date = dateObj.toLocaleDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
  });
  return groups;
};

  const messageGroups = groupMessagesByDate();
  const hasMessages = Object.keys(messageGroups).length > 0;

  const otherName = isAdmin ? userName : (adminData?.fullName || "Owner");
  let avatarToShow = isAdmin ? otherUserAvatar : (adminData?.avatarUrl || DEFAULT_ADMIN_AVATAR);

  let newMessagesStartIndex = -1;
  if (showNewSeparator && lastReadTimestamp) {
    for (let i = 0; i < messages.length; i++) {
      let msgTime = messages[i].timestamp;
      if (!msgTime) continue;
      let msgTimeStr;
      if (msgTime.toDate) msgTimeStr = msgTime.toDate().toISOString();
      else msgTimeStr = msgTime;
      if (msgTimeStr > lastReadTimestamp) {
        newMessagesStartIndex = i;
        break;
      }
    }
  }

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
          <button onClick={() => { markAsReadAndUpdate(); onClose(); }} className="text-white/40 hover:text-white text-2xl">✕</button>
        </div>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {!hasMessages ? (
            <div className="text-center text-white/40 py-8">No messages yet. Start the conversation!</div>
          ) : (
            (() => {
              let msgIndex = 0;
              const elements = [];
              for (const [date, msgs] of Object.entries(messageGroups)) {
                elements.push(
                  <div key={date} className="text-center my-3">
                    <span className="text-xs text-white/30 bg-white/5 px-3 py-1 rounded-full">
                      {date === new Date().toLocaleDateString() ? "Today" : date}
                    </span>
                  </div>
                );
                for (const msg of msgs) {
                  const isMyMessage = (isAdmin && msg.sender === "admin") || (!isAdmin && msg.sender === "customer");
                  let timeStr = "";
                  try {
                    let dateObj;
                    if (msg.timestamp?.toDate) dateObj = msg.timestamp.toDate();
                    else dateObj = new Date(msg.timestamp);
                    timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  } catch(e) {}
                  if (showNewSeparator && msgIndex === newMessagesStartIndex) {
                    elements.push(
                      <div key={`new-sep-${msg.id}`} className="relative my-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-amber-400/30"></div></div>
                        <div className="relative flex justify-center text-xs"><span className="bg-[#111] px-2 text-amber-400">New Messages</span></div>
                      </div>
                    );
                  }
                  elements.push(
                    <div key={msg.id} className={`flex mb-3 ${isMyMessage ? "justify-end" : "justify-start"}`}>
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
                  msgIndex++;
                }
              }
              return elements;
            })()
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