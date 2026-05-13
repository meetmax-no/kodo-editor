import React, { useMemo } from 'react';

// Walk JSON og returner flate change-records: { kind, path, before, after }.
function diffJson(a, b, path = [], out = []) {
  if (a === b) return out;

  const aIsObj = a && typeof a === 'object' && !Array.isArray(a);
  const bIsObj = b && typeof b === 'object' && !Array.isArray(b);
  const aIsArr = Array.isArray(a);
  const bIsArr = Array.isArray(b);

  // Begge er objekter → sammenlign nøkkel-for-nøkkel
  if (aIsObj && bIsObj) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if (!(k in a)) out.push({ kind: 'add', path: [...path, k], after: b[k] });
      else if (!(k in b)) out.push({ kind: 'del', path: [...path, k], before: a[k] });
      else diffJson(a[k], b[k], [...path, k], out);
    }
    return out;
  }

  // Begge er arrays → sammenlign indeks-for-indeks
  if (aIsArr && bIsArr) {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      if (i >= a.length) out.push({ kind: 'add', path: [...path, i], after: b[i] });
      else if (i >= b.length) out.push({ kind: 'del', path: [...path, i], before: a[i] });
      else diffJson(a[i], b[i], [...path, i], out);
    }
    return out;
  }

  // Type-mismatch eller primitive med ulik verdi
  out.push({ kind: 'mod', path: [...path], before: a, after: b });
  return out;
}

function fmtValue(v) {
  if (v === undefined) return '∅';
  if (v === null) return 'null';
  if (typeof v === 'string') return `"${v}"`;
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return `[${v.length} items]`;
  if (typeof v === 'object') return `{${Object.keys(v).length} fields}`;
  return String(v);
}

function fmtPath(path) {
  if (path.length === 0) return '(root)';
  return path
    .map((seg, i) => (typeof seg === 'number' ? `[${seg}]` : (i === 0 ? seg : `.${seg}`)))
    .join('');
}

export default function DiffView({ before, after }) {
  const changes = useMemo(() => {
    let a = null, b = null;
    try { a = JSON.parse(before || 'null'); } catch { a = before; }
    try { b = JSON.parse(after || 'null'); } catch { b = after; }
    return diffJson(a, b);
  }, [before, after]);

  const noChange = changes.length === 0;

  return (
    <div className="diff-view" data-testid="diff-view">
      <div className="diff-summary">
        <span className="diff-summary-label">ENDRINGER</span>
        {noChange ? (
          <span className="diff-chip diff-chip-neutral" data-testid="diff-summary">
            Ingen
          </span>
        ) : (
          <span className="diff-chip diff-chip-add" data-testid="diff-count">
            {changes.length} {changes.length === 1 ? 'endring' : 'endringer'}
          </span>
        )}
      </div>

      {!noChange && (
        <ul className="changes-list" data-testid="changes-list">
          {changes.map((c, i) => (
            <li key={i} className={`change-item change-${c.kind}`}>
              <span className="change-kind">
                {c.kind === 'add' ? '+' : c.kind === 'del' ? '−' : '~'}
              </span>
              <span className="change-path">{fmtPath(c.path)}</span>
              <span className="change-arrow">
                {c.kind === 'add' && (
                  <>lagt til: <code className="change-after">{fmtValue(c.after)}</code></>
                )}
                {c.kind === 'del' && (
                  <>fjernet: <code className="change-before">{fmtValue(c.before)}</code></>
                )}
                {c.kind === 'mod' && (
                  <>
                    <code className="change-before">{fmtValue(c.before)}</code>
                    <span className="change-arr">→</span>
                    <code className="change-after">{fmtValue(c.after)}</code>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
