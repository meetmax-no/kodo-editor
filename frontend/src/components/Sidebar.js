import React from 'react';
import './Sidebar.css';

/**
 * Sidebar — vertikal seksjons-velger som erstatter horisontal SectionPicker
 * når man har mange (≥7) seksjoner. Kompakt, persistent, søkbar.
 */
export default function Sidebar({
  sections,
  activeKey,
  onSelect,
  dirtySections,
  collapsed,
  onToggleCollapsed,
}) {
  if (!sections || sections.length === 0) return null;

  const iconForType = (type) => {
    switch (type) {
      case 'array_of_objects':
        return '⊞';
      case 'dict_of_objects':
        return '⇄';
      case 'dict_of_primitives':
        return '⇋';
      case 'primitive':
        return '▪';
      case 'nested_categories':
        return '▤';
      default:
        return '◇';
    }
  };

  return (
    <aside
      className={`sidebar ${collapsed ? 'collapsed' : ''}`}
      data-testid="sidebar"
    >
      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggleCollapsed}
        title={collapsed ? 'Vis seksjoner' : 'Skjul seksjoner'}
        data-testid="sidebar-toggle"
      >
        {collapsed ? '›' : '‹'}
      </button>

      {!collapsed && (
        <div className="sidebar-header">
          <span className="sidebar-title">SEKSJONER</span>
          <span className="sidebar-count">{sections.length}</span>
        </div>
      )}

      <div className="sidebar-scroll">
      <nav className="sidebar-list">
        {sections.map((s) => {
          const isActive = s.key === activeKey;
          const isDirty = dirtySections?.has(s.key);
          const displayKey = s.key === '__root__' ? 'Rot-felter' : s.key;
          return (
            <button
              key={s.key}
              type="button"
              className={`sidebar-item ${isActive ? 'active' : ''} ${
                isDirty ? 'dirty' : ''
              }`}
              onClick={() => onSelect?.(s.key)}
              title={collapsed ? displayKey : ''}
              data-testid={`sidebar-item-${s.key}`}
            >
              <span className="sidebar-item-icon">{iconForType(s.type)}</span>
              {!collapsed && (
                <>
                  <span className="sidebar-item-label">{displayKey}</span>
                  {isDirty && <span className="sidebar-item-dirty" title="Ulagrede endringer" />}
                </>
              )}
            </button>
          );
        })}
      </nav>
      </div>
    </aside>
  );
}
