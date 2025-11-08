import React from 'react';
import { BrowserRouter } from 'react-router-dom';

// Theme context: provides current theme and a toggle function
export const ThemeContext = React.createContext<{
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}>({
  theme: 'dark',
  toggleTheme: () => {},
});

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  // theme state (persisted) - default to dark
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem('theme');
    return saved === 'light' ? 'light' : 'dark'; // default to dark
  });

  React.useEffect(() => {
    const root = document.documentElement;
    // ensure only one of the classes is present
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    // Set default dark styles on the root
    if (theme === 'dark') {
      root.style.backgroundColor = '#0f172a'; // slate-900
      root.style.color = '#f8fafc'; // slate-50
    } else {
      root.style.backgroundColor = '#ffffff';
      root.style.color = '#0f172a';
    }

    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      /* ignore storage errors */
    }
  }, [theme]);

  const toggleTheme = React.useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </ThemeContext.Provider>
  );
};