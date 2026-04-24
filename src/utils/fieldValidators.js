// Field validators — non-blocking, name-based validation.
//
// Regel: validering triggeres KUN av feltnavnet. Hvis du kaller feltet ditt
// `color`, `farge`, `hex` → hex valideres. Hvis du kaller det `notat` → fri
// tekst, ingen validering. Dette gir brukeren full kontroll.

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Enkelt tidspunkt: HH:MM eller HH:MM:SS, time 0-23, minutt/sekund 0-59
const SIMPLE_TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
// Bare en time: 0-23 (brukes i range som "10-12")
const SIMPLE_HOUR_RE = /^([01]?\d|2[0-3])$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/\S+$/;

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

function isValidTimePart(s) {
  const trimmed = s.trim();
  return SIMPLE_TIME_RE.test(trimmed) || SIMPLE_HOUR_RE.test(trimmed);
}

// Fullstendig tidsvalidator: enkelt tid eller range separert med "-".
// Gyldig:  "08:00", "23:59:59", "10-12", "08:00-16:00", "08:00 - 16:00", "8 - 12"
// Ugyldig: "26:30", "08:60", "08:00 - 200", "25", "abc"
function isValidTime(v) {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (SIMPLE_TIME_RE.test(s)) return true;
  const dashMatch = s.match(/^(.+?)\s*-\s*(.+)$/);
  if (dashMatch) {
    return isValidTimePart(dashMatch[1]) && isValidTimePart(dashMatch[2]);
  }
  return false;
}

/**
 * Valider en felt-verdi basert på feltnavnet.
 * Returnerer null hvis OK eller hvis feltnavnet ikke matcher noen regel,
 * eller {kind, message} ved feil.
 */
export function validateField(fieldName, value) {
  if (value === null || value === undefined || value === '') return null;
  if (!fieldName) return null;

  if (nameMatchesHint(fieldName, 'hex')) {
    if (typeof value === 'string' && !HEX_RE.test(value)) {
      return { kind: 'hex', message: 'Ugyldig hex-farge (skal være #RGB, #RRGGBB eller #RRGGBBAA)' };
    }
  }
  if (nameMatchesHint(fieldName, 'date')) {
    if (typeof value === 'string' && !DATE_RE.test(value)) {
      return { kind: 'date', message: 'Ugyldig dato (skal være YYYY-MM-DD)' };
    }
  }
  if (nameMatchesHint(fieldName, 'time')) {
    if (typeof value === 'string' && !isValidTime(value)) {
      return { kind: 'time', message: 'Ugyldig tid (f.eks. 08:00, 08:00-16:00, 10-12)' };
    }
  }
  if (nameMatchesHint(fieldName, 'email')) {
    if (typeof value === 'string' && !EMAIL_RE.test(value)) {
      return { kind: 'email', message: 'Ugyldig e-postadresse' };
    }
  }
  if (nameMatchesHint(fieldName, 'url')) {
    if (typeof value === 'string' && !URL_RE.test(value)) {
      return { kind: 'url', message: 'Ugyldig URL (skal begynne med http:// eller https://)' };
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
