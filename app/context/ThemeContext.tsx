'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    // Read what's currently set on the DOM (from inline script which uses system preference)
    const htmlElement = document.documentElement;
    const isDarkClass = htmlElement.classList.contains('dark');
    const isDarkAttr = htmlElement.getAttribute('data-theme') === 'dark';
    const isDarkDOM = isDarkClass || isDarkAttr;
    
    // Read saved theme from localStorage IF it exists and is valid
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Determine which theme should be used
    // Priority: if DOM already has dark set (from inline script), use that
    // Otherwise, use saved theme (if user previously toggled), or system preference
    let initialTheme: Theme;
    if (isDarkDOM) {
      initialTheme = 'dark';
    } else if (savedTheme === 'light' || savedTheme === 'dark') {
      initialTheme = savedTheme;
    } else {
      initialTheme = prefersDark ? 'dark' : 'light';
    }
    
    setTheme(initialTheme);
    updateDOM(initialTheme);
    setMounted(true);
  }, []);

  // Update DOM when theme changes
  useEffect(() => {
    if (mounted) {
      updateDOM(theme);
    }
  }, [theme, mounted]);

  const updateDOM = (newTheme: Theme) => {
    const html = document.documentElement;
    if (newTheme === 'dark') {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.setAttribute('data-theme', 'light');
    }
    // Save to localStorage ONLY after user explicitly toggles
    // Don't rely on localStorage for initialization
    localStorage.setItem('theme', newTheme);
  };

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      updateDOM(next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
