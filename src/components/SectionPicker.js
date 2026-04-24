import React from 'react';
import './SectionPicker.css';

const TYPE_LABEL = {
  'array-of-objects': 'Liste',
  'dict-of-objects': 'Dictionary',
  'dict-of-primitives': 'Nøkkel/verdi',
  'primitive': 'Rot-felter',
  'nested-categories': 'Kategorier',
};

const TYPE_ICON = {
  'array-of-objects': '▤',
  'dict-of-objects': '⊞',
  'dict-of-primitives': '⇄',
  'primitive': '▪',
  'nested-categories': '⊟',
};

/**
 * SectionPicker
 * Viser alle redigerbare seksjoner som klikkbare tabs. Markerer aktiv + dirty.
 */
export default function SectionPicker({ sections, activeKey, onSelect, dirtySections }) {
  if (!sections || sections.length === 0) return null;

  return (
    <div className="sp-wrapper" data-testid="section-picker">
      <div className="sp-header">
        <span className="sp-header-title">Seksjoner</span>
        <span className="sp-header-count">{sections.length}</span>
      </div>
      <div className="sp-tabs">
        {sections.map((s) => {
          const isActive = s.key === activeKey;
          const isDirty = dirtySections?.has(s.key);
          const label = s.key === '__root__' ? 'Rot-felter' : s.key;
          const count =
            s.type === 'primitive'
              ? (s.fields?.length ?? 0)
              : s.count;

          return (
            <button
              key={s.key}
              className={`sp-tab ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(s.key)}
              data-testid={`section-tab-${s.key}`}
              title={TYPE_LABEL[s.type] || s.type}
            >
              <span className="sp-tab-icon" aria-hidden="true">{TYPE_ICON[s.type] || '▫'}</span>
              <span className="sp-tab-label">{label}</span>
              {count !== undefined && (
                <span className="sp-tab-count">{count}</span>
              )}
              {isDirty && <span className="sp-tab-dirty" title="Ulagrede endringer">●</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
