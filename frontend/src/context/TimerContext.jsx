import React, { createContext, useState, useEffect, useRef, useContext, useCallback } from "react";
import api from "../services/api";
import { AuthContext } from "./AuthContext";
import { SettingsContext } from "./SettingsContext";

const TIMER_STORAGE_KEY = "gyaanmitra_timer_state";

const readSavedTimer = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY) || "null");
    if (!saved || !Number.isFinite(saved.seconds) || !Number.isFinite(saved.totalSeconds)) {
      return null;
    }

    if (saved.isActive && Number.isFinite(saved.savedAt)) {
      saved.seconds = Math.max(
        0,
        saved.seconds - Math.floor((Date.now() - saved.savedAt) / 1000),
      );
    }
    return saved;
  } catch (error) {
    console.error("Unable to restore timer state:", error);
    return null;
  }
};

export const TimerContext = createContext();

export const useTimer = () => useContext(TimerContext);

export const TimerProvider = ({ children }) => {
  const { token } = useContext(AuthContext);
  const { timerSettings } = useContext(SettingsContext);
  const [restoredTimer] = useState(readSavedTimer);
  const [seconds, setSeconds] = useState(
    restoredTimer?.seconds ?? (timerSettings?.focusDuration || 25) * 60,
  );
  const [totalSeconds, setTotalSeconds] = useState(
    restoredTimer?.totalSeconds ?? (timerSettings?.focusDuration || 25) * 60,
  );
  const [isActive, setIsActive] = useState(restoredTimer?.isActive ?? false);
  const [mode, setMode] = useState(restoredTimer?.mode || "pomodoro");
  const [sessions, setSessions] = useState(restoredTimer?.sessions || 0);
  const [customMinutes, setCustomMinutes] = useState(
    restoredTimer?.customMinutes ?? timerSettings?.focusDuration ?? 25,
  );
  const [showMiniTimer, setShowMiniTimer] = useState(
    restoredTimer?.showMiniTimer ?? false,
  );
  const audioRef = useRef(null);
  const [sessionStartTime, setSessionStartTime] = useState(() => {
    if (restoredTimer?.sessionStartTime) {
      return new Date(restoredTimer.sessionStartTime);
    }
    if (restoredTimer?.isActive) {
      return new Date(Date.now() - (totalSeconds - seconds) * 1000);
    }
    return null;
  });
  const appliedSettingsRef = useRef(
    `${mode}:${timerSettings?.focusDuration || 25}:${timerSettings?.breakDuration || 5}`,
  );
  const skipRestoredSettingsSyncRef = useRef(Boolean(restoredTimer));
  const completionHandledRef = useRef(false);

  // Only apply changed settings; stopping a completed timer should keep it at 00:00.
  useEffect(() => {
    const settingsKey = `${mode}:${timerSettings?.focusDuration || 25}:${timerSettings?.breakDuration || 5}`;
    const skipRestoredSync = skipRestoredSettingsSyncRef.current;
    skipRestoredSettingsSyncRef.current = false;
    if (appliedSettingsRef.current === settingsKey) return;
    appliedSettingsRef.current = settingsKey;
    if (skipRestoredSync) return;
    if (!isActive) {
      if (mode === "pomodoro") {
        const nextDuration = (timerSettings?.focusDuration || 25) * 60;
        setSeconds(nextDuration);
        setTotalSeconds(nextDuration);
      } else if (mode === "break") {
        const nextDuration = (timerSettings?.breakDuration || 5) * 60;
        setSeconds(nextDuration);
        setTotalSeconds(nextDuration);
      }
    }
  }, [timerSettings, mode, isActive]);

  useEffect(() => {
    try {
      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({
          seconds,
          totalSeconds,
          isActive,
          mode,
          sessions,
          customMinutes,
          showMiniTimer,
          sessionStartTime: sessionStartTime?.toISOString() || null,
          savedAt: Date.now(),
        }),
      );
    } catch (error) {
      console.error("Unable to save timer state:", error);
    }
  }, [seconds, totalSeconds, isActive, mode, sessions, customMinutes, showMiniTimer, sessionStartTime]);

  const modes = [
    { id: "pomodoro", label: "Pomodoro", time: (timerSettings?.focusDuration || 25) * 60, color: "#795548" },
    { id: "break", label: "Break", time: (timerSettings?.breakDuration || 5) * 60, color: "#10b981" },
    { id: "custom", label: "Custom", time: (timerSettings?.focusDuration || 25) * 60, color: "#ec4899" },
  ];

  // Record session to DB
  const recordSession = useCallback(async () => {
    if (!token || !sessionStartTime || mode === "break") return;
    try {
      const elapsedSeconds = Math.max(0, totalSeconds - seconds);
      const duration = Math.floor(elapsedSeconds / 60);
      if (duration < 1) return; // Don't log sessions shorter than 1 minute
      
      await api.post("/sessions", {
        duration,
        mode,
        startTime: sessionStartTime,
        endTime: new Date(),
        status: seconds === 0 ? "completed" : "interrupted"
      });
      console.log(`[Timer] Logged ${duration}m ${mode} session.`);
      window.dispatchEvent(new Event("study-session-updated"));
    } catch (error) {
      console.error("Error logging study session:", error);
    }
  }, [token, seconds, totalSeconds, mode, sessionStartTime]);

  // Keep one countdown interval for the whole active period.
  useEffect(() => {
    if (!isActive) return undefined;
    const interval = setInterval(() => {
      setSeconds((remaining) => Math.max(0, remaining - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (!isActive || seconds !== 0 || completionHandledRef.current) return;
    completionHandledRef.current = true;
    setIsActive(false);
    setSessions((count) => count + 1);
    recordSession();
    setSessionStartTime(null);
    if (audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.warn("Unable to play the timer notification sound:", error);
      });
    }
  }, [isActive, seconds, recordSession]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
  };

  const startTimer = () => {
    completionHandledRef.current = false;
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
    setSessionStartTime(new Date());
  };

  const pauseTimer = () => {
    setIsActive(false);
    recordSession(); // Log partial session if paused/interrupted
    setSessionStartTime(null);
  };

  const toggleTimer = () => {
    if (!isActive) {
      startTimer();
    } else {
      pauseTimer();
    }
  };

  const resetTimer = (newMode = mode) => {
    completionHandledRef.current = false;
    if (sessionStartTime) {
      recordSession();
    }
    setIsActive(false);
    setSessionStartTime(null);
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
  const liveSession =
    isActive && mode !== "break" && sessionStartTime
      ? {
          startTime: sessionStartTime.toISOString(),
          duration: elapsed / 60,
          status: "active",
          mode,
        }
      : null;

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
        elapsed,
        liveSession,
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
