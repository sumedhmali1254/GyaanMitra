import React, { useContext } from "react";
import "./SubSidebar.css";
import { useSettings } from "../context/SettingsContext";
import { AuthContext } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { usePersistentBoolean } from "../hooks/usePersistentBoolean";

const SettingsSubSidebar = () => {
  const [isCollapsed, setIsCollapsed] = usePersistentBoolean(
    "gyaanmitra.sidebar.settings.collapsed",
    false,
  );
  const { activeTab, setActiveTab } = useSettings();
  const { logout } = useContext(AuthContext);
  const { aiStatus } = useChat();

  const statusColor = aiStatus === "connected" ? "#22c55e" : aiStatus === "checking" ? "#f59e0b" : "#ef4444";
  const statusLabel = aiStatus === "connected" ? "Connected" : aiStatus === "checking" ? "Checking..." : "Disconnected";
  const statusBg = aiStatus === "connected" ? "rgba(34,197,94,0.08)" : aiStatus === "checking" ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)";
  const statusBorder = aiStatus === "connected" ? "rgba(34,197,94,0.2)" : aiStatus === "checking" ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)";

  return (
    <aside className={`sub-sidebar collapsible-sub-sidebar ${isCollapsed ? "is-collapsed" : ""}`}>
      <button
        type="button"
        className="sub-sidebar-toggle"
        onClick={() => setIsCollapsed((collapsed) => !collapsed)}
        aria-label={isCollapsed ? "Expand settings sidebar" : "Collapse settings sidebar"}
        aria-expanded={!isCollapsed}
        title={isCollapsed ? "Expand settings sidebar" : "Collapse settings sidebar"}
      >
        <i className={`bi ${isCollapsed ? "bi-chevron-right" : "bi-chevron-left"}`} />
      </button>
      <span className="sub-sidebar-collapsed-label" aria-hidden="true">SETTINGS</span>
      {/* Fixed Header */}
      <div className="sub-sidebar-header">
        <h3 className="sub-sidebar-title">
          <i className="bi bi-gear"></i>
          Settings Subsidebar
        </h3>
      </div>

      {/* Scrollable Content */}
      <div className="sub-sidebar-content">
        
        <div className="sub-sidebar-stats mb-4">
          <h6 className="text-muted fw-bold mb-3 text-uppercase small" style={{ letterSpacing: '0.05rem', color: '#94a3b8' }}>User Preferences</h6>
          <div className="stats-cards-grid d-flex flex-column gap-3 mb-4">
            {[
              { id: 'profile', icon: 'bi-person', title: 'Profile', desc: 'Manage your identity' },
              { id: 'notifications', icon: 'bi-bell', title: 'Notifications', desc: 'Alert & badge settings' },
              { id: 'flashcards', icon: 'bi-stack', title: 'Flashcards', desc: 'Generation rules' }
            ].map(tab => (
              <div 
                key={tab.id}
                className="stat-card cursor-pointer p-3"
                onClick={() => setActiveTab(tab.id)}
                style={{ 
                  cursor: 'pointer', 
                  transition: 'all 0.2s ease', 
                  border: activeTab === tab.id ? '2px solid #795548' : '1px solid rgba(121, 85, 72, 0.08)',
                  background: activeTab === tab.id ? 'rgba(121, 85, 72, 0.05)' : 'white',
                  borderRadius: '14px',
                  boxShadow: activeTab === tab.id ? '0 4px 12px rgba(121, 85, 72, 0.08)' : 'none'
                }}
              >
                <div className="d-flex align-items-center">
                  <div 
                    className="d-flex align-items-center justify-content-center me-3"
                    style={{
                      width: '42px',
                      height: '42px',
                      background: activeTab === tab.id ? '#795548' : 'rgba(121, 85, 72, 0.05)',
                      color: activeTab === tab.id ? 'white' : '#795548',
                      borderRadius: '12px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <i className={`bi ${tab.icon}`} style={{ fontSize: '1.2rem' }}></i>
                  </div>
                  <div>
                    <div className="fw-bold" style={{ fontSize: '0.9rem', color: '#1e293b' }}>{tab.title}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{tab.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h6 className="text-muted fw-bold mb-3 text-uppercase small" style={{ letterSpacing: '0.05rem', color: '#94a3b8' }}>Study Data</h6>
          <div className="stats-cards-grid d-flex flex-column gap-3">
            {[
              { id: 'pdf', icon: 'bi-file-earmark-pdf', title: 'PDF Upload', desc: 'Syllabus extraction' },
              { id: 'manual', icon: 'bi-keyboard', title: 'Manual Entry', desc: 'Course structure' },
              { id: 'manage', icon: 'bi-database', title: 'Manage Data', desc: 'Saved courses' }
            ].map(tab => (
              <div 
                key={tab.id}
                className="stat-card cursor-pointer p-3"
                onClick={() => setActiveTab(tab.id)}
                style={{ 
                  cursor: 'pointer', 
                  transition: 'all 0.2s ease', 
                  border: activeTab === tab.id ? '2px solid #795548' : '1px solid rgba(121, 85, 72, 0.08)',
                  background: activeTab === tab.id ? 'rgba(121, 85, 72, 0.05)' : 'white',
                  borderRadius: '14px',
                  boxShadow: activeTab === tab.id ? '0 4px 12px rgba(121, 85, 72, 0.08)' : 'none'
                }}
              >
                <div className="d-flex align-items-center">
                  <div 
                    className="d-flex align-items-center justify-content-center me-3"
                    style={{
                      width: '42px',
                      height: '42px',
                      background: activeTab === tab.id ? '#795548' : 'rgba(121, 85, 72, 0.05)',
                      color: activeTab === tab.id ? 'white' : '#795548',
                      borderRadius: '12px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <i className={`bi ${tab.icon}`} style={{ fontSize: '1.2rem' }}></i>
                  </div>
                  <div>
                    <div className="fw-bold" style={{ fontSize: '0.9rem', color: '#1e293b' }}>{tab.title}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{tab.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* LM Studio Connection Status */}
        <div className="sub-sidebar-footer">
          <div 
            className="p-3"
            style={{ 
              background: statusBg,
              border: `1px solid ${statusBorder}`,
              borderRadius: '14px',
              transition: 'all 0.3s ease'
            }}
          >
            <div className="d-flex align-items-center">
              <div 
                className="d-flex align-items-center justify-content-center me-3"
                style={{
                  width: '42px',
                  height: '42px',
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  position: 'relative'
                }}
              >
                <i className="bi bi-cpu" style={{ fontSize: '1.2rem', color: '#795548' }}></i>
                <span 
                  style={{
                    position: 'absolute',
                    bottom: '3px',
                    right: '3px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: statusColor,
                    border: '2px solid white',
                    boxShadow: `0 0 6px ${statusColor}`,
                    animation: aiStatus === 'connected' ? 'pulse 2s infinite' : aiStatus === 'checking' ? 'pulse 1s infinite' : 'none'
                  }}
                />
              </div>
              <div>
                <div className="fw-bold" style={{ fontSize: '0.85rem', color: '#1e293b' }}>LM Studio</div>
                <div style={{ 
                  fontSize: '0.72rem', 
                  fontWeight: 600, 
                  color: statusColor,
                  letterSpacing: '0.02em'
                }}>
                  {statusLabel}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SettingsSubSidebar;
