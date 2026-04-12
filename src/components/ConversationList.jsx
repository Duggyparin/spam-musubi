import { useState, useEffect } from "react";
import { db, auth } from "../firebase/firebase";
import { collection, query, orderBy, getDocs, doc, getDoc, limit, where, onSnapshot } from "firebase/firestore";
import ChatModal from "./ChatModal";

const ADMIN_EMAIL = "monsanto.bryann@gmail.com";
const ADMIN_UID = "xX2t8o5YOhXq1xXAzA8MxwUYE9D2";

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
        const otherUserId = data.participants?.find(uid => uid !== currentUser.uid);
        if (!otherUserId) continue;

        let userName = otherUserId === ADMIN_UID ? "Owner" : "Customer";
        try {
          const userDoc = await getDoc(doc(db, "users", otherUserId));
          if (userDoc.exists()) {
            userName = userDoc.data().fullName || userDoc.data().userName || userName;
          }
        } catch (err) {
          console.error(err);
        }

        convList.push({
          userId: otherUserId,
          userName,
        });
      }
      setConversations(convList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-16 px-4 overflow-y-auto">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-4xl p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-amber-400">💬 Messages</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl">✕</button>
        </div>

        {conversations.length === 0 ? (
          <div className="text-center py-12"><div className="text-5xl mb-4">💬</div><p className="text-white/50">No conversations yet.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
              <div className="p-3 border-b border-white/10 text-white/50 text-xs uppercase">Conversations</div>
              <div className="divide-y divide-white/10 max-h-[500px] overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.userId}
                    onClick={() => setSelectedChat(conv)}
                    className="w-full p-3 text-left hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center font-black text-black">
                        {conv.userName?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-normal text-white/80">{isAdmin ? conv.userName : "Owner"}</p>
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
                  userEmail=""
                  onClose={() => setSelectedChat(null)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-white/40">Select a conversation</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
