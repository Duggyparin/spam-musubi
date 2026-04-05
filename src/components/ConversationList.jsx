import { useState, useEffect } from "react";
import { db, auth } from "../firebase/firebase";
import { collection, query, orderBy, limit, doc, getDoc, getDocs } from "firebase/firestore";
import ChatModal from "./ChatModal";

const ADMIN_EMAIL = "monsanto.bryann@gmail.com";
const ADMIN_UID = "Ptyo15VS93VJxT4PS6POmwpQQfC2";

const Avatar = ({ name, imageUrl, online }) => {
  if (imageUrl) {
    return (
      <div className="relative">
        <img src={imageUrl} alt={name} className="w-10 h-10 rounded-full object-cover" />
        {online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>}
      </div>
    );
  }
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "??";
  const colors = ["bg-amber-400", "bg-green-400", "bg-blue-400", "bg-purple-400", "bg-pink-400"];
  const color = colors[name?.charCodeAt(0) % colors.length] || "bg-amber-400";
  return (
    <div className="relative">
      <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center font-black text-black text-sm flex-shrink-0`}>
        {initials}
      </div>
      {online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>}
    </div>
  );
};

const ConversationList = ({ onClose, preselectedUserId = null }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const currentUser = auth.currentUser;
  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!currentUser) return;

    const fetchConversations = async () => {
      if (isAdmin) {
        // Admin: fetch all messages under admin's UID and group by fromUid
        try {
          const adminMessagesRef = collection(db, "chats", ADMIN_UID, "messages");
          const q = query(adminMessagesRef, orderBy("timestamp", "desc"));
          const querySnapshot = await getDocs(q);
          const customerMap = new Map();
          for (const docSnap of querySnapshot.docs) {
            const msg = docSnap.data();
            if (msg.sender === "admin") continue;
            const fromUid = msg.fromUid;
            if (!fromUid) continue;
            if (!customerMap.has(fromUid)) {
              let userName = msg.senderName || "Customer";
              let userEmail = "";
              let avatarUrl = null;
              let online = false;
              try {
                const userDoc = await getDoc(doc(db, "users", fromUid));
                if (userDoc.exists()) {
                  userName = userDoc.data().fullName || userDoc.data().userName || userName;
                  userEmail = userDoc.data().userEmail || "";
                  avatarUrl = userDoc.data().avatarUrl || null;
                  online = userDoc.data().online === true;
                }
              } catch (e) {}
              customerMap.set(fromUid, {
                userId: fromUid,
                userName,
                userEmail,
                userAvatar: avatarUrl,
                online,
                lastMessage: msg.text,
                lastTimestamp: msg.timestamp,
              });
            }
          }
          const convs = Array.from(customerMap.values());
          convs.sort((a, b) => (b.lastTimestamp || "").localeCompare(a.lastTimestamp || ""));
          setConversations(convs);
        } catch (error) {
          console.error("Error fetching admin conversations:", error);
        }
      } else {
        // Customer: conversation with admin
        try {
          const messagesRef = collection(db, "chats", ADMIN_UID, "messages");
          const lastMsgQuery = query(messagesRef, orderBy("timestamp", "desc"), limit(1));
          const lastMsgSnap = await getDocs(lastMsgQuery);
          let lastMessage = "", lastTimestamp = "";
          if (!lastMsgSnap.empty) {
            lastMessage = lastMsgSnap.docs[0].data().text;
            lastTimestamp = lastMsgSnap.docs[0].data().timestamp;
          }
          let adminAvatar = null;
          let adminOnline = false;
          try {
            const adminDoc = await getDoc(doc(db, "users", ADMIN_UID));
            if (adminDoc.exists()) {
              adminAvatar = adminDoc.data().avatarUrl || null;
              adminOnline = adminDoc.data().online === true;
            }
          } catch (e) {}
          setConversations([{
            userId: ADMIN_UID,
            userName: "Owner",
            userEmail: ADMIN_EMAIL,
            userAvatar: adminAvatar,
            online: adminOnline,
            lastMessage,
            lastTimestamp,
          }]);
        } catch (error) {
          console.error("Error fetching customer conversation:", error);
        }
      }
    };
    fetchConversations();
  }, [currentUser, isAdmin]);

  // Auto-select conversation if preselectedUserId is provided
  useEffect(() => {
    if (preselectedUserId && conversations.length > 0) {
      const target = conversations.find(c => c.userId === preselectedUserId);
      if (target) {
        setSelectedChat(target);
      }
    }
  }, [preselectedUserId, conversations]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-16 px-4 overflow-y-auto">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-4xl p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-amber-400">💬 Messages</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl">✕</button>
        </div>

        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">💬</div>
            <p className="text-white/50">No conversations yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
              <div className="p-3 border-b border-white/10 text-white/50 text-xs uppercase">Conversations</div>
              <div className="divide-y divide-white/10 max-h-[500px] overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.userId}
                    onClick={() => setSelectedChat(conv)}
                    className={`w-full p-3 text-left hover:bg-white/5 transition-all ${selectedChat?.userId === conv.userId ? 'bg-white/10' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={conv.userName} imageUrl={conv.userAvatar} online={conv.online} />
                      <div className="flex-1">
                        <p className="font-bold text-white text-sm">
                          {isAdmin ? conv.userName : "Owner"}
                        </p>
                        <p className="text-white/40 text-xs truncate">{conv.lastMessage || "No messages yet"}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 bg-black/40 border border-white/10 rounded-xl flex flex-col h-[500px]">
              {selectedChat ? (
                <ChatModal
                  userId={selectedChat.userId}
                  userName={selectedChat.userName}
                  userEmail={selectedChat.userEmail}
                  onClose={() => setSelectedChat(null)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-white/40">
                  Select a conversation to start messaging
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;