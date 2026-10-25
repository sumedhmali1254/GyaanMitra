import React, { createContext, useEffect, useState } from "react";
import api from "../services/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null,
  );
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);
  const [guestSecondsRemaining, setGuestSecondsRemaining] = useState(null);

  const login = (userData) => {
    setUser(userData);
    setToken(userData.token);

    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", userData.token);
  };

  const updateUser = (userData) => {
    setUser((currentUser) => {
      const updatedUser = { ...currentUser, ...userData };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  const guestLogin = (userData) => {
    setUser(userData);
    setToken(userData.token);

    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", userData.token);
    localStorage.setItem("guestMode", "true");
  };

  const logout = () => {
    let savedMusicState = null;
    try {
      savedMusicState = JSON.parse(
        localStorage.getItem("gyaanmitra_music_state") || "null",
      );
    } catch (error) {
      console.error("Unable to preserve music state during logout:", error);
    }
    if (savedMusicState) {
      savedMusicState.isPlaying = false;
    }

    setUser(null);
    setToken(null);
    localStorage.clear();
    if (savedMusicState) {
      localStorage.setItem(
        "gyaanmitra_music_state",
        JSON.stringify(savedMusicState),
      );
    }
    setGuestSecondsRemaining(null);
  };

  const fetchMe = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser((prev) => {
        const updatedUser = { ...prev, ...res.data.data };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return updatedUser;
      });
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!user?.isGuest || !token) return undefined;

    const payload = JSON.parse(atob(token.split(".")[1]));
    const updateRemaining = () => {
      setGuestSecondsRemaining(
        Math.max(Math.ceil(payload.exp - Date.now() / 1000), 0),
      );
    };
    const timeout = Math.max(payload.exp * 1000 - Date.now(), 0);
    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    const timer = setTimeout(logout, timeout);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [user?.isGuest, token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        updateUser,
        guestLogin,
        guestSecondsRemaining,
        logout,
        fetchMe,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
