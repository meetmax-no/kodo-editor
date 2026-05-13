// src/themes.js — types + utils for V5.0 background system.
// All actual data lives in /clients/default.json (fetched at runtime).

export const APP_VERSION = 'v6.0';

// ── Tema: hardkodet liste. Settes via Innstillinger og persisterer i localStorage.
//        Uavhengig av bakgrunn — bakgrunn styrer bakgrunns-bilde/gradient,
//        tema styrer panel-tone (lys/mørk) og accent-farge.
export const THEMES = [
  { id: 'dark',   name: 'Mørk',    tone: 'dark',  accent: '#FBBF24', accentSoft: 'rgba(251, 191, 36, 0.14)',  accentGlow: 'rgba(251, 191, 36, 0.40)' },
  { id: 'light',  name: 'Lys',     tone: 'light', accent: '#F59E0B', accentSoft: 'rgba(245, 158, 11, 0.18)',  accentGlow: 'rgba(245, 158, 11, 0.35)' },
  { id: 'blue',   name: 'Blå',     tone: 'dark',  accent: '#60A5FA', accentSoft: 'rgba(96, 165, 250, 0.16)',  accentGlow: 'rgba(96, 165, 250, 0.40)' },
  { id: 'orange', name: 'Oransje', tone: 'dark',  accent: '#FB923C', accentSoft: 'rgba(251, 146, 60, 0.16)',  accentGlow: 'rgba(251, 146, 60, 0.40)' },
];
export const DEFAULT_THEME_ID = 'dark';
export function getTheme(id) {
  return THEMES.find((t) => t.id === id) || THEMES.find((t) => t.id === DEFAULT_THEME_ID);
}

export const ROTATE_MODES = {
  STATIC: 'static',
  SESSION: 'session',
  DAILY: 'daily',
};

export const ROTATE_LABELS = {
  static: 'Statisk',
  session: 'Roterer per session',
  daily: 'Roterer per dag',
};

// Minimal innebygd fallback hvis /clients/default.json ikke kan lastes.
export const FALLBACK_CONFIG = {
  _meta: {
    client: 'Ko | Do Consult',
    createdAt: new Date().toISOString().slice(0, 10),
    createdBy: 'Emergent',
    notes: 'Fallback config — /clients/default.json kunne ikke lastes.',
  },
  brand: { name: 'Ko | Do · Editor', tagline: 'Universal JSON Editor' },
  defaults: { backgroundId: 'slate-night', rotate: 'static', overlayOpacity: 0.35 },
  backgrounds: [
    {
      id: 'slate-night',
      name: 'Slate Night',
      category: 'gradient',
      tone: 'dark',
      css: 'radial-gradient(1200px 800px at 10% -10%, rgba(251,191,36,0.10), transparent 50%), #050816',
    },
  ],
};

export function pickBackground(list, mode, chosen) {
  if (!list || list.length === 0) return null;
  if (mode === ROTATE_MODES.SESSION) {
    return list[Math.floor(Math.random() * list.length)];
  }
  if (mode === ROTATE_MODES.DAILY) {
    const today = new Date().toISOString().slice(0, 10);
    let h = 0;
    for (let i = 0; i < today.length; i++) h = (h * 31 + today.charCodeAt(i)) | 0;
    return list[Math.abs(h) % list.length];
  }
  // STATIC — bruk valgt id, eller første hvis ikke funnet
  if (chosen) {
    const found = list.find((b) => b.id === chosen);
    if (found) return found;
  }
  return list[0];
}

export function bgToCss(bg) {
  if (!bg) return '#050816';
  if (bg.css) return bg.css.trim();
  if (bg.url) return `url("${bg.url}") center/cover no-repeat fixed`;
  return '#050816';
}

export function extractBackgroundsFromData(data) {
  if (!data || typeof data !== 'object') return [];
  const list = data.backgrounds;
  if (!Array.isArray(list)) return [];
  return list
    .filter((b) => b && typeof b === 'object' && (b.url || b.css))
    .map((b, idx) => ({
      id: b.id || `loaded-${idx}`,
      name: b.name || `Loaded ${idx + 1}`,
      category: b.category || (b.url ? 'photo' : 'gradient'),
      tone: b.tone || 'dark',
      url: b.url,
      css: b.css,
      _fromLoaded: true,
    }));
}
