// Section detection and transformation utilities for multi-section JSON files.
//
// A "section" is one top-level key in a JSON object that contains editable data.
// Different section types need different rendering strategies.

export const SECTION_TYPE = {
  ARRAY_OF_OBJECTS: 'array-of-objects',
  DICT_OF_OBJECTS: 'dict-of-objects',
  DICT_OF_PRIMITIVES: 'dict-of-primitives',
  PRIMITIVE: 'primitive',           // root-level scalars
  NESTED_CATEGORIES: 'nested-categories',
  UNKNOWN: 'unknown',
};

const ROOT_PRIMITIVES_KEY = '__root__';

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isPrimitive(v) {
  return v === null || typeof v !== 'object';
}

/**
 * Klassifiser en top-level verdi.
 */
function classifyValue(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return SECTION_TYPE.ARRAY_OF_OBJECTS; // antatt tomt array-of-objects
    // Nested-with-categories? ({kategori, pakker|tjenester})
    if (
      isPlainObject(value[0]) &&
      value[0].kategori !== undefined &&
      (value[0].pakker !== undefined || value[0].tjenester !== undefined)
    ) {
      return SECTION_TYPE.NESTED_CATEGORIES;
    }
    if (isPlainObject(value[0])) return SECTION_TYPE.ARRAY_OF_OBJECTS;
    return SECTION_TYPE.UNKNOWN;
  }
  if (isPlainObject(value)) {
    const values = Object.values(value);
    if (values.length === 0) return SECTION_TYPE.DICT_OF_PRIMITIVES;
    if (values.every(isPlainObject)) return SECTION_TYPE.DICT_OF_OBJECTS;
    if (values.every(isPrimitive)) return SECTION_TYPE.DICT_OF_PRIMITIVES;
    return SECTION_TYPE.UNKNOWN;
  }
  return SECTION_TYPE.UNKNOWN;
}

/**
 * Detect sections in a top-level JSON object.
 * Returns null if the data is not a multi-section object.
 *
 * Regel for "multi-section mode":
 *   - Root må være et objekt (ikke array)
 *   - Må inneholde ≥2 "editable" seksjoner ELLER inneholde dict-of-objects ELLER root-primitives
 */
export function detectSections(data) {
  if (!isPlainObject(data)) return null;

  const sections = [];
  const rootPrimitiveFields = [];

  for (const [key, value] of Object.entries(data)) {
    if (isPrimitive(value)) {
      rootPrimitiveFields.push(key);
      continue;
    }
    const type = classifyValue(value);
    if (type === SECTION_TYPE.UNKNOWN) continue; // hopp over ulagelige seksjoner
    sections.push({ key, type });
  }

  if (rootPrimitiveFields.length > 0) {
    sections.unshift({
      key: ROOT_PRIMITIVES_KEY,
      type: SECTION_TYPE.PRIMITIVE,
      fields: rootPrimitiveFields,
    });
  }

  // Skal vi egentlig aktivere multi-section mode?
  //   - Hvis KUN 1 seksjon og den er array-of-objects eller nested-categories → nei,
  //     behold dagens flow. Extra dict-of-primitives vises i ExtraFieldsPanel.
  //   - Hvis det finnes dict-of-objects eller root-primitiver → ja, aktiver.
  //   - Hvis det finnes 2+ array-of-objects → ja (vi må kunne veksle mellom dem).

  const editableCount = sections.filter((s) => s.type !== SECTION_TYPE.PRIMITIVE).length;
  const hasDictObjects = sections.some((s) => s.type === SECTION_TYPE.DICT_OF_OBJECTS);
  const hasRootPrim = sections.some((s) => s.type === SECTION_TYPE.PRIMITIVE);
  const hasMultipleArrays =
    sections.filter((s) => s.type === SECTION_TYPE.ARRAY_OF_OBJECTS).length >= 2;

  const needMultiSection = hasDictObjects || hasRootPrim || hasMultipleArrays || editableCount >= 2;

  if (!needMultiSection) return null;

  // Men hvis ett av seksjonene er NESTED_CATEGORIES, behold dagens flow
  // (priser.json-stil) og la resten bli fanget i ExtraFieldsPanel.
  if (sections.some((s) => s.type === SECTION_TYPE.NESTED_CATEGORIES)) return null;

  return sections;
}

export const ROW_KEY_FIELD = '__key';
export const ROW_VALUE_FIELD = 'value';

/**
 * Konverter dict-of-objects til array av rader med __key som første felt.
 *   {TRACK1:{a:1}} → [{__key:'TRACK1', a:1}]
 */
export function dictObjectsToRows(dict) {
  return Object.entries(dict).map(([k, v]) => ({
    [ROW_KEY_FIELD]: k,
    ...v,
  }));
}

/**
 * Invers: tilbake til dict.
 */
export function rowsToDictObjects(rows) {
  const out = {};
  for (const row of rows) {
    const k = row[ROW_KEY_FIELD] ?? '';
    if (!k) continue; // hopp over tomme nøkler
    const { [ROW_KEY_FIELD]: _k, _internalId, ...rest } = row;
    out[k] = rest;
  }
  return out;
}

/**
 * dict-of-primitives → 2-kolonne rader.
 *   {"2026-01-01":"Nyttårsdag"} → [{__key:'2026-01-01', value:'Nyttårsdag'}]
 */
export function dictPrimitivesToRows(dict) {
  return Object.entries(dict).map(([k, v]) => ({
    [ROW_KEY_FIELD]: k,
    [ROW_VALUE_FIELD]: v,
  }));
}

export function rowsToDictPrimitives(rows) {
  const out = {};
  for (const row of rows) {
    const k = row[ROW_KEY_FIELD] ?? '';
    if (!k) continue;
    out[k] = row[ROW_VALUE_FIELD];
  }
  return out;
}

export { ROOT_PRIMITIVES_KEY };
