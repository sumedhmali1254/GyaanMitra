import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SettingsProvider } from "./context/SettingsContext";
import { NotificationProvider } from "./context/NotificationContext";
import { MusicProvider } from "./context/MusicContext";
import { TimerProvider } from "./context/TimerContext";
import { ChatProvider } from "./context/ChatContext";
import { Toaster, toast } from "react-hot-toast";
import AppRoutes from "./routes/index";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <SettingsProvider>
            <TimerProvider>
              <MusicProvider>
                <ChatProvider>
                  <Router>
                    <AppRoutes />
                  </Router>
                </ChatProvider>
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#ffffff",
                  color: "#1e293b",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  borderRadius: "12px",
                  fontSize: "0.95rem",
                  border: "1px solid rgba(0,0,0,0.05)",
                },
              }}
            >
              {(t) => (
                <div
                  style={{
                    ...t.style,
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 12px",
                    minWidth: "250px",
                    opacity: t.visible ? 1 : 0,
                    transform: t.visible ? "translateY(0)" : "translateY(10px)",
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  <div style={{ flexGrow: 1, display: "flex", alignItems: "center", gap: "8px" }}>
                    {t.icon}
                    {typeof t.message === "string" ? t.message : t.message(t)}
                  </div>
                  {t.type !== "loading" && (
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      style={{
                        background: "rgba(0,0,0,0.05)",
                        border: "none",
                        borderRadius: "50%",
                        width: "28px",
                        height: "28px",
                        marginLeft: "12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        color: "#64748b",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#ef4444";
                        e.currentTarget.style.color = "white";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(0,0,0,0.05)";
                        e.currentTarget.style.color = "#64748b";
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
            </Toaster>
              </MusicProvider>
            </TimerProvider>
          </SettingsProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
