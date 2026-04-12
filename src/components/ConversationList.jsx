import { useState, useEffect } from "react";
import { db, auth } from "../firebase/firebase";
import { collection, query, orderBy, getDocs, doc, getDoc, limit, where, onSnapshot } from "firebase/firestore";
import ChatModal from "./ChatModal";

const ADMIN_EMAIL = "monsanto.bryann@gmail.com";
const ADMIN_UID = "xX2t8o5YOhXq1xXAzA8MxwUYE9D2";

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

    const q = query(
      collection(db, "conversations_meta"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("lastUpdated", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const convList = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const otherUserId = data.participants.find(uid => uid !== currentUser.uid);
        if (!otherUserId) continue;

        // Fetch other user's details
        let userName = otherUserId === ADMIN_UID ? "Owner" : "Customer";
        let userEmail = "";
        let avatarUrl = null;
        let online = false;
        try {
          const userDoc = await getDoc(doc(db, "users", otherUserId));
          if (userDoc.exists()) {
            userName = userDoc.data().fullName || userDoc.data().userName || userName;
            userEmail = userDoc.data().userEmail || "";
            avatarUrl = userDoc.data().avatarUrl || null;
            online = userDoc.data().online === true;
          }
        } catch (e) {
          console.error("Error fetching user details:", e);
        }

        // Get last message for display
        let lastMessage = data.lastMessage || "";
        try {
          const lastMsgQuery = query(
            collection(db, "conversations", docSnap.id, "messages"),
            orderBy("timestamp", "desc"),
            limit(1)
          );
          const lastMsgSnap = await getDocs(lastMsgQuery);
          if (!lastMsgSnap.empty) {
            const lastMsg = lastMsgSnap.docs[0].data();
            lastMessage = lastMsg.text || lastMessage;
          }
        } catch (err) {
          console.error("Error fetching last message:", err);
        }

        // Check for unread messages
        let unread = false;
        try {
          const otherSender = isAdmin ? "customer" : "admin";
          const unreadQuery = query(
            collection(db, "conversations", docSnap.id, "messages"),
            where("sender", "==", otherSender),
            where("read", "==", false),
            limit(1)
          );
          const unreadSnap = await getDocs(unreadQuery);
          unread = !unreadSnap.empty;
        } catch (err) {
          console.error("Error checking unread:", err);
        }

        convList.push({
          userId: otherUserId,
          userName,
          userEmail,
          userAvatar: avatarUrl,
          online,
          lastMessage,
          lastTimestamp: data.lastUpdated,
          unread,
        });
      }

      setConversations(convList);
    }, (error) => console.error("Conversation listener error:", error));

    return () => unsubscribe();
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (preselectedUserId && conversations.length > 0) {
      const target = conversations.find(c => c.userId === preselectedUserId);
      if (target) setSelectedChat(target);
    }
  }, [preselectedUserId, conversations]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-16 px-4 overflow-y-auto">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-4xl p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-amber-400">💬 Messages</h2>
            <button 
              onClick={() => window.location.reload()} 
              className="text-xs text-amber-400 hover:text-amber-300 transition-all"
              title="Refresh conversations"
            >
              🔄
            </button>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl">✕</button>
        </div>

        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">💬</div>
            <p className="text-white/50">No conversations yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Conversation List */}
            <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
              <div className="p-3 border-b border-white/10 text-white/50 text-xs uppercase">Conversations</div>
              <div className="divide-y divide-white/10 max-h-[500px] overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.userId}
                    onClick={() => {
                      console.log("Selected chat:", conv);
                      setSelectedChat(conv);
                    }}
                    className={`w-full p-3 text-left hover:bg-white/5 transition-all ${selectedChat?.userId === conv.userId ? 'bg-white/10' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={conv.userName} imageUrl={conv.userAvatar} online={conv.online} />
                      <div className="flex-1">
                        <p className={`text-sm ${conv.unread ? 'font-bold text-white' : 'font-normal text-white/80'}`}>
                          {isAdmin ? conv.userName : "Owner"}
                        </p>
                        <p className={`text-xs truncate ${conv.unread ? 'text-amber-400 font-medium' : 'text-white/40'}`}>
                          {conv.lastMessage || "No messages yet"}
                        </p>
                      </div>
                      {conv.unread && (
                        <div className="w-2.5 h-2.5 bg-amber-400 rounded-full shadow-lg shadow-amber-400/50"></div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Modal */}
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
