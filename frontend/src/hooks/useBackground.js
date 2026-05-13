import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ROTATE_MODES,
  FALLBACK_CONFIG,
  pickBackground,
  bgToCss,
  extractBackgroundsFromData,
} from '../themes';

const STORAGE_KEY = 'kodo-editor-bg-prefs-v1';
const CONFIG_URL = process.env.PUBLIC_URL + '/clients/default.json';

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota errors */
  }
}

/**
 * useBackground — fetches /clients/default.json once on mount.
 * Returns the unified background list (default config + dynamic from loaded JSON),
 * the currently active background, and setters that persist to localStorage.
 *
 * @param {object|null} loadedJsonData - the JSON the user has loaded (may include `backgrounds`)
 */
export default function useBackground(loadedJsonData) {
  const [config, setConfig] = useState(FALLBACK_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);

  // User-controlled prefs (persist).
  const initialPrefs = loadPrefs();
  const [backgroundId, _setBackgroundId] = useState(initialPrefs?.backgroundId || null);
  const [rotateMode, _setRotateMode] = useState(initialPrefs?.rotate || null);
  const [overlay, _setOverlay] = useState(
    typeof initialPrefs?.overlay === 'number' ? initialPrefs.overlay : null
  );

  // Fetch the config file once.
  useEffect(() => {
    let cancelled = false;
    fetch(CONFIG_URL + `?_=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((cfg) => {
        if (cancelled) return;
        setConfig(cfg);
        setConfigLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        // Behold FALLBACK_CONFIG
        setConfigLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Effective defaults (from config) merged with user prefs.
  const effectiveBackgroundId =
    backgroundId || config?.defaults?.backgroundId || 'slate-night';
  const effectiveRotate =
    rotateMode || config?.defaults?.rotate || ROTATE_MODES.STATIC;
  const effectiveOverlay =
    typeof overlay === 'number'
      ? overlay
      : typeof config?.defaults?.overlayOpacity === 'number'
      ? config.defaults.overlayOpacity
      : 0.35;

  // Combined background list — config + extracted from loaded JSON
  const allBackgrounds = useMemo(() => {
    const fromConfig = config?.backgrounds || [];
    const fromLoaded = extractBackgroundsFromData(loadedJsonData);
    // De-dup by id (loaded wins)
    const map = new Map();
    fromConfig.forEach((b) => map.set(b.id, b));
    fromLoaded.forEach((b) => map.set(b.id, b));
    return Array.from(map.values());
  }, [config, loadedJsonData]);

  // Active background after rotate-mode resolves
  const activeBackground = useMemo(() => {
    return pickBackground(allBackgrounds, effectiveRotate, effectiveBackgroundId);
  }, [allBackgrounds, effectiveRotate, effectiveBackgroundId]);

  const activeCss = useMemo(() => bgToCss(activeBackground), [activeBackground]);
  const tone = activeBackground?.tone || 'dark';

  const setBackgroundId = useCallback(
    (id) => {
      _setBackgroundId(id);
      savePrefs({ backgroundId: id, rotate: effectiveRotate, overlay: effectiveOverlay });
    },
    [effectiveRotate, effectiveOverlay]
  );

  const setRotateMode = useCallback(
    (mode) => {
      _setRotateMode(mode);
      savePrefs({
        backgroundId: effectiveBackgroundId,
        rotate: mode,
        overlay: effectiveOverlay,
      });
    },
    [effectiveBackgroundId, effectiveOverlay]
  );

  const setOverlay = useCallback(
    (val) => {
      _setOverlay(val);
      savePrefs({
        backgroundId: effectiveBackgroundId,
        rotate: effectiveRotate,
        overlay: val,
      });
    },
    [effectiveBackgroundId, effectiveRotate]
  );

  return {
    config,
    configLoaded,
    allBackgrounds,
    activeBackground,
    activeCss,
    tone,
    backgroundId: effectiveBackgroundId,
    rotateMode: effectiveRotate,
    overlay: effectiveOverlay,
    setBackgroundId,
    setRotateMode,
    setOverlay,
  };
}
