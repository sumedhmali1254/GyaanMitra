import React, { useState } from "react";
import dayjs from "dayjs";
import { useChat } from "../context/ChatContext";
import ConfirmationModal from "./ConfirmationModal";
import "./SubSidebar.css";

const ChatSubSidebar = () => {
  const { 
    chatSessions, 
    activeSessionId, 
    switchActiveSession, 
    startNewChat, 
    deleteChat, 
    renameChat, 
    isLoadingHistory,
    typingSessionIds
  } = useChat();

  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const requestDelete = (e, id) => {
    e.stopPropagation();
    // If it's a transient new chat, just delete immediately
    if (id.startsWith("new-")) {
      deleteChat(id);
    } else {
      setSessionToDelete(id);
    }
  };

  const confirmDelete = () => {
    if (sessionToDelete) {
      deleteChat(sessionToDelete);
      setSessionToDelete(null);
    }
  };

  const startEdit = (e, session) => {
    e.stopPropagation();
    if (session.id.startsWith("new-")) return; // Don't edit unsaved chats
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const saveEdit = () => {
    if (editingSessionId && editTitle.trim()) {
      renameChat(editingSessionId, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") setEditingSessionId(null);
  };

  return (
    <aside className="sub-sidebar">
      <div className="sub-sidebar-header">
        <h3 className="sub-sidebar-title">
          <i className="bi bi-chat-dots"></i> AI Chat History
        </h3>
      </div>

      <div className="sub-sidebar-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* NEW CHAT BUTTON */}
        <div style={{ padding: "15px 20px" }}>
          <button
            onClick={() => startNewChat()}
            className="btn w-100 d-flex align-items-center justify-content-center gap-2"
            style={{
              background: "var(--gradient-primary)",
              color: "white",
              borderRadius: "10px",
              padding: "10px",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(121, 85, 72, 0.2)"
            }}
          >
            <i className="bi bi-plus-lg"></i> Start New Chat
          </button>
        </div>

        <div style={{ height: "1px", background: "#e2e8f0", margin: "0 25px 15px" }}></div>

        {/* CHAT SESSIONS LIST */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 15px 20px" }}>
          {isLoadingHistory ? (
             <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>
               <span className="spinner-border spinner-border-sm me-2" role="status"></span>
               Loading chats...
             </div>
          ) : chatSessions.length === 0 ? (
             <div style={{ textAlign: "center", padding: "10px", fontSize: "0.85rem", color: "#94a3b8", fontStyle: "italic" }}>
                No past chats
             </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {chatSessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const isEditing = editingSessionId === session.id;

                return (
                  <div
                    key={session.id}
                    onClick={() => switchActiveSession(session.id)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      background: isActive ? "rgba(121, 85, 72, 0.08)" : "transparent",
                      border: `1px solid ${isActive ? "rgba(121, 85, 72, 0.2)" : "transparent"}`,
                      transition: "all 0.2s"
                    }}
                    className="chat-session-item"
                  >
                    <div style={{ overflow: "hidden", flex: 1, marginRight: "10px" }}>
                      {isEditing ? (
                        <input
                           type="text"
                           value={editTitle}
                           onChange={(e) => setEditTitle(e.target.value)}
                           onBlur={saveEdit}
                           onKeyDown={handleEditKeyDown}
                           onClick={(e) => e.stopPropagation()}
                           autoFocus
                           style={{
                             width: "100%",
                             padding: "2px 6px",
                             borderRadius: "4px",
                             border: "1px solid #795548",
                             fontSize: "0.85rem",
                             outline: "none"
                           }}
                        />
                      ) : (
                        <div
                          style={{
                            fontWeight: isActive ? 800 : 600,
                            fontSize: "0.85rem",
                            color: isActive ? "#795548" : "#475569",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                        >
                          {session.id.startsWith("new-") ? "New Chat (Unsaved)" : session.title}
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 500 }}>
                          {session.id.startsWith("new-") ? "Type to save" : dayjs(session.updatedAt).format("MMM DD, YYYY • h:mm A")}
                        </div>
                        {typingSessionIds[session.id] && (
                          <div className="typing-dot-mini" style={{ width: "6px", height: "6px", background: "#795548", borderRadius: "50%", animation: "pulse 1s infinite" }}></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="chat-actions d-flex gap-1" style={{ opacity: isActive || isEditing ? 1 : 0.6 }}>
                      {!session.id.startsWith("new-") && !isEditing && (
                        <button
                          onClick={(e) => startEdit(e, session)}
                          className="edit-chat-btn"
                          style={{
                            background: "none", border: "none", color: "#94a3b8",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            padding: "6px", borderRadius: "6px", cursor: "pointer"
                          }}
                          title="Rename Chat"
                        >
                          <i className="bi bi-pencil-square"></i>
                        </button>
                      )}
                      <button
                        onClick={(e) => requestDelete(e, session.id)}
                        className="delete-chat-btn"
                        style={{
                          background: "none", border: "none", color: "#94a3b8",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: "6px", borderRadius: "6px", cursor: "pointer"
                        }}
                        title="Delete Chat"
                      >
                        <i className="bi bi-trash3"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <style>{`
          .chat-session-item:hover {
            background: rgba(121, 85, 72, 0.04) !important;
          }
          .chat-session-item:hover .chat-actions {
            opacity: 1 !important;
          }
          .edit-chat-btn:hover {
            background: rgba(121, 85, 72, 0.1) !important;
            color: #795548 !important;
          }
          .delete-chat-btn:hover {
            background: rgba(239, 68, 68, 0.1) !important;
            color: #ef4444 !important;
          }
        `}</style>
      </div>

      <ConfirmationModal 
        show={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Chat Session?"
        message="Are you sure you want to permanently delete this chat history? This action cannot be undone."
        type="danger"
      />
    </aside>
  );
};

export default ChatSubSidebar;
