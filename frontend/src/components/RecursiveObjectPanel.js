import React from 'react';
import { pathToKey, valueKind } from '../utils/objectPath';
import './RecursiveObjectPanel.css';

/**
 * RecursiveObjectPanel — rendrer et nested objekt med inline-redigerbare felter.
 *
 * Håndterer rekursivt:
 *   - primitive (string/number/boolean) → inline input
 *   - array-of-primitives             → "Rediger liste"-knapp (åpner ListEditModal)
 *   - array-of-objects                → mini-tabell der hver rad er en RecursiveObjectPanel
 *   - nested object                   → card med innrykk + rekursiv subpanel
 *
 * Path er en array av string/number-segmenter som peker fra root-objektet
 * og inn til verdien som rendres. Hver onChange/onEditList/onAddRow/onRemoveRow
 * kalles med full path → sentral handler i App.js gjør immutable update.
 *
 * Props:
 *   data         — det totale objektet som rendres (rotnoden)
 *   basePath     — path-prefiks for hele dette subtreet (vanligvis [])
 *   onChange     — (path: any[], newValue: any) => void
 *   onEditList   — (path: any[], currentArray: any[]) => void
 *   onAddRow     — (path: any[], template?: object) => void   (for array-of-objects)
 *   onRemoveRow  — (path: any[]) => void                       (for array-of-objects)
 *   dirtyPaths   — Set<string> ("a.b.c") for å markere endrede felter
 */
export default function RecursiveObjectPanel({
  data,
  basePath = [],
  onChange,
  onEditList,
  onAddRow,
  onRemoveRow,
  dirtyPaths,
}) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <div className="rop-empty" data-testid="rop-empty">
        <em>Tomt objekt</em>
      </div>
    );
  }

  return (
    <div className="rop-fields" data-testid="rop-panel">
      {entries.map(([key, value]) => (
        <Field
          key={key}
          fieldName={key}
          value={value}
          path={[...basePath, key]}
          onChange={onChange}
          onEditList={onEditList}
          onAddRow={onAddRow}
          onRemoveRow={onRemoveRow}
          dirtyPaths={dirtyPaths}
        />
      ))}
    </div>
  );
}

function Field({ fieldName, value, path, onChange, onEditList, onAddRow, onRemoveRow, dirtyPaths }) {
  const pathKey = pathToKey(path);
  const isDirty = dirtyPaths?.has(pathKey);
  const dirtyClass = isDirty ? ' rop-edited' : '';
  const kind = valueKind(value);

  // ── Nested object: card med innrykk + rekursiv subpanel
  if (kind === 'object') {
    const fieldCount = Object.keys(value).length;
    return (
      <div className="rop-card" data-testid={`rop-card-${pathKey}`}>
        <div className="rop-card-header">
          <span className="rop-card-title">{fieldName}</span>
          <span className="rop-card-meta">{fieldCount} {fieldCount === 1 ? 'felt' : 'felter'}</span>
        </div>
        <div className="rop-card-body">
          <RecursiveObjectPanel
            data={value}
            basePath={path}
            onChange={onChange}
            onEditList={onEditList}
            onAddRow={onAddRow}
            onRemoveRow={onRemoveRow}
            dirtyPaths={dirtyPaths}
          />
        </div>
      </div>
    );
  }

  // ── Array of objects: mini-tabell med radvis rendering
  if (kind === 'array-of-objects') {
    return (
      <div className="rop-card rop-card-rows" data-testid={`rop-rows-${pathKey}`}>
        <div className="rop-card-header">
          <span className="rop-card-title">{fieldName}</span>
          <span className="rop-card-meta">
            {value.length} {value.length === 1 ? 'rad' : 'rader'}
          </span>
          <button
            type="button"
            className="rop-add-row-btn"
            onClick={() => {
              // Bygg template fra første rad om mulig
              const template = value[0]
                ? Object.fromEntries(Object.keys(value[0]).map((k) => [k, '']))
                : {};
              onAddRow && onAddRow(path, template);
            }}
            data-testid={`rop-add-row-${pathKey}`}
            title="Legg til ny rad"
          >
            + Ny rad
          </button>
        </div>
        <div className="rop-card-body">
          {value.map((row, idx) => (
            <div key={idx} className="rop-row-card" data-testid={`rop-row-${pathKey}-${idx}`}>
              <div className="rop-row-header">
                <span className="rop-row-number">#{idx + 1}</span>
                <button
                  type="button"
                  className="rop-remove-row-btn"
                  onClick={() => onRemoveRow && onRemoveRow([...path, idx])}
                  data-testid={`rop-remove-row-${pathKey}-${idx}`}
                  title="Slett denne raden"
                  aria-label={`Slett rad ${idx + 1}`}
                >
                  🗑
                </button>
              </div>
              <RecursiveObjectPanel
                data={row}
                basePath={[...path, idx]}
                onChange={onChange}
                onEditList={onEditList}
                onAddRow={onAddRow}
                onRemoveRow={onRemoveRow}
                dirtyPaths={dirtyPaths}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Array of primitives: chips + Rediger-knapp
  if (kind === 'array-of-primitives' || kind === 'array-empty') {
    const list = Array.isArray(value) ? value : [];
    return (
      <div className="rop-field-row rop-field-array">
        <label className="rop-label">
          {fieldName}
          <span className="rop-meta"> · liste · {list.length}</span>
        </label>
        <button
          type="button"
          className={`rop-array-btn${dirtyClass}`}
          onClick={() => onEditList && onEditList(path, list)}
          data-testid={`rop-input-${pathKey}`}
          title="Rediger listen"
        >
          <span className="rop-array-preview">
            {list.slice(0, 8).map((v, i) => (
              <span key={i} className="rop-array-chip">{String(v)}</span>
            ))}
            {list.length > 8 && (
              <span className="rop-array-more">+{list.length - 8}</span>
            )}
            {list.length === 0 && <span className="rop-array-empty">(tom)</span>}
          </span>
          <span className="rop-array-edit">📝 Rediger</span>
        </button>
      </div>
    );
  }

  // ── Primitive (string / number / boolean / null)
  const type = typeof value;
  return (
    <div className="rop-field-row">
      <label className="rop-label">{fieldName}</label>
      {type === 'boolean' ? (
        <input
          type="checkbox"
          className={`rop-checkbox${dirtyClass}`}
          checked={!!value}
          onChange={(e) => onChange(path, e.target.checked)}
          data-testid={`rop-input-${pathKey}`}
        />
      ) : type === 'number' ? (
        <input
          type="number"
          className={`rop-input${dirtyClass}`}
          value={value ?? 0}
          onChange={(e) => onChange(path, Number(e.target.value))}
          data-testid={`rop-input-${pathKey}`}
        />
      ) : (
        <input
          type="text"
          className={`rop-input${dirtyClass}`}
          value={value ?? ''}
          onChange={(e) => onChange(path, e.target.value)}
          data-testid={`rop-input-${pathKey}`}
        />
      )}
    </div>
  );
}
