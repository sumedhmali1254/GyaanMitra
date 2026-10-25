import { useEffect, useState } from "react";

const readStoredBoolean = (key, defaultValue) => {
  if (typeof window === "undefined") return defaultValue;

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue === null ? defaultValue : storedValue === "true";
  } catch (error) {
    console.error(`Unable to read saved state for "${key}":`, error);
    return defaultValue;
  }
};

export const usePersistentBoolean = (key, defaultValue) => {
  const [value, setValue] = useState(() => readStoredBoolean(key, defaultValue));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, String(value));
    } catch (error) {
      console.error(`Unable to save state for "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
};
