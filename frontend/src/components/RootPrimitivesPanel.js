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
 * Props:
 *   data         - { fieldName: value, ... }
 *   dirtyFields  - Set<string> ("root__fieldName")
 *   onChange     - (fieldName, newValue) => void   (string/number/boolean)
 *   onEditArray  - (fieldName, arrayValue) => void (åpner ListEditModal)
 */
export default function RootPrimitivesPanel({ data, dirtyFields, onChange, onEditArray }) {
  const keys = Object.keys(data || {});
  if (keys.length === 0) return null;

  return (
    <div className="rpp-wrapper" data-testid="root-primitives-panel">
      <div className="rpp-grid">
        {keys.map((key) => {
          const value = data[key];
          const isArray = Array.isArray(value);
          const type = typeof value;
          const isEdited = dirtyFields?.has(`root__${key}`);
          const dirtyClass = isEdited ? ' edited' : '';

          return (
            <div key={key} className={`rpp-field${isArray ? ' rpp-field-array' : ''}`}>
              <label className="rpp-label">
                {key}
                {isArray && <span className="rpp-meta"> · liste · {value.length}</span>}
              </label>

              {isArray ? (
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
