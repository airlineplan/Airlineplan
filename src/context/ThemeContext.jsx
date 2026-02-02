import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check local storage first, then system preference
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) return savedTheme;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light"; // Default to dark if SSR
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // 1. Manage the class on the HTML tag
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    
    // 2. FORCE the body background color to match (The Failsafe)
    if (theme === 'dark') {
      document.body.style.backgroundColor = '#020617'; // slate-950
      document.body.style.color = '#f8fafc'; // slate-50
    } else {
      document.body.style.backgroundColor = '#f8fafc'; // slate-50
      document.body.style.color = '#0f172a'; // slate-900
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);