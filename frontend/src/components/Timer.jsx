import React, { useState, useEffect } from "react";
import { useTimer } from "../context/TimerContext";

const Timer = () => {
  const { 
    seconds, isActive, mode, sessions, modes, currentMode, progress, 
    formatTime, toggleTimer, resetTimer, changeMode, 
    customMinutes, setCustomMinutes, applyCustomTime 
  } = useTimer();

  const [showCustom, setShowCustom] = useState(mode === "custom");

  // Keyboard controls: Space=Start/Pause, R=Reset
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;
      if (e.code === "Space") {
        e.preventDefault();
        toggleTimer();
      } else if (e.code === "KeyR") {
        resetTimer(mode);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, toggleTimer, resetTimer]);

  const handleModeChange = (newMode) => {
    changeMode(newMode);
    setShowCustom(newMode === "custom");
  };

  // Calculate circle properties
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <div className="page-container">
      <div className="page-header text-center">
        <h1 className="page-title">Focus Timer</h1>
        <p className="page-subtitle">
          Stay focused with the Pomodoro Technique
        </p>
      </div>

      {/* Mode Selector */}
      <div className="d-flex justify-content-center gap-2 mb-5 flex-wrap">
        {modes.map((m) => (
          <button
            key={m.id}
            className="btn py-2 px-4"
            onClick={() => handleModeChange(m.id)}
            style={{
              background: mode === m.id ? m.color : "var(--bg-secondary)",
              border: mode === m.id ? "none" : "1px solid var(--bg-card-hover)",
              color: mode === m.id ? "white" : "var(--text-secondary)",
              opacity: mode === m.id ? 1 : 0.7,
              fontWeight: "600"
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Custom Timer Input */}
      {showCustom && (
        <div className="d-flex justify-content-center align-items-center gap-3 mb-4 animate-fade-in">
          <div className="input-group shadow-sm" style={{ maxWidth: '180px', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <input
              type="number"
              className="form-control text-center border-0"
              style={{ background: 'var(--bg-card)', fontWeight: '600', color: 'var(--text-primary)', fontSize: '1.1rem' }}
              min="1"
              max="120"
              value={customMinutes}
              onChange={(e) =>
                setCustomMinutes(
                  Math.max(1, Math.min(120, parseInt(e.target.value) || 1))
                )
              }
            />
            <span className="input-group-text border-0 text-muted" style={{ background: 'var(--bg-card)' }}>min</span>
          </div>
          <button className="btn btn-primary px-4 shadow-sm" style={{ borderRadius: '0.75rem', fontWeight: '600', background: '#ec4899', borderColor: '#ec4899' }} onClick={applyCustomTime}>
            <i className="bi bi-clock-history me-2"></i>Set
          </button>
        </div>
      )}

      {/* Timer Display */}
      <div className="text-center mb-5">
        <div className="timer-circle mx-auto" style={{ 
          background: "#fff", 
          borderRadius: "50%", 
          boxShadow: "0 15px 45px rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid rgba(121, 85, 72, 0.05)"
        }}>
          {/* Background Circle */}
          <svg viewBox="0 0 100 100">
            <circle className="bg-circle" cx="50" cy="50" r={radius} />
            {/* Progress Circle */}
            <circle
              className="progress-circle"
              cx="50"
              cy="50"
              r={radius}
              stroke={currentMode.color}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>

          {/* Time Display */}
          <div className="timer-time-display">
            <div className="timer-time">{formatTime(seconds)}</div>
            <div className="timer-label">
              {isActive ? "Focus time!" : "Ready to focus?"}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="d-flex justify-content-center gap-3 mb-5">
        <button
          className="btn py-3 px-5"
          onClick={toggleTimer}
          style={{
            background: "var(--gradient-primary)",
            boxShadow: "0 0 30px rgba(121, 85, 72, 0.4)",
            color: "white",
            fontWeight: "700"
          }}
        >
          <i className={`bi bi-${isActive ? 'pause-fill' : 'play-fill'} me-2`}></i>
          {isActive ? "Pause" : "Start"}
        </button>

        <button
          className="btn py-3 px-5"
          onClick={() => resetTimer(mode)}
          style={{
            background: "rgba(121, 85, 72, 0.1)",
            border: "1px solid rgba(121, 85, 72, 0.3)",
            color: "#795548",
            fontWeight: "600",
          }}
        >
          <i className="bi bi-arrow-counterclockwise me-2"></i>
          Reset
        </button>
      </div>

      {/* Session Stats */}
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-sm border-0" style={{ padding: "1.5rem", borderRadius: "1.5rem" }}>
            <div className="d-flex justify-content-around text-center">
              <div>
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2"
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "rgba(121, 85, 72, 0.1)",
                    color: "#795548"
                  }}
                >
                  <i className="bi bi-check2-circle" style={{ fontSize: "1.25rem" }}></i>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)" }}>
                  {sessions}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: "600" }}>
                  SESSIONS
                </div>
              </div>
              <div>
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2"
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#10b981"
                  }}
                >
                  <i className="bi bi-clock" style={{ fontSize: "1.25rem" }}></i>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)" }}>
                  {Math.floor(sessions * 25)}m
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: "600" }}>
                  TOTAL TIME
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-4 text-center">
          <p className="mb-0 text-muted small">
            <i className="bi bi-lightbulb-fill text-warning me-2"></i>
            Tip: Take a 5 minute break after 25 minutes of focused work!
          </p>
      </div>
    </div>
  );
};

export default Timer;
