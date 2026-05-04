import React, { useState, useContext, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";

const Sidebar = ({ isOpen, isExpanded, onClose, onToggle }) => {
  const [isHovered, setIsHovered] = useState(false);
  const sidebarRef = useRef(null);
  const { theme } = useTheme();
  const { setActiveTab, activeTab } = useSettings();

  // On desktop, sidebar expands on hover if not explicitly collapsed
  const isDesktopExpanded = isExpanded || isHovered;

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: "bi-house-door" },
    { to: "/chatbot", label: "Gyaani AI", icon: "bi-chat-dots" },
    { to: "/planner", label: "Study Planner", icon: "bi-calendar-check" },
    { to: "/flashcards", label: "Flashcards", icon: "bi-stack" },
    { to: "/quiz", label: "Quiz Generator", icon: "bi-lightning-charge" },
    { to: "/notes", label: "Notes & To-Do", icon: "bi-journal-text" },
    { to: "/timer", label: "Focus Timer", icon: "bi-alarm" },
    { to: "/analytics", label: "Analytics", icon: "bi-graph-up" },
    { to: "/music", label: "Music Player", icon: "bi-music-note-beamed" },
    { to: "/settings", label: "Settings", icon: "bi-gear" },
  ];

  const { user } = useContext(AuthContext);

  return (
    <>
      <nav
        ref={sidebarRef}
        className={`sidebar ${isOpen ? "mobile-open" : ""} ${!isDesktopExpanded ? "collapsed" : ""}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="sidebar-header">
          <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: isDesktopExpanded ? 'flex-start' : 'center', padding: isDesktopExpanded ? '0' : '0' }}>
            {isDesktopExpanded ? (
              <img src="/gyaanmitra_mainlogo.png" alt="GyaanMitra" style={{ height: '32px', maxWidth: '100%', objectFit: 'contain' }} />
            ) : (
              <img src="/gyaanmitra_logo2.png" alt="GM" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
            )}
          </div>
          {isDesktopExpanded && (
            <button
              className="sidebar-toggle-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
              aria-label="Toggle sidebar"
            >
              <i className={`bi ${isExpanded ? "bi-chevron-left" : "bi-chevron-right"}`}></i>
            </button>
          )}
        </div>

        <div className="sidebar-nav">
          {links.map((link, index) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) => {
                const isSettings = link.label === "Settings";
                const isProfileActive = activeTab === "profile";
                const shouldBeActive = isActive && (!isSettings || !isProfileActive);
                
                return `sidebar-link animate-slide-in stagger-${index + 1}${shouldBeActive ? " active" : ""}`;
              }}
              style={{ opacity: 0 }}
              title={isDesktopExpanded ? "" : link.label}
            >
              <i className={`bi ${link.icon}`}></i>
              <span className="sidebar-link-text">{link.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="sidebar-footer">
          <NavLink
            to="/settings"
            onClick={() => {
              setActiveTab("profile");
              onClose();
            }}
            className={({ isActive }) =>
              `sidebar-user-link ${isActive && activeTab === 'profile' ? "active" : ""}`
            }
            title="View Profile"
          >
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">
                {user?.avatar ? (
                  <img
                    src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:5000${user.avatar}`}
                    alt={user?.firstName || "User"}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.parentElement.innerHTML = `<span>${user?.firstName?.charAt(0) || "U"}</span>`;
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                      display: "block",
                    }}
                  />
                ) : (
                  <span>{user?.firstName?.charAt(0) || "U"}</span>
                )}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.firstName || "User"}
                </div>
                <div className="sidebar-user-role">
                  {user?.role === "premium" || user?.isPremium
                    ? "Premium"
                    : "Free"}
                </div>
              </div>
            </div>
          </NavLink>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
