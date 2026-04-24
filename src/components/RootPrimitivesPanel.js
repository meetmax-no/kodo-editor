import React from 'react';
import './RootPrimitivesPanel.css';

/**
 * RootPrimitivesPanel
 * Viser og redigerer rot-nivå primitiver (string/number/boolean) som ligger
 * direkte på roten av JSON-filen, f.eks. "version" og "updatedAt".
 *
 * Props:
 *   data         - { fieldName: value, ... }
 *   dirtyFields  - Set<string> ("root__fieldName")
 *   onChange     - (fieldName, newValue) => void
 */
export default function RootPrimitivesPanel({ data, dirtyFields, onChange }) {
  const keys = Object.keys(data || {});
  if (keys.length === 0) return null;

  return (
    <div className="rpp-wrapper" data-testid="root-primitives-panel">
      <div className="rpp-grid">
        {keys.map((key) => {
          const value = data[key];
          const type = typeof value;
          const isEdited = dirtyFields?.has(`root__${key}`);
          const dirtyClass = isEdited ? ' edited' : '';

          return (
            <div key={key} className="rpp-field">
              <label className="rpp-label">{key}</label>
              {type === 'boolean' ? (
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
