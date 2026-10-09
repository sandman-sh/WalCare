'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  const applyThemeToDOM = (t: Theme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;

    if (t === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
      if (body) {
        body.classList.add('dark');
        body.classList.remove('light');
        body.setAttribute('data-theme', 'dark');
      }
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
      if (body) {
        body.classList.remove('dark');
        body.classList.add('light');
        body.setAttribute('data-theme', 'light');
      }
    }
  };

  useEffect(() => {
    // Check saved theme or fallback to dark
    let saved = localStorage.getItem('walcare_theme') as Theme | null;
    if (!saved) {
      saved = localStorage.getItem('carecircle_theme') as Theme | null;
    }
    const initialTheme: Theme = saved === 'light' ? 'light' : 'dark';
    setThemeState(initialTheme);
    applyThemeToDOM(initialTheme);
    setMounted(true);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem('walcare_theme', t);
      localStorage.setItem('carecircle_theme', t);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    applyThemeToDOM(t);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
