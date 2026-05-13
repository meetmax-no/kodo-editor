import React, { useEffect, useRef, useState, useMemo } from 'react';
import './CommandPalette.css';

/**
 * CommandPalette — Cmd+K / Ctrl+K
 * Søker på tvers av seksjoner, presets, hurtighandlinger, og kan filtrere rader.
 */
export default function CommandPalette({
  open,
  onClose,
  sections,
  activeSectionKey,
  onSelectSection,
  presets,
  onSelectPreset,
  actions,
  onSearchInTable,
}) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items = useMemo(() => {
    const list = [];
    // Quick actions
    (actions || []).forEach((a) => {
      list.push({
        kind: 'action',
        id: `action-${a.id}`,
        label: a.label,
        hint: a.hint || 'Handling',
        run: a.run,
        icon: a.icon || '⚡',
      });
    });

    // Sections
    (sections || []).forEach((s) => {
      list.push({
        kind: 'section',
        id: `sec-${s.key}`,
        label: s.key,
        hint: `Seksjon · ${s.type}`,
        run: () => onSelectSection?.(s.key),
        active: s.key === activeSectionKey,
        icon: '⊞',
      });
    });

    // Presets
    (presets || []).forEach((p, idx) => {
      if (!p.url) return;
      list.push({
        kind: 'preset',
        id: `preset-${idx}`,
        label: p.name,
        hint: 'Last URL',
        run: () => onSelectPreset?.(idx),
        icon: '🔗',
      });
    });

    // Search-in-table fallback
    if (query && onSearchInTable) {
      list.push({
        kind: 'search',
        id: 'search-table',
        label: `Søk "${query}" i tabell`,
        hint: 'Filtrer aktive rader',
        run: () => onSearchInTable(query),
        icon: '🔍',
      });
    }

    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        (it.hint || '').toLowerCase().includes(q) ||
        it.kind === 'search'
    );
  }, [sections, activeSectionKey, presets, actions, query, onSelectSection, onSelectPreset, onSearchInTable]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const runItem = (item) => {
    if (!item) return;
    item.run?.();
    onClose();
  };

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runItem(items[activeIdx]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="cmdk-overlay" onClick={onClose} data-testid="command-palette">
      <div className="cmdk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk-input-wrap">
          <span className="cmdk-glyph">⌕</span>
          <input
            ref={inputRef}
            className="cmdk-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Søk seksjoner, URL-er, handlinger…"
            data-testid="cmdk-input"
            autoFocus
          />
          <kbd className="cmdk-esc">esc</kbd>
        </div>

        <div className="cmdk-list">
          {items.length === 0 && (
            <div className="cmdk-empty">Ingen treff for "{query}"</div>
          )}
          {items.map((it, idx) => (
            <button
              key={it.id}
              className={`cmdk-item ${idx === activeIdx ? 'active' : ''} ${
                it.active ? 'current' : ''
              }`}
              onClick={() => runItem(it)}
              onMouseEnter={() => setActiveIdx(idx)}
              data-testid={`cmdk-item-${it.id}`}
            >
              <span className="cmdk-icon">{it.icon}</span>
              <span className="cmdk-label">{it.label}</span>
              <span className="cmdk-hint">{it.hint}</span>
              {it.active && <span className="cmdk-current-dot">●</span>}
            </button>
          ))}
        </div>

        <div className="cmdk-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> naviger</span>
          <span><kbd>↵</kbd> velg</span>
          <span><kbd>esc</kbd> lukk</span>
        </div>
      </div>
    </div>
  );
}
