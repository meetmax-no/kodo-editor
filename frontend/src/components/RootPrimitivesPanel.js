import React from 'react';
import './RootPrimitivesPanel.css';

/**
 * RootPrimitivesPanel
 * Viser og redigerer rot-nivå primitiver (string/number/boolean) som ligger
 * direkte på roten av JSON-filen, f.eks. "version" og "updatedAt".
 *
 * V4.1: Støtter også arrays-av-primitiver (f.eks. emojiPresets) som ett
 * redigerbart felt med list-edit-knapp.
 *
 * V6.1: Støtter også nested objects og array-of-objects via JsonValueModal
 *       (åpnes via onEditJson). Brukes for MIXED_OBJECT-seksjoner.
 *
 * Props:
 *   data         - { fieldName: value, ... }
 *   dirtyFields  - Set<string> ("root__fieldName")
 *   onChange     - (fieldName, newValue) => void   (string/number/boolean)
 *   onEditArray  - (fieldName, arrayValue) => void (åpner ListEditModal)
 *   onEditJson   - (fieldName, value) => void      (åpner JsonValueModal — nested obj / array-of-obj)
 */
export default function RootPrimitivesPanel({ data, dirtyFields, onChange, onEditArray, onEditJson }) {
  const keys = Object.keys(data || {});
  if (keys.length === 0) return null;

  const isArrayOfPrimitives = (arr) =>
    Array.isArray(arr) && arr.length > 0 && arr.every((v) => v === null || typeof v !== 'object');

  return (
    <div className="rpp-wrapper" data-testid="root-primitives-panel">
      <div className="rpp-grid">
        {keys.map((key) => {
          const value = data[key];
          const isArr = Array.isArray(value);
          const isObj = value !== null && typeof value === 'object' && !isArr;
          const isPrimArr = isArr && isArrayOfPrimitives(value);
          const isComplex = isObj || (isArr && !isPrimArr); // nested obj eller array-of-objects
          const type = typeof value;
          const isEdited = dirtyFields?.has(`root__${key}`);
          const dirtyClass = isEdited ? ' edited' : '';

          // Meta-tekst i label
          let metaLabel = null;
          if (isPrimArr) metaLabel = ` · liste · ${value.length}`;
          else if (isArr) metaLabel = ` · liste · ${value.length} ${value.length === 1 ? 'objekt' : 'objekter'}`;
          else if (isObj) metaLabel = ` · objekt · ${Object.keys(value).length} felt`;

          return (
            <div key={key} className={`rpp-field${isArr || isObj ? ' rpp-field-array' : ''}`}>
              <label className="rpp-label">
                {key}
                {metaLabel && <span className="rpp-meta">{metaLabel}</span>}
              </label>

              {isPrimArr ? (
                <button
                  type="button"
                  className={`rpp-array-btn${dirtyClass}`}
                  onClick={() => onEditArray && onEditArray(key, value)}
                  data-testid={`root-primitive-${key}`}
                  title="Klikk for å redigere listen"
                >
                  <span className="rpp-array-preview">
                    {value.slice(0, 10).map((v, i) => (
                      <span key={i} className="rpp-array-chip">{String(v)}</span>
                    ))}
                    {value.length > 10 && (
                      <span className="rpp-array-more">+{value.length - 10}</span>
                    )}
                  </span>
                  <span className="rpp-array-edit">📝 Rediger</span>
                </button>
              ) : isComplex ? (
                <button
                  type="button"
                  className={`rpp-array-btn${dirtyClass}`}
                  onClick={() => onEditJson && onEditJson(key, value)}
                  data-testid={`root-primitive-${key}`}
                  title="Klikk for å redigere som JSON"
                >
                  <span className="rpp-array-preview">
                    {isObj
                      ? Object.keys(value).slice(0, 6).map((k, i) => (
                          <span key={i} className="rpp-array-chip">{k}</span>
                        ))
                      : value.slice(0, 4).map((_, i) => (
                          <span key={i} className="rpp-array-chip">#{i + 1}</span>
                        ))}
                    {(isObj ? Object.keys(value).length : value.length) > (isObj ? 6 : 4) && (
                      <span className="rpp-array-more">
                        +{(isObj ? Object.keys(value).length : value.length) - (isObj ? 6 : 4)}
                      </span>
                    )}
                  </span>
                  <span className="rpp-array-edit">🔧 Rediger JSON</span>
                </button>
              ) : type === 'boolean' ? (
                <input
                  type="checkbox"
                  className={`rpp-checkbox${dirtyClass}`}
                  checked={!!value}
                  onChange={(e) => onChange(key, e.target.checked)}
                  data-testid={`root-primitive-${key}`}
                />
              ) : type === 'number' ? (
                <input
                  type="number"
                  className={`rpp-input${dirtyClass}`}
                  value={value ?? 0}
                  onChange={(e) => onChange(key, Number(e.target.value))}
                  data-testid={`root-primitive-${key}`}
                />
              ) : (
                <input
                  type="text"
                  className={`rpp-input${dirtyClass}`}
                  value={value ?? ''}
                  onChange={(e) => onChange(key, e.target.value)}
                  data-testid={`root-primitive-${key}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
