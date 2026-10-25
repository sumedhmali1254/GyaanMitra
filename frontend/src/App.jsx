import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SettingsProvider } from "./context/SettingsContext";
import { NotificationProvider } from "./context/NotificationContext";
import { MusicProvider } from "./context/MusicContext";
import { TimerProvider } from "./context/TimerContext";
import { ChatProvider } from "./context/ChatContext";
import toast, { Toaster } from "react-hot-toast";
import AppRoutes from "./routes/index";

function AuthScopedTimerProvider({ children }) {
  const { token } = React.useContext(AuthContext);
  return (
    <TimerProvider key={token ? "authenticated" : "signed-out"}>
      {children}
    </TimerProvider>
  );
}

function ToastCard({ toastItem }) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartX = useRef(null);
  useEffect(() => {
    if (!toastItem.visible) return undefined;
    const timeoutId = window.setTimeout(() => toast.remove(toastItem.id), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toastItem.id, toastItem.visible, toastItem.createdAt]);
  const handlePointerDown = (event) => {
    if (event.target.closest("button")) return;
    pointerStartX.current = event.clientX;
    setIsDragging(true);
  };

  const handlePointerMove = (event) => {
    if (pointerStartX.current !== null) {
      setDragX(event.clientX - pointerStartX.current);
    }
  };

  const handlePointerUp = (event) => {
    if (
      pointerStartX.current !== null &&
      Math.abs(event.clientX - pointerStartX.current) >= 80
    ) {
      toast.remove(toastItem.id);
    }
    pointerStartX.current = null;
    setIsDragging(false);
    setDragX(0);
  };

  const handlePointerCancel = () => {
    pointerStartX.current = null;
    setIsDragging(false);
    setDragX(0);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        ...toastItem.style,
        position: "relative",
        display: "block",
        padding: "11px 42px 11px 14px",
        minWidth: "190px",
        maxWidth: "300px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        boxSizing: "border-box",
        background:
          "linear-gradient(135deg, #ffffff 0%, #faf7f3 100%) padding-box, linear-gradient(135deg, rgba(121, 85, 72, 0.42), rgba(212, 163, 115, 0.3)) border-box",
        border: "1px solid transparent",
        boxShadow: "0 8px 22px rgba(75, 55, 45, 0.14)",
        opacity: toastItem.visible ? 1 : 0,
        transform: `translateX(${dragX}px)`,
        transition: isDragging
          ? "none"
          : "transform 0.2s ease, opacity 0.2s ease",
        touchAction: "pan-y",
        cursor: "grab",
        userSelect: "none",
      }}
      aria-label="Swipe to dismiss notification"
    >
      {typeof toastItem.message === "string"
        ? toastItem.message
        : toastItem.message(toastItem)}
      <button
        type="button"
        aria-label="Close notification"
        onPointerDown={(event) => {
          event.stopPropagation();
          pointerStartX.current = null;
          setIsDragging(false);
        }}
        onPointerCancel={(event) => event.stopPropagation()}
        onClick={() => toast.remove(toastItem.id)}
        style={{
          position: "absolute",
          top: "50%",
          right: "12px",
          transform: "translateY(-50%)",
          zIndex: 1,
          display: "grid",
          placeItems: "center",
          width: "22px",
          height: "22px",
          padding: 0,
          border: 0,
          borderRadius: "50%",
          background: "#f1f5f9",
          color: "#64748b",
          fontSize: "16px",
          fontWeight: 600,
          lineHeight: 1,
          cursor: "pointer",
          pointerEvents: "auto",
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <SettingsProvider>
            <MusicProvider>
              <ChatProvider>
                <AuthScopedTimerProvider>
                  <Router>
                    <AppRoutes />
                  </Router>
                </AuthScopedTimerProvider>
              </ChatProvider>
              <Toaster
                position="bottom-right"
                gutter={8}
                toastOptions={{
                  duration: 3500,
                  removeDelay: 200,
                  success: { duration: 3500 },
                  error: { duration: 3500 },
                  loading: { duration: 3500 },
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
                {(t) => <ToastCard toastItem={t} />}
              </Toaster>
            </MusicProvider>
          </SettingsProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
