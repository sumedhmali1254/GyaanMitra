import React, { useState, useRef, useEffect } from "react";
import api from "../services/api";
import { useChat } from "../context/ChatContext";

const ChatbotPage = () => {
  const [input, setInput] = useState("");
  const { 
    messages, 
    isTyping, 
    aiStatus, 
    aiModels, 
    sendMessage, 
    cancelChat,
    startNewChat,
    activeSessionId
  } = useChat();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clear input when switching chats
  useEffect(() => {
    setInput("");
  }, [activeSessionId]);

  const handleSend = async () => {
    const messageText = input;
    if (!messageText.trim()) return;

    // If no active session, create one first then send
    if (!activeSessionId) {
      const newId = await startNewChat(true);
      setInput("");
      await sendMessage(messageText, newId);
      return;
    }
    
    setInput("");
    await sendMessage(messageText);
  };

  const formatTime = (date) => {
    try {
      const d = date instanceof Date ? date : new Date(date);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  };

  const quickQuestions = [
    "What features does GyaanMitra have?",
    "How does the Study Planner work?",
    "Can you generate quizzes and flashcards?",
    "How do I track my study progress?"
  ];

  const hasActiveChat = activeSessionId !== null;

  return (
    <div
      className="page-container"
      style={{
        height: "calc(100vh - 100px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div className="page-header">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{
                width: "50px",
                height: "50px",
                background: "var(--gradient-primary)",
                boxShadow: "0 0 20px rgba(121, 85, 72, 0.4)",
                position: "relative",
              }}
            >
              <i
                className="bi bi-robot text-white"
                style={{ fontSize: "1.5rem" }}
              ></i>
              <span
                style={{
                  position: "absolute",
                  bottom: "2px",
                  right: "2px",
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  border: "2px solid white",
                  background:
                    aiStatus === "connected"
                      ? "#22c55e"
                      : aiStatus === "disconnected"
                        ? "#ef4444"
                        : "#f59e0b",
                  animation:
                    aiStatus === "connected"
                      ? "pulse 2s infinite"
                      : "none",
                }}
              />
            </div>
            <div>
              <h1 className="page-title" style={{ marginBottom: 0 }}>
                Gyaani - AI Assistant
              </h1>
              <p className="page-subtitle" style={{ marginBottom: 0 }}>
                Powered by Qwen (LM Studio)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div
        className="card flex-grow-1 mb-3"
        style={{
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Messages */}
        <div
          className="flex-grow-1 p-3"
          style={{
            overflowY: "auto",
            background:
              "linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)",
          }}
        >
          {/* Welcome state when no messages exist */}
          {messages.length === 0 && !isTyping && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              textAlign: "center",
              padding: "40px 20px"
            }}>
              <div style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "var(--gradient-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
                boxShadow: "0 8px 25px rgba(121, 85, 72, 0.3)"
              }}>
                <i className="bi bi-robot text-white" style={{ fontSize: "2.5rem" }}></i>
              </div>
              <h3 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "8px" }}>
                Welcome to Gyaani AI!
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: "400px", marginBottom: "20px" }}>
                Start a new chat from the sidebar or type a question below. I'm here to help you study smarter!
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`d-flex mb-3 ${msg.from === "user" ? "justify-content-end" : "justify-content-start"}`}
              style={{ animation: "fadeIn 0.3s ease-out" }}
            >
              {msg.from === "ai" && (
                <div className="d-flex align-items-end me-2">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "var(--gradient-primary)",
                    }}
                  >
                    <i
                      className="bi bi-robot text-white"
                      style={{ fontSize: "0.875rem" }}
                    ></i>
                  </div>
                </div>
              )}

              <div
                className="p-3"
                style={{
                  maxWidth: "70%",
                  background:
                    msg.from === "user"
                      ? "var(--gradient-primary)"
                      : "var(--bg-card)",
                  borderRadius:
                    msg.from === "user"
                      ? "1rem 1rem 0 1rem"
                      : "1rem 1rem 1rem 0",
                  border:
                    msg.from === "ai"
                      ? "1px solid #e2e8f0"
                      : "none",
                  boxShadow:
                    msg.from === "user"
                      ? "0 4px 15px rgba(121, 85, 72, 0.3)"
                      : "none",
                }}
              >
                <p className="mb-1" style={{ color: msg.from === "user" ? "white" : "var(--text-primary)", whiteSpace: "pre-wrap" }}>
                  {msg.text}
                </p>
                <small
                  style={{ color: msg.from === "user" ? "rgba(255,255,255,0.8)" : "var(--text-muted)", fontSize: "0.7rem" }}
                >
                  {formatTime(msg.time)}
                </small>
              </div>

              {msg.from === "user" && (
                <div className="d-flex align-items-end ms-2">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "var(--bg-secondary)",
                    }}
                  >
                    <i
                      className="bi bi-person text-white"
                      style={{ fontSize: "0.875rem" }}
                    ></i>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator - only if messages exist to avoid 'floating' indicator */}
          {isTyping && messages.length > 0 && (
            <div className="d-flex mb-3">
              <div className="d-flex align-items-end me-2">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle"
                  style={{
                    width: "32px",
                    height: "32px",
                    background: "var(--gradient-primary)",
                  }}
                >
                  <i
                    className="bi bi-robot text-white"
                    style={{ fontSize: "0.875rem" }}
                  ></i>
                </div>
              </div>
              <div
                className="p-3 d-flex align-items-center"
                style={{
                  background: "var(--bg-card)",
                  borderRadius: "1rem 1rem 1rem 0",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div className="d-flex gap-1">
                  <span style={{ width: "8px", height: "8px", background: "var(--text-muted)", borderRadius: "50%", animation: "pulse 1s infinite" }}></span>
                  <span style={{ width: "8px", height: "8px", background: "var(--text-muted)", borderRadius: "50%", animation: "pulse 1s infinite 0.2s" }}></span>
                  <span style={{ width: "8px", height: "8px", background: "var(--text-muted)", borderRadius: "50%", animation: "pulse 1s infinite 0.4s" }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions - show when few messages or welcome state */}
        {messages.length === 0 && (
          <div className="px-3 pb-2">
            <small style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
              Quick questions:
            </small>
            <div className="d-flex gap-2 flex-wrap mt-1">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  className="btn btn-sm"
                  onClick={() => setInput(q)}
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid #e2e8f0",
                    color: "var(--text-secondary)",
                    fontSize: "0.75rem",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div
          className="p-3"
          style={{
            background: "var(--bg-card)",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div className="d-flex gap-2">
            <input
              type="text"
              className="form-control"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isTyping && handleSend()}
              disabled={isTyping}
              style={{
                background: "var(--bg-primary)",
                border: "1px solid #e2e8f0",
                padding: "0.875rem 1rem",
              }}
            />
            {isTyping ? (
              <button
                className="btn"
                onClick={cancelChat}
                style={{
                  background: "#dc2626",
                  padding: "0 1.25rem",
                  color: "white",
                  fontWeight: "bold"
                }}
                title="Cancel Generation"
              >
                <i className="bi bi-stop-circle"></i>
              </button>
            ) : (
              <button
                className="btn"
                onClick={() => handleSend()}
                disabled={!input.trim()}
                style={{
                  background: "var(--gradient-primary)",
                  padding: "0 1.25rem",
                  color: "white",
                }}
              >
                <i className="bi bi-send"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;
