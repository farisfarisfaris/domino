import { createContext, useContext, useState, useCallback } from 'react';

const PreferencesContext = createContext(null);

const STORAGE_KEY = 'domino_preferences';

const DEFAULTS = {
  refreshInterval: 5,   // seconds; 0 = off
  timeFormat: '24h',     // '12h' | '24h'
  dateFormat: 'relative', // 'relative' | 'absolute'
  tableDensity: 'default', // 'compact' | 'default' | 'spacious'
};

function loadPreferences() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(loadPreferences);

  const updatePreference = useCallback((key, value) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <PreferencesContext.Provider value={{ ...prefs, updatePreference }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be inside PreferencesProvider');
  return ctx;
}
