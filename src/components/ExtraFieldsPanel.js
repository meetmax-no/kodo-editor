import React, { useState } from 'react';
import './ExtraFieldsPanel.css';

/**
 * ExtraFieldsPanel
 * Viser og lar deg redigere rot-objekter som ligger ved siden av hoved-arrayet
 * i JSON-filen (f.eks. `studenttilbud` i priser.json). Hvert rot-objekt blir
 * et sammenleggbart kort med samme widget-valg som hovedtabellen.
 *
 * Props:
 *   extraEntries  - Array<[wrapperKey, objectValue]>
 *   onChange      - (wrapperKey, fieldName, newValue) => void
 *   onEditField   - (wrapperKey, fieldName, value, fieldType) => void
 *                   Brukes for felt som trenger modal (longtext, array, color, icon)
 *   getFieldType  - funksjon fra App som detekterer felt-type
 */
export default function ExtraFieldsPanel({ extraEntries, onChange, onEditField, getFieldType }) {
  const [openMap, setOpenMap] = useState(() => {
    // Default: åpne alle
    const initial = {};
    extraEntries.forEach(([k]) => { initial[k] = true; });
    return initial;
  });

  if (!extraEntries || extraEntries.length === 0) return null;

  const toggle = (key) => setOpenMap((m) => ({ ...m, [key]: !m[key] }));

  return (
    <div className="efp-wrapper" data-testid="extra-fields-panel">
      <div className="efp-header">
        <span className="efp-header-title">Ekstra felter</span>
        <span className="efp-header-count">{extraEntries.length}</span>
      </div>

      <div className="efp-grid">
        {extraEntries.map(([wrapperKey, obj]) => {
          const isOpen = openMap[wrapperKey];
          const fieldKeys = Object.keys(obj);
          return (
            <div
              key={wrapperKey}
              className={`efp-card ${isOpen ? 'open' : 'closed'}`}
              data-testid={`extra-card-${wrapperKey}`}
            >
              <button
                className="efp-card-toggle"
                onClick={() => toggle(wrapperKey)}
                data-testid={`extra-toggle-${wrapperKey}`}
              >
                <span className={`efp-chevron ${isOpen ? 'open' : ''}`}>▸</span>
                <code className="efp-card-title">{wrapperKey}</code>
                <span className="efp-card-meta">{fieldKeys.length} felter</span>
              </button>

              {isOpen && (
                <div className="efp-card-body">
                  {fieldKeys.map((fieldName) => {
                    const value = obj[fieldName];
                    const type = getFieldType(value);
                    const isIcon = fieldName === 'ikon' || fieldName === 'icon';
                    const isColor = fieldName === 'color' || fieldName === 'farge';

                    return (
                      <div key={fieldName} className="efp-field">
                        <label className="efp-field-label">{fieldName}</label>
                        <div className="efp-field-control">
                          {renderControl({
                            value, type, isIcon, isColor, fieldName, wrapperKey,
                            onChange, onEditField,
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderControl({ value, type, isIcon, isColor, fieldName, wrapperKey, onChange, onEditField }) {
  const testId = `extra-field-${wrapperKey}-${fieldName}`;

  if (type === 'boolean') {
    return (
      <input
        type="checkbox"
        className="efp-checkbox"
        checked={value}
        onChange={(e) => onChange(wrapperKey, fieldName, e.target.checked)}
        data-testid={testId}
      />
    );
  }

  if (type === 'array') {
    return (
      <button
        className="efp-edit-btn"
        onClick={() => onEditField(wrapperKey, fieldName, value, 'array')}
        data-testid={testId}
      >
        📝 {value.length} items
      </button>
    );
  }

  if (isColor) {
    return (
      <button
        className="efp-edit-btn color"
        onClick={() => onEditField(wrapperKey, fieldName, value, 'color')}
        data-testid={testId}
      >
        <span className="efp-color-box" style={{ background: value || '#ccc' }} />
        {value || 'Velg'}
      </button>
    );
  }

  if (isIcon) {
    return (
      <button
        className="efp-edit-btn"
        onClick={() => onEditField(wrapperKey, fieldName, value, 'icon')}
        data-testid={testId}
      >
        🎨 {value || 'Velg'}
      </button>
    );
  }

  if (type === 'longtext') {
    return (
      <button
        className="efp-edit-btn"
        onClick={() => onEditField(wrapperKey, fieldName, value, 'longtext')}
        data-testid={testId}
      >
        ✏️ Rediger ({String(value).length} tegn)
      </button>
    );
  }

  return (
    <input
      type={type === 'number' ? 'number' : 'text'}
      className="efp-input"
      value={value ?? ''}
      onChange={(e) => onChange(wrapperKey, fieldName, e.target.value)}
      data-testid={testId}
    />
  );
}
