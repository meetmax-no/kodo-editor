import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_THEME_ID, getTheme } from '../themes';

const STORAGE_KEY = 'kodo-editor-theme-v1';

function loadStored() {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    return id || null;
  } catch {
    return null;
  }
}

/**
 * useTheme — hardkodet theme-picker. Persist i localStorage.
 * Setter `.theme-<id>` og `.tone-<light|dark>` på <html> via CSS-variabler.
 */
export default function useTheme() {
  const [themeId, _setThemeId] = useState(() => loadStored() || DEFAULT_THEME_ID);
  const theme = getTheme(themeId);

  // Appliser theme på <html>
  useEffect(() => {
    const root = document.documentElement;

    // Fjern alle theme-* klasser før vi setter ny
    const toRemove = Array.from(root.classList).filter((c) => c.startsWith('theme-'));
    toRemove.forEach((c) => root.classList.remove(c));
    root.classList.add(`theme-${theme.id}`);

    // Tone-klasse styres av aktivt tema (overstyrer bakgrunnens tone)
    root.classList.toggle('tone-light', theme.tone === 'light');
  }, [theme]);

  const setThemeId = useCallback((id) => {
    _setThemeId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore quota */
    }
  }, []);

  return { themeId: theme.id, theme, setThemeId };
}
