// Field validators — detect format-sensitive fields and check values.
// Non-blocking: we only return a reason string, never prevent input.

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Enkelt tidspunkt: HH:MM eller HH:MM:SS, time 0-23, minutt/sekund 0-59
const SIMPLE_TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
// Enkelt klokkeslag bare time: 0-23 (brukes i range som "10-12")
const SIMPLE_HOUR_RE = /^([01]?\d|2[0-3])$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/\S+$/;

function looksLikeHex(v)   { return typeof v === 'string' && v.startsWith('#'); }
function looksLikeDate(v)  { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v); }
// Ser ut som tid: enten inneholder ":" etterfulgt av siffer, eller er et range med "-"
function looksLikeTime(v)  {
  if (typeof v !== 'string') return false;
  return /^\d{1,2}[:\-]\d/.test(v.trim()) || /^\d{1,2}\s*-\s*\d/.test(v.trim());
}
function looksLikeEmail(v) { return typeof v === 'string' && v.includes('@') && v.includes('.'); }
function looksLikeUrl(v)   { return typeof v === 'string' && /^https?:\/\//.test(v); }

// Godta enkelt tid (HH:MM/HH:MM:SS) eller bare en hel time (HH).
function isValidTimePart(s) {
  const trimmed = s.trim();
  return SIMPLE_TIME_RE.test(trimmed) || SIMPLE_HOUR_RE.test(trimmed);
}

// Fullstendig tidsvalidator: godta enkelt tid, eller range separert med "-".
// Gyldig:  "08:00", "23:59:59", "10-12", "08:00-16:00", "08:00 - 16:00", "8 - 12"
// Ugyldig: "26:30", "08:60", "08:00 - 200", "25", "abc"
function isValidTime(v) {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (SIMPLE_TIME_RE.test(s)) return true;
  // Range med dash (enten rett "-" eller " - ")
  const dashMatch = s.match(/^(.+?)\s*-\s*(.+)$/);
  if (dashMatch) {
    return isValidTimePart(dashMatch[1]) && isValidTimePart(dashMatch[2]);
  }
  return false;
}

const NAME_HINTS = {
  hex:   ['hex', 'color', 'farge', 'colour'],
  date:  ['date', 'dato'],
  time:  ['time', 'tid', 'klokke'],
  email: ['email', 'e-post', 'epost', 'mail'],
  url:   ['url', 'uri', 'link', 'lenke'],
};

function nameMatchesHint(fieldName, kind) {
  if (!fieldName) return false;
  const lower = fieldName.toLowerCase();
  return (NAME_HINTS[kind] || []).some((h) => lower.includes(h));
}

/**
 * Valider en felt-verdi. Returnerer null hvis OK, eller {kind, message} ved feil.
 * Brukes både for pakke-felt og rot-primitiver.
 */
export function validateField(fieldName, value) {
  // Tom eller falsy er alltid OK (du må ikke fylle ut alt)
  if (value === null || value === undefined || value === '') return null;

  // HEX
  if (nameMatchesHint(fieldName, 'hex') || looksLikeHex(value)) {
    if (typeof value === 'string' && !HEX_RE.test(value)) {
      return { kind: 'hex', message: 'Ugyldig hex-farge (skal være #RGB, #RRGGBB eller #RRGGBBAA)' };
    }
  }
  // DATO
  if (nameMatchesHint(fieldName, 'date') || looksLikeDate(value)) {
    if (typeof value === 'string' && !DATE_RE.test(value)) {
      return { kind: 'date', message: 'Ugyldig dato (skal være YYYY-MM-DD)' };
    }
  }
  // TID
  if (nameMatchesHint(fieldName, 'time') || looksLikeTime(value)) {
    if (typeof value === 'string' && !isValidTime(value)) {
      return { kind: 'time', message: 'Ugyldig tid (f.eks. 08:00, 08:00-16:00, 10-12)' };
    }
  }
  // E-POST
  if (nameMatchesHint(fieldName, 'email') || (looksLikeEmail(value) && !looksLikeUrl(value))) {
    if (typeof value === 'string' && value.includes('@') && !EMAIL_RE.test(value)) {
      return { kind: 'email', message: 'Ugyldig e-postadresse' };
    }
  }
  // URL
  if (nameMatchesHint(fieldName, 'url') || looksLikeUrl(value)) {
    if (typeof value === 'string' && /^https?:\/\//.test(value) && !URL_RE.test(value)) {
      return { kind: 'url', message: 'Ugyldig URL' };
    }
  }

  return null;
}

/**
 * Tell ugyldige felt i en hel liste med pakker + extra data.
 */
export function countInvalid(packages, rootPrimitives, extraData) {
  let count = 0;

  if (Array.isArray(packages)) {
    for (const pkg of packages) {
      for (const [k, v] of Object.entries(pkg)) {
        if (k.startsWith('_')) continue;
        if (validateField(k, v)) count++;
      }
    }
  }

  if (rootPrimitives && typeof rootPrimitives === 'object') {
    for (const [k, v] of Object.entries(rootPrimitives)) {
      if (validateField(k, v)) count++;
    }
  }

  if (extraData && typeof extraData === 'object') {
    for (const [, wrapper] of Object.entries(extraData)) {
      if (wrapper && typeof wrapper === 'object') {
        for (const [k, v] of Object.entries(wrapper)) {
          if (validateField(k, v)) count++;
        }
      }
    }
  }

  return count;
}
