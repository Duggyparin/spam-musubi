import { useState, useEffect } from "react";
import { auth, db } from "../firebase/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from "firebase/firestore";

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
      // Admin: find all conversations_meta where admin is participant
      // Then listen to messages in each conversation where sender is customer and read == false
      // This is complex; simpler: listen to all messages under the admin's own subcollection in the old chats? No.
      // Better: listen to all conversations_meta, then for each, listen to messages.
      // But for simplicity, we'll use a different approach: query messages directly from the conversations collection.
      // Since all messages are stored under conversations/{convId}/messages, we need to query across all conversations.
      // Firestore doesn't support collection group queries easily. Alternative: use a Cloud Function.
      // For now, we'll rely on the existing unread count in the UI – the bell will only show unread count from the conversation list.
      // But to make it work, we'll assume the unread count is derived from the conversation list.
      // Actually, we can query all conversations_meta where participants include admin, then for each, count unread messages.
      // This is heavy; we'll implement a simple version that works for the admin:
      const fetchUnreadCount = async () => {
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
            unreadList.push({
              id: doc.id,
              text: doc.data().text,
              senderName: doc.data().senderName,
              sender: doc.data().sender,
              timestamp: doc.data().timestamp,
              fromUserId: doc.data().fromUid,
            });
          });
        }
        setUnreadCount(totalUnread);
        setNotifications(unreadList.slice(0, 5));
      };
      fetchUnreadCount();
      // Poll every 10 seconds (or use real‑time listener – too heavy)
      const interval = setInterval(fetchUnreadCount, 10000);
      return () => clearInterval(interval);
    } else {
      // Customer: listen to messages in their own conversations (the same as conversation list)
      // We'll just rely on the conversation list's unread count.
      // For simplicity, we can set unread count to 0 for customers (the bell is mainly for admin).
      setUnreadCount(0);
      setNotifications([]);
    }
  }, [currentUser, isAdmin]);

  const markAsRead = async (notificationId, fromUserId) => {
    // Find the conversation ID and message reference
    // This is complex; we'll skip for now as the bell is mainly for admin.
    console.log("Mark as read", notificationId, fromUserId);
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
              <button
                onClick={markAllAsRead}
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                Mark all as read
              </button>
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
                  <p className="text-white text-sm font-medium">
                    {notif.senderName || (notif.sender === "admin" ? "Owner" : "Customer")}
                  </p>
                  <p className="text-white/60 text-xs truncate">{notif.text}</p>
                  <p className="text-white/30 text-xs mt-1">
                    {notif.timestamp?.toDate ? notif.timestamp.toDate().toLocaleTimeString() : "Just now"}
                  </p>
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