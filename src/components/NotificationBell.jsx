import { useState, useEffect } from "react";
import { auth, db } from "../firebase/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";

const ADMIN_EMAIL = "monsanto.bryann@gmail.com";

const NotificationBell = ({ onOpenChat }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const currentUser = auth.currentUser;
  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!currentUser) return;

    let unsubscribe = null;

    if (isAdmin) {
      // Admin: listen to all conversations_meta, then fetch unread messages
      // (we'll keep this simple – polling for now)
      const fetchUnreadForAdmin = async () => {
        const metaRef = collection(db, "conversations_meta");
        const q = query(metaRef, where("participants", "array-contains", currentUser.uid));
        const metaSnap = await getDocs(q);
        let totalUnread = 0;
        const unreadList = [];
        for (const metaDoc of metaSnap.docs) {
          const convId = metaDoc.id;
          const messagesRef = collection(db, "conversations", convId, "messages");
          const msgQuery = query(messagesRef, where("read", "==", false), where("sender", "==", "customer"));
          const msgSnap = await getDocs(msgQuery);
          totalUnread += msgSnap.size;
          msgSnap.forEach(doc => {
            unreadList.push({ id: doc.id, text: doc.data().text, senderName: doc.data().senderName, fromUserId: doc.data().fromUid });
          });
        }
        setUnreadCount(totalUnread);
        setNotifications(unreadList.slice(0, 5));
      };
      fetchUnreadForAdmin();
      const interval = setInterval(fetchUnreadForAdmin, 10000);
      return () => clearInterval(interval);
    } else {
      // Customer: listen to all messages in their own conversations where sender is admin and read == false
      const messagesRef = collection(db, "conversations_meta");
      const q = query(messagesRef, where("participants", "array-contains", currentUser.uid));
      const unsubscribeMeta = onSnapshot(q, async (snapshot) => {
        let totalUnread = 0;
        const unreadList = [];
        for (const metaDoc of snapshot.docs) {
          const convId = metaDoc.id;
          const messagesRefConv = collection(db, "conversations", convId, "messages");
          const msgQuery = query(messagesRefConv, where("read", "==", false), where("sender", "==", "admin"));
          const msgSnap = await getDocs(msgQuery);
          totalUnread += msgSnap.size;
          msgSnap.forEach(doc => {
            unreadList.push({
              id: doc.id,
              text: doc.data().text,
              senderName: doc.data().senderName,
              fromUserId: doc.data().fromUid,
            });
          });
        }
        setUnreadCount(totalUnread);
        setNotifications(unreadList.slice(0, 5));
      });
      return () => unsubscribeMeta();
    }
  }, [currentUser, isAdmin]);

  const markAsRead = async (notificationId, fromUserId) => {
    // Find conversation ID containing this message
    // This requires additional logic; for simplicity, we'll assume the message ID is unique and we can update it.
    // We'll implement a more reliable method: iterate through conversations to find the message.
    try {
      const metaRef = collection(db, "conversations_meta");
      const q = query(metaRef, where("participants", "array-contains", currentUser.uid));
      const metaSnap = await getDocs(q);
      for (const metaDoc of metaSnap.docs) {
        const convId = metaDoc.id;
        const msgRef = doc(db, "conversations", convId, "messages", notificationId);
        const msgSnap = await getDoc(msgRef);
        if (msgSnap.exists()) {
          await updateDoc(msgRef, { read: true });
          break;
        }
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    for (const notif of notifications) {
      await markAsRead(notif.id, notif.fromUserId);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative text-xs border border-white/20 px-3 py-1.5 rounded-lg hover:border-amber-400/50 hover:text-amber-400 transition-all"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-[#111] border border-white/10 rounded-xl shadow-2xl z-50">
          <div className="p-3 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">Messages</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-amber-400 hover:text-amber-300">Mark all as read</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-white/40 text-sm">No new messages</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="cursor-pointer hover:bg-white/5 p-3 transition-all border-b border-white/10 last:border-0"
                  onClick={() => {
                    markAsRead(notif.id, notif.fromUserId);
                    if (onOpenChat) onOpenChat(notif.fromUserId);
                    setShowDropdown(false);
                  }}
                >
                  <p className="text-white text-sm font-medium">{notif.senderName || "Owner"}</p>
                  <p className="text-white/60 text-xs truncate">{notif.text}</p>
                </div>
              ))
            )}
          </div>
          <div className="p-2 border-t border-white/10">
            <button
              onClick={() => {
                setShowDropdown(false);
                if (onOpenChat) onOpenChat(null);
              }}
              className="w-full text-center text-xs text-amber-400 hover:text-amber-300"
            >
              Go to Messages →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;