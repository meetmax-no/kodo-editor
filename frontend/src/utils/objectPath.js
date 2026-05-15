// Immutable path-baserte updates på nestede objekter/arrays.
// Path er en array av string-keys (objekt-nøkler) og number-keys (array-indekser).
//
// Eksempel:
//   setAtPath({a:{b:[1,2,3]}}, ['a','b',1], 99)
//   → {a:{b:[1,99,3]}}

export function setAtPath(obj, path, value) {
  if (!path || path.length === 0) return value;
  const [head, ...rest] = path;
  if (Array.isArray(obj)) {
    const idx = Number(head);
    const next = obj.slice();
    next[idx] = setAtPath(obj?.[idx], rest, value);
    return next;
  }
  return { ...(obj || {}), [head]: setAtPath(obj?.[head], rest, value) };
}

export function deleteAtPath(obj, path) {
  if (!path || path.length === 0) return undefined;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    if (Array.isArray(obj)) {
      return obj.filter((_, i) => i !== Number(head));
    }
    const copy = { ...obj };
    delete copy[head];
    return copy;
  }
  if (Array.isArray(obj)) {
    const idx = Number(head);
    const next = obj.slice();
    next[idx] = deleteAtPath(obj?.[idx], rest);
    return next;
  }
  return { ...(obj || {}), [head]: deleteAtPath(obj?.[head], rest) };
}

export function getAtPath(obj, path) {
  let cur = obj;
  for (const seg of path) {
    if (cur == null) return undefined;
    cur = Array.isArray(cur) ? cur[Number(seg)] : cur[seg];
  }
  return cur;
}

export function pathToKey(path) {
  return path.join('.');
}

// Klassifisering av verditype for UI-rendering.
export function valueKind(value) {
  if (value === null || value === undefined) return 'primitive';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'array-empty';
    const allPrim = value.every((v) => v === null || typeof v !== 'object');
    return allPrim ? 'array-of-primitives' : 'array-of-objects';
  }
  if (typeof value === 'object') return 'object';
  return 'primitive';
}
