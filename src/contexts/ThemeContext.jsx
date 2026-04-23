import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'cryptoedge_theme';

export const DARK = {
  bg:      '#0b0f1a',
  card:    '#101520',
  border:  '#1c2740',
  muted:   '#3a5270',
  text:    '#b8cce0',
  bright:  '#ddeeff',
  price:   '#3b82f6',
  ema9:    '#fbbf24',
  ema21:   '#f97316',
  ema50:   '#a78bfa',
  bb:      '#2a4060',
  rsi:     '#f97316',
  macd:    '#3b82f6',
  signal:  '#f85149',
  bull:    '#10d67a',
  bear:    '#f85149',
  neutral: '#d4a017',
  grid:    '#131e30',
};

export const LIGHT = {
  bg:      '#f0f4f8',
  card:    '#ffffff',
  border:  '#d0dae6',
  muted:   '#7a95b0',
  text:    '#2c3e50',
  bright:  '#0f1d2d',
  price:   '#2563eb',
  ema9:    '#d97706',
  ema21:   '#ea580c',
  ema50:   '#7c3aed',
  bb:      '#94adc8',
  rsi:     '#ea580c',
  macd:    '#2563eb',
  signal:  '#dc2626',
  bull:    '#059669',
  bear:    '#dc2626',
  neutral: '#b45309',
  grid:    '#dde6f0',
};

const ThemeContext = createContext({ theme: 'dark', colors: DARK, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'dark'
  );

  const colors = theme === 'light' ? LIGHT : DARK;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    document.body.setAttribute('data-theme', theme);
    document.body.style.background = colors.bg;
    document.body.style.color      = colors.text;
  }, [theme, colors.bg, colors.text]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
