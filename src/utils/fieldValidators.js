// Field validators — detect format-sensitive fields and check values.
// Non-blocking: we only return a reason string, never prevent input.

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(?::\d{2})?$/;
const TIMERANGE_RE = /^\d{1,2}-\d{1,2}$/; // f.eks. 10-12
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/\S+$/;

function looksLikeHex(v)   { return typeof v === 'string' && v.startsWith('#'); }
function looksLikeDate(v)  { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v); }
function looksLikeTime(v)  { return typeof v === 'string' && /^\d{1,2}:\d{2}/.test(v); }
function looksLikeTimeRange(v) { return typeof v === 'string' && /^\d{1,2}-\d{1,2}$/.test(v); }
function looksLikeEmail(v) { return typeof v === 'string' && v.includes('@') && v.includes('.'); }
function looksLikeUrl(v)   { return typeof v === 'string' && /^https?:\/\//.test(v); }

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
  if (nameMatchesHint(fieldName, 'time') || looksLikeTime(value) || looksLikeTimeRange(value)) {
    if (typeof value === 'string' && !TIME_RE.test(value) && !TIMERANGE_RE.test(value)) {
      return { kind: 'time', message: 'Ugyldig tid (HH:MM eller 10-12)' };
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
