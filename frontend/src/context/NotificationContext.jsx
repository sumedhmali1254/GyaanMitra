import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const userId = user?.id || user?._id || "guest";

  // LocalStorage keys
  const NOTIFS_KEY = `gyaan_notifications_${userId}`;
  const NOTIF_PREFS_KEY = `gyaanmitra_notif_prefs_${userId}`;

  const [notifications, setNotifications] = useState([]);

  // Load from localStorage or initialize with welcome message
  useEffect(() => {
    const saved = localStorage.getItem(NOTIFS_KEY);
    const savedPrefsStr = localStorage.getItem(NOTIF_PREFS_KEY);
    let showDummy = true;
    if (savedPrefsStr) {
       try {
         const prefs = JSON.parse(savedPrefsStr);
         showDummy = prefs.showDummy !== false;
       } catch(e) {}
    }

    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch(e) { setNotifications([]); }
    } else if (showDummy && userId === "guest") {
      setNotifications([{
        id: Date.now(),
        type: "info",
        title: "Welcome to GyaanMitra!",
        message: "Start by signing up or logging in to personalize your experience.",
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        icon: "bi-stars",
      }]);
    } else {
      setNotifications([]);
    }
  }, [userId, NOTIFS_KEY, NOTIF_PREFS_KEY]);

  useEffect(() => {
    if (userId !== "guest" && notifications.length > 0) {
      localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifications));
    }
  }, [notifications, userId, NOTIFS_KEY]);


  const addNotification = (notif) => {
    const savedPrefsStr = localStorage.getItem(NOTIF_PREFS_KEY);
    if (savedPrefsStr) {
       try {
         const prefs = JSON.parse(savedPrefsStr);
         if (prefs.enableAll === false) return; // Mute notifications if disabled by user
       } catch(e) {}
    }

    setNotifications(prev => {
      // Avoid duplicate buffering notifications
      if (notif.id === "flashcard-buffer") {
        const filtered = prev.filter(n => n.id !== "flashcard-buffer");
        return [{ timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), ...notif }, ...filtered].slice(0, 20);
      }
      
      return [{
        id: Date.now() + Math.random(),
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        ...notif
      }, ...prev].slice(0, 20); // Keep max 20
    });
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  const clearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem(NOTIFS_KEY);
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};
