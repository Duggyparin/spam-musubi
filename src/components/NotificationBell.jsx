import { useState, useEffect } from "react";
import { auth, db } from "../firebase/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

const NotificationBell = ({ onOpenChat }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const currentUser = auth.currentUser;
  const isAdmin = currentUser?.email === "monsanto.bryann@gmail.com";

  useEffect(() => {
    if (!currentUser) return;

    const fetchUnreadMessages = async () => {
      try {
        let totalUnread = 0;
        const unreadList = [];

        // Get all reservations to find customer IDs (for admin)
        const reservationsSnap = await getDocs(collection(db, "reservations"));
        const userIds = [...new Set(reservationsSnap.docs.map(doc => doc.data().userId))];
        
        const userIdsToCheck = isAdmin ? userIds : [currentUser.uid];
        
        for (const uid of userIdsToCheck) {
          try {
            const messagesRef = collection(db, "chats", uid, "messages");
            const messagesSnap = await getDocs(messagesRef);
            
            messagesSnap.forEach((msgDoc) => {
              const msgData = msgDoc.data();
              
              // Admin sees unread from customers; customer sees unread from admin
              const shouldShow = isAdmin 
                ? msgData.sender === "customer" && msgData.read === false
                : msgData.sender === "admin" && msgData.read === false;
              
              if (shouldShow) {
                totalUnread++;
                unreadList.push({
                  id: msgDoc.id,
                  text: msgData.text,
                  senderName: msgData.senderName,
                  sender: msgData.sender,
                  timestamp: msgData.timestamp,
                  fromUserId: uid
                });
              }
            });
          } catch (e) {
            // Chat collection doesn't exist for this user - ignore
          }
        }
        
        setUnreadCount(totalUnread);
        setNotifications(unreadList.slice(0, 5));
      } catch (error) {
        console.error("Error fetching unread messages:", error);
      }
    };
    
    fetchUnreadMessages();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchUnreadMessages, 10000);
    return () => clearInterval(interval);
  }, [currentUser, isAdmin]);

  const markAsRead = async (notificationId, fromUserId) => {
    try {
      const messageRef = doc(db, "chats", fromUserId, "messages", notificationId);
      await updateDoc(messageRef, { read: true });
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    for (const notification of notifications) {
      await markAsRead(notification.id, notification.fromUserId);
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
                    {notif.timestamp ? new Date(notif.timestamp).toLocaleTimeString() : "Just now"}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="p-2 border-t border-white/10">
            <button
              onClick={() => {
                setShowDropdown(false);
                if (onOpenChat) onOpenChat(null); // optional: open chat list without selecting a specific user
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