import React, { createContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("app-theme");
    return savedTheme || "indigo";
  });

  useEffect(() => {
    localStorage.setItem("app-theme", theme);
    applyThemeColor(theme);
  }, [theme]);

  const applyThemeColor = (themeName) => {
    const themes = {
      indigo: {
        primary: "#795548",
        primary_dark: "#5d4037",
        primary_light: "#795548",
        secondary: "#0891b2",
        accent: "#ec4899",
      },
      blue: {
        primary: "#3b82f6",
        primary_dark: "#1d4ed8",
        primary_light: "#60a5fa",
        secondary: "#0ea5e9",
        accent: "#f59e0b",
      },
      purple: {
        primary: "#a855f7",
        primary_dark: "#9333ea",
        primary_light: "#c084fc",
        secondary: "#06b6d4",
        accent: "#ec4899",
      },
      pink: {
        primary: "#ec4899",
        primary_dark: "#be185d",
        primary_light: "#f472b6",
        secondary: "#f97316",
        accent: "#06b6d4",
      },
      green: {
        primary: "#10b981",
        primary_dark: "#059669",
        primary_light: "#34d399",
        secondary: "#0891b2",
        accent: "#f59e0b",
      },
    };

    const selectedTheme = themes[themeName];
    if (selectedTheme) {
      Object.entries(selectedTheme).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--theme-${key}`, value);
      });
    }
  };

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

export default ThemeContext;
