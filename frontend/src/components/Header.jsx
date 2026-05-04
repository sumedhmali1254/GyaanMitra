import React, { useState, useEffect, useRef, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { MusicContext } from "../context/MusicContext";
import { useNotifications } from "../context/NotificationContext";
import { useTimer } from "../context/TimerContext";
import { AuthContext } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import "./Header.css";

const Header = ({ sidebarOpen, toggleSidebar, getPageTitle }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const { setActiveTab } = useSettings();

  const { isPlaying, togglePlay, nextTrack, prevTrack, isMuted, setIsMuted, current, tracks, hasStarted, showMiniPlayer, setShowMiniPlayer } = useContext(MusicContext);
  const currentTrack = hasStarted && current !== null && showMiniPlayer ? tracks[current] : null;

  const { 
    seconds, 
    isActive, 
    toggleTimer, 
    mode, 
    formatTime, 
    resetTimer, 
    showMiniTimer, 
    setShowMiniTimer,
    stopAlarm
  } = useTimer();

  // Searchable routes catalog
  const searchableFeatures = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Courses", path: "/courses" },
    { name: "Study Planner", path: "/study-planner" },
    { name: "Flashcards", path: "/flashcards" },
    { name: "Focus Timer", path: "/timer" },
    { name: "Notes & To-Do", path: "/notes" },
    { name: "AI Chatbot", path: "/chatbot" },
    { name: "Profile Settings", path: "/settings", action: () => setActiveTab("profile") },
    { name: "Settings", path: "/settings" },
    { name: "Notification Settings", path: "/settings" },
    { name: "Flashcard Settings", path: "/settings" },
    { name: "Account Settings", path: "/settings" },
    { name: "Theme Settings", path: "/settings" }
  ];

  const searchResults = searchableFeatures.filter(feature => 
    feature.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchSelect = (path) => {
    navigate(path);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const { notifications, clearNotifications, removeNotification } = useNotifications();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowProfile(false);
  };

  const toggleProfile = () => {
    setShowProfile(!showProfile);
    setShowNotifications(false);
  };

  return (
    <header className="header">
      <button
        className="header-toggle d-lg-none"
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        <i className={`bi ${sidebarOpen ? "bi-x-lg" : "bi-list"}`}></i>
      </button>

      <div className="header-title d-md-none">
        <h2>{getPageTitle}</h2>
      </div>

      <div className="header-search d-none d-md-block position-relative" ref={searchRef}>
        <i className="bi bi-search"></i>
        <input 
          type="text" 
          placeholder="Search features..." 
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSearchResults(true);
          }}
          onFocus={() => setShowSearchResults(true)}
        />
        
        {/* Global Search Dropdown */}
        {showSearchResults && searchQuery.trim() !== "" && (
          <div className="header-dropdown animate-fade-in" style={{ width: '100%', top: '100%', left: 0, marginTop: '8px', zIndex: 1050 }}>
            <div className="dropdown-body p-2">
              {searchResults.length > 0 ? (
                searchResults.map((item, index) => (
                  <div 
                    key={index} 
                    className="dropdown-item d-flex align-items-center mb-1 py-3 px-4" 
                    onClick={() => handleSearchSelect(item.path)}
                    style={{ cursor: "pointer", transition: "all 0.2s" }}
                  >
                    <span className="fw-medium text-dark-emphasis">{item.name}</span>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-muted">
                  <i className="bi bi-search mb-2 fs-5 d-block" style={{ opacity: 0.5 }}></i>
                  <small>No matching features found</small>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="header-actions">
        {/* Mini Focus Timer (Hide on /timer) */}
        {location.pathname !== "/timer" && showMiniTimer && (
          <div className="d-flex align-items-center rounded-pill px-3 py-1 me-2 animate-fade-in" style={{ background: "var(--bg-secondary)", border: "1px solid rgba(255,255,255,0.05)", height: "38px" }}>
            <div className="d-flex align-items-center justify-content-center rounded-circle me-2" style={{ width: "24px", height: "24px", background: "white", border: `1.5px solid ${mode === 'pomodoro' ? '#795548' : mode === 'break' ? '#10b981' : '#ec4899'}`, flexShrink: 0, position: 'relative' }}>
              <i className="bi bi-hourglass-split" style={{ fontSize: "0.7rem", color: mode === 'pomodoro' ? '#795548' : mode === 'break' ? '#10b981' : '#ec4899' }}></i>
            </div>
            
            <div className="me-2 d-flex align-items-center">
              <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)" }}>{formatTime(seconds)}</div>
            </div>

            <div className="d-flex align-items-center gap-1 border-start border-secondary-subtle ps-2 ms-1">
              <button className="btn btn-sm p-0" onClick={toggleTimer} style={{ color: isActive ? "#ef4444" : "var(--text-primary)" }}>
                <i className={`bi bi-${isActive ? "pause-fill" : "play-fill"} fs-5`}></i>
              </button>
              <button className="btn btn-sm p-0" onClick={() => resetTimer()} style={{ color: "var(--text-muted)" }}>
                <i className="bi bi-arrow-counterclockwise"></i>
              </button>
              <button className="btn btn-sm p-0 ms-1" onClick={() => setShowMiniTimer(false)} style={{ color: "var(--text-muted)" }}>
                <i className="bi bi-x fs-5"></i>
              </button>
            </div>
          </div>
        )}

        {/* Mini Player (Hide on /music) */}
        {location.pathname !== "/music" && currentTrack && (
          <div className="d-none d-md-flex align-items-center rounded-pill px-3 py-1 me-2 animate-fade-in" style={{ background: "var(--bg-secondary)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="d-flex align-items-center justify-content-center rounded-circle me-2" style={{ width: "24px", height: "24px", background: "var(--gradient-primary)", flexShrink: 0, overflow: "hidden" }}>
              {currentTrack.poster ? (
                 <img src={currentTrack.poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                 <i className={`bi ${currentTrack.cover} text-white`} style={{ fontSize: "0.6rem" }}></i>
              )}
            </div>
            <div className="me-2" style={{ maxWidth: "100px", overflow: "hidden" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: "600", color: "var(--text-primary)", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{currentTrack.title}</div>
            </div>
            
            <div className="d-flex align-items-center gap-1">
              <button className="btn btn-sm p-0" onClick={prevTrack} style={{ color: "var(--text-muted)" }}>
                <i className="bi bi-skip-start-fill"></i>
              </button>
              <button className="btn btn-sm p-0" onClick={togglePlay} style={{ color: "var(--text-primary)" }}>
                <i className={`bi ${isPlaying ? "bi-pause-fill" : "bi-play-fill"} fs-5`}></i>
              </button>
              <button className="btn btn-sm p-0" onClick={nextTrack} style={{ color: "var(--text-muted)" }}>
                <i className="bi bi-skip-end-fill"></i>
              </button>
              <button className="btn btn-sm p-0 ms-1" onClick={() => setIsMuted(!isMuted)} style={{ color: isMuted ? "#ef4444" : "var(--text-muted)" }}>
                <i className={`bi ${isMuted ? "bi-volume-mute-fill" : "bi-volume-up-fill"}`}></i>
              </button>
              <button className="btn btn-sm p-0 ms-1" onClick={() => setShowMiniPlayer(false)} style={{ color: "var(--text-muted)" }}>
                <i className="bi bi-x fs-5"></i>
              </button>
            </div>
          </div>
        )}

        {/* Notification Button */}
        <div className="header-action-item" ref={notificationRef}>
          <button
            className={`header-btn position-relative ${showNotifications ? "active" : ""}`}
            title="Notifications"
            onClick={toggleNotifications}
          >
            <i className="bi bi-bell"></i>
            {notifications && notifications.length > 0 && (
               <span className="badge">
                 {notifications.length > 99 ? '99+' : notifications.length}
               </span>
            )}
          </button>

          {showNotifications && (
            <div className="header-dropdown notifications-dropdown">
              <div className="dropdown-header">
                <h5>Notifications</h5>
                <button
                  onClick={() => clearNotifications()}
                  style={{
                    fontSize: "0.75rem",
                    color: "#795548",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Mark all as read
                </button>
              </div>
              <div className="dropdown-body">
                {notifications && notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className="notification-item" 
                      style={{ position: 'relative', paddingRight: '2rem', cursor: notif.id === 'timer-finished-alarm' ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (notif.id === 'timer-finished-alarm') {
                          stopAlarm();
                        }
                      }}
                    >
                      <div
                        className="notification-icon"
                        style={{
                          background:
                            notif.type === "success"
                              ? "#dcfce7"
                              : notif.type === "info"
                                ? "#dbeafe"
                                : notif.type === "warning" || notif.type === "loading"
                                  ? "#fef3c7"
                                  : "#fee2e2",
                          color:
                            notif.type === "success"
                              ? "#10b981"
                              : notif.type === "info"
                                ? "#3b82f6"
                                : notif.type === "warning" || notif.type === "loading"
                                  ? "#f59e0b"
                                  : "#ef4444",
                        }}
                      >
                        {notif.type === "loading" ? (
                           <div className="spinner-border spinner-border-sm" role="status"></div>
                        ) : (
                           <i className={`bi ${notif.icon || "bi-bell"}`}></i>
                        )}
                      </div>
                      <div className="notification-content">
                        <p className="notification-title">{notif.title}</p>
                        <p className="notification-message">{notif.message}</p>
                        <p className="notification-time">{notif.timestamp}</p>
                      </div>
                      <button 
                         onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                         style={{
                           position: 'absolute',
                           top: '0.75rem',
                           right: '0.75rem',
                           background: 'none',
                           border: 'none',
                           color: '#94a3b8',
                           cursor: 'pointer',
                           padding: '0.2rem',
                           fontSize: '1rem',
                           display: 'flex',
                           alignItems: 'flex-start'
                         }}
                         title="Remove notification"
                      >
                         <i className="bi bi-x"></i>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted">No new notifications</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Button */}
        <div className="header-action-item" ref={profileRef}>
          <button
            className={`header-btn ${showProfile ? "active" : ""}`}
            title="Profile"
            onClick={toggleProfile}
            style={{ padding: user?.avatar ? '2px' : '0' }}
          >
            {user?.avatar ? (
              <div 
                style={{ 
                  width: "32px", 
                  height: "32px", 
                  borderRadius: "50%", 
                  backgroundImage: `url(http://localhost:5000${user.avatar})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '2px solid rgba(121, 85, 72, 0.2)'
                }} 
              />
            ) : (
              <i className="bi bi-person-circle"></i>
            )}
          </button>

          {showProfile && (
            <div className="header-dropdown profile-dropdown">
              <div className="dropdown-header">
                <h5 className="mb-0">Account</h5>
              </div>
              <div className="dropdown-body">
                <Link
                  to="/settings"
                  className="dropdown-item"
                  onClick={() => {
                    setActiveTab("profile");
                    setShowProfile(false);
                  }}
                >
                  <i className="bi bi-person"></i>
                  <span>Profile</span>
                </Link>
                <Link
                  to="/settings"
                  className="dropdown-item"
                  onClick={() => {
                    setActiveTab("pdf"); // Default settings tab
                    setShowProfile(false);
                  }}
                >
                  <i className="bi bi-gear"></i>
                  <span>Settings</span>
                </Link>
              </div>
              <div className="dropdown-footer">
                <button className="logout-btn" onClick={logout}>
                  <i className="bi bi-box-arrow-right"></i>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
