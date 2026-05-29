import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { makeStyles, type Styles } from './styles';
import { palettes, type Palette, type ThemeName } from './themes';

const STORAGE_KEY = 'snake_theme_v1';

type ThemeContextValue = {
  themeName: ThemeName;
  palette: Palette;
  styles: Styles;
  setTheme: (name: ThemeName) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    if (typeof window === 'undefined') return 'RETRO';
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'MODERN' || saved === 'RETRO' ? saved : 'RETRO';
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, themeName);
    } catch {
      // ignore quota / disabled storage
    }
  }, [themeName]);

  const setTheme = useCallback((name: ThemeName) => setThemeName(name), []);
  const toggleTheme = useCallback(
    () => setThemeName((t) => (t === 'RETRO' ? 'MODERN' : 'RETRO')),
    [],
  );

  const value = useMemo<ThemeContextValue>(() => {
    const palette = palettes[themeName];
    return {
      themeName,
      palette,
      styles: makeStyles(palette),
      setTheme,
      toggleTheme,
    };
  }, [themeName, setTheme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
