import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'fresh_theme';

const ThemeContext = createContext(null);

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  return localStorage.getItem(STORAGE_KEY) || 'light';
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(() => {
    const setTheme = (nextTheme) => setThemeState(nextTheme === 'dark' ? 'dark' : 'light');
    const toggleTheme = () => setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));
    return {
      theme,
      setTheme,
      toggleTheme,
      isDark: theme === 'dark',
    };
  }, [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
