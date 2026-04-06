import { useState, useEffect } from "react";
import { auth, db } from "../firebase/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";

const ADMIN_UID = "Ptyo15VS93VJxT4PS6POmwpQQfC2";

const NotificationBell = ({ onOpenChat }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const currentUser = auth.currentUser;
  const isAdmin = currentUser?.email === "monsanto.bryann@gmail.com";

  useEffect(() => {
    if (!currentUser) return;

    let unsubscribe = null;

    if (isAdmin) {
      // Admin: listen to all messages under admin's UID where sender is customer and read == false
      const messagesRef = collection(db, "chats", ADMIN_UID, "messages");
      const q = query(messagesRef, where("read", "==", false), where("sender", "==", "customer"));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const unreadList = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          unreadList.push({
            id: doc.id,
            text: data.text,
            senderName: data.senderName,
            sender: data.sender,
            timestamp: data.timestamp,
            fromUserId: data.fromUid, // customer UID
          });
        });
        setUnreadCount(unreadList.length);
        setNotifications(unreadList.slice(0, 5));
      }, (error) => {
        console.error("Admin notification listener error:", error);
      });
    } else {
      // Customer: listen to messages from admin that are unread
      const messagesRef = collection(db, "chats", currentUser.uid, "messages");
      const q = query(messagesRef, where("read", "==", false), where("sender", "==", "admin"));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const unreadList = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          unreadList.push({
            id: doc.id,
            text: data.text,
            senderName: data.senderName,
            sender: data.sender,
            timestamp: data.timestamp,
            fromUserId: data.fromUid,
          });
        });
        setUnreadCount(unreadList.length);
        setNotifications(unreadList.slice(0, 5));
      }, (error) => {
        console.error("Customer notification listener error:", error);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser, isAdmin]);

  const markAsRead = async (notificationId, fromUserId) => {
    // We don't need to manually update Firestore because the onSnapshot will re-run.
    // But we must actually mark it as read. We'll call the update via the original reference.
    // However, the listener already listens to "read == false", so when we update, the item will disappear.
    // We'll use a Firestore update (you can also call a function from the parent)
    // Since we have the full doc reference, we can update it.
    try {
      const docRef = isAdmin 
        ? doc(db, "chats", ADMIN_UID, "messages", notificationId)
        : doc(db, "chats", currentUser.uid, "messages", notificationId);
      await updateDoc(docRef, { read: true });
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
              <div className="p-4 text-center text-white/40 text-sm">
                No new messages
              </div>
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