import React, { createContext, useState, useEffect, useRef, useContext, useCallback } from "react";
import api from "../services/api";
import { AuthContext } from "./AuthContext";
import { SettingsContext } from "./SettingsContext";

export const TimerContext = createContext();

export const useTimer = () => useContext(TimerContext);

export const TimerProvider = ({ children }) => {
  const { token } = useContext(AuthContext);
  const { timerSettings, updateTimerSettings } = useContext(SettingsContext);
  
  const [seconds, setSeconds] = useState((timerSettings?.focusDuration || 25) * 60);
  const [totalSeconds, setTotalSeconds] = useState((timerSettings?.focusDuration || 25) * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState("pomodoro");
  const [sessions, setSessions] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(timerSettings?.focusDuration || 25);
  const [showMiniTimer, setShowMiniTimer] = useState(false);
  const audioRef = useRef(null);
  const sessionStartTimeRef = useRef(null);

  // Synchronize when settings change from elsewhere
  useEffect(() => {
    if (!isActive) {
      if (mode === "pomodoro") {
        setSeconds((timerSettings?.focusDuration || 25) * 60);
        setTotalSeconds((timerSettings?.focusDuration || 25) * 60);
      } else if (mode === "break") {
        setSeconds((timerSettings?.breakDuration || 5) * 60);
        setTotalSeconds((timerSettings?.breakDuration || 5) * 60);
      }
    }
  }, [timerSettings, mode, isActive]);

  const modes = [
    { id: "pomodoro", label: "Pomodoro", time: (timerSettings?.focusDuration || 25) * 60, color: "#795548" },
    { id: "break", label: "Break", time: (timerSettings?.breakDuration || 5) * 60, color: "#10b981" },
    { id: "custom", label: "Custom", time: (timerSettings?.focusDuration || 25) * 60, color: "#ec4899" },
  ];

  // Record session to DB
  const recordSession = useCallback(async () => {
    if (!token || !sessionStartTimeRef.current) return;
    try {
      const duration = Math.floor((totalSeconds - seconds) / 60);
      if (duration < 1) return; // Don't log sessions shorter than 1 minute
      
      await api.post("/sessions", {
        duration,
        mode,
        startTime: sessionStartTimeRef.current,
        endTime: new Date(),
        status: seconds === 0 ? "completed" : "interrupted"
      });
      console.log(`[Timer] Logged ${duration}m ${mode} session.`);
    } catch (error) {
      console.error("Error logging study session:", error);
    }
  }, [token, seconds, totalSeconds, mode]);

  // Core countdown logic
  useEffect(() => {
    let interval = null;
    if (isActive && seconds > 0) {
      if (!sessionStartTimeRef.current) sessionStartTimeRef.current = new Date();
      interval = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else if (isActive && seconds === 0) {
      setIsActive(false);
      setSessions((s) => s + 1);
      recordSession(); // Save when finished
      sessionStartTimeRef.current = null;
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    }
    return () => clearInterval(interval);
  }, [isActive, seconds, recordSession]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
  };

  const startTimer = () => {
    // If we're at 00:00, reset to the current mode's duration before starting a new session
    if (seconds === 0) {
      if (mode === "custom") {
        setSeconds(customMinutes * 60);
        setTotalSeconds(customMinutes * 60);
      } else {
        const modeObj = modes.find((m) => m.id === mode);
        setSeconds(modeObj.time);
        setTotalSeconds(modeObj.time);
      }
    }
    
    setIsActive(true);
    setShowMiniTimer(true);
    sessionStartTimeRef.current = new Date();
  };

  const pauseTimer = () => {
    setIsActive(false);
    recordSession(); // Log partial session if paused/interrupted
    sessionStartTimeRef.current = null;
  };

  const toggleTimer = () => {
    if (!isActive) {
      startTimer();
    } else {
      pauseTimer();
    }
  };

  const resetTimer = (newMode = mode) => {
    setIsActive(false);
    sessionStartTimeRef.current = null;
    if (newMode === "custom") {
      setSeconds(customMinutes * 60);
      setTotalSeconds(customMinutes * 60);
    } else {
      const modeObj = modes.find((m) => m.id === newMode);
      setSeconds(modeObj.time);
      setTotalSeconds(modeObj.time);
    }
  };

  const changeMode = (newMode) => {
    setMode(newMode);
    resetTimer(newMode);
  };

  const applyCustomTime = () => {
    setIsActive(false);
    setSeconds(customMinutes * 60);
    setTotalSeconds(customMinutes * 60);
  };

  const currentMode = modes.find((m) => m.id === mode);
  const elapsed = totalSeconds - seconds;
  const progress = totalSeconds > 0 ? (elapsed / totalSeconds) * 100 : 0;

  return (
    <TimerContext.Provider
      value={{
        seconds,
        totalSeconds,
        isActive,
        mode,
        sessions,
        customMinutes,
        setCustomMinutes,
        showMiniTimer,
        setShowMiniTimer,
        modes,
        currentMode,
        progress,
        formatTime,
        startTimer,
        pauseTimer,
        toggleTimer,
        resetTimer,
        changeMode,
        applyCustomTime,
      }}
    >
      <audio ref={audioRef} preload="auto">
        <source
          src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVoQAEiXrNXmqWEzBk+atN32q2IfBj+b2drsrmQgBS6b2tvtrWEgBS6b2tvtrWEgBS6b2tvtrWEgBS6b2tvtrWEgBS6b2tvtrWEgBS6b2tvtrWEgBS6b2tvtrWEgBS6b2tvtrWEgBS6b2tvtrWEgBS6b2tvtrWEgBS6b2tvtrWEgBS6b2tvtrWEgBS6b2tvtrWE="
          type="audio/wav"
        />
      </audio>
      {children}
    </TimerContext.Provider>
  );
};
