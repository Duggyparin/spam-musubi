import { useState, useEffect } from "react";
import { auth, db } from "../firebase/firebase";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, writeBatch } from "firebase/firestore";

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.read).length);
    });
    return unsubscribe;
  }, [currentUser]);

  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    // Use a batch to update all at once (faster)
    const batch = writeBatch(db);
    for (const id of unreadIds) {
      batch.update(doc(db, "notifications", id), { read: true });
    }
    await batch.commit();
    // Optimistic UI update: clear unread count immediately
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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
            <h3 className="text-sm font-bold text-white">Order Updates</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-amber-400 hover:text-amber-300">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-white/40">No notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 border-b border-white/10 cursor-pointer hover:bg-white/5 ${!n.read ? 'bg-amber-400/5' : ''}`}
                  onClick={() => markAsRead(n.id)}
                >
                  <p className="text-sm text-white">{n.message}</p>
                  <p className="text-white/30 text-xs mt-1">
                    {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : "Just now"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;