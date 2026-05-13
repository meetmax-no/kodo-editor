import React, { useState, useRef, useEffect } from 'react';
import './CategoryMenu.css';

/**
 * CategoryMenu — kategoriadministrasjon ved siden av dropdown.
 *
 * Knapp (⋯) som åpner en popover med:
 *   ✏️  Endre navn — inline tekst-input
 *   ➕  Ny kategori — inline tekst-input
 *   ↑   Flytt opp
 *   ↓   Flytt ned
 *   🗑   Slett (med bekreftelse via onConfirmDelete)
 *
 * @param {string} currentName    – Navnet på gjeldende kategori
 * @param {number} index          – Index av gjeldende kategori
 * @param {number} total          – Totalt antall kategorier
 * @param {(name) => void}        onRename
 * @param {(name) => void}        onAdd
 * @param {() => void}            onMoveUp
 * @param {() => void}            onMoveDown
 * @param {() => void}            onDelete   (caller bør be om bekreftelse)
 */
export default function CategoryMenu({
  currentName,
  index,
  total,
  onRename,
  onAdd,
  onMoveUp,
  onMoveDown,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null); // null | 'rename' | 'add'
  const [draft, setDraft] = useState('');
  const popRef = useRef(null);
  const inputRef = useRef(null);

  // Lukk på klikk utenfor
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) {
        close();
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Auto-focus input når vi går i edit-modus
  useEffect(() => {
    if (mode && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [mode]);

  const close = () => { setOpen(false); setMode(null); setDraft(''); };

  const startRename = () => { setMode('rename'); setDraft(currentName || ''); };
  const startAdd = () => { setMode('add'); setDraft(''); };

  const commit = (e) => {
    e?.preventDefault();
    const v = draft.trim();
    if (!v) { close(); return; }
    if (mode === 'rename') {
      if (v !== currentName) onRename(v);
    } else if (mode === 'add') {
      onAdd(v);
    }
    close();
  };

  const onKey = (e) => {
    if (e.key === 'Escape') { close(); }
    else if (e.key === 'Enter') commit(e);
  };

  const canMoveUp = index > 0;
  const canMoveDown = index < total - 1;
  const canDelete = total > 1;

  return (
    <div className="cat-menu-wrap" ref={popRef}>
      <button
        type="button"
        className={`cat-menu-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title="Endre, legg til eller slett kategori"
        aria-label="Endre kategori"
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="category-menu-btn"
      >
        <svg
          className="cat-menu-icon-pen"
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        <span className="cat-menu-trigger-label">Endre</span>
        <span className={`cat-menu-chevron ${open ? 'open' : ''}`} aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="cat-menu-popover" role="menu" data-testid="category-menu-popover">
          {mode === null && (
            <>
              <div className="cat-menu-header">
                <span className="cat-menu-label">Kategori</span>
                <span className="cat-menu-current">{currentName || '(ingen)'}</span>
              </div>
              <div className="cat-menu-divider" />
              <button className="cat-menu-item" onClick={startRename} data-testid="cat-menu-rename">
                <IconPen className="cat-menu-icon" />
                <span>Endre navn</span>
              </button>
              <button className="cat-menu-item" onClick={startAdd} data-testid="cat-menu-add">
                <IconPlus className="cat-menu-icon" />
                <span>Ny kategori</span>
              </button>
              <div className="cat-menu-divider" />
              <button
                className="cat-menu-item"
                onClick={() => { onMoveUp(); close(); }}
                disabled={!canMoveUp}
                data-testid="cat-menu-up"
              >
                <IconArrow direction="up" className="cat-menu-icon" />
                <span>Flytt opp</span>
              </button>
              <button
                className="cat-menu-item"
                onClick={() => { onMoveDown(); close(); }}
                disabled={!canMoveDown}
                data-testid="cat-menu-down"
              >
                <IconArrow direction="down" className="cat-menu-icon" />
                <span>Flytt ned</span>
              </button>
              <div className="cat-menu-divider" />
              <button
                className="cat-menu-item cat-menu-danger"
                onClick={() => { onDelete(); close(); }}
                disabled={!canDelete}
                title={canDelete ? '' : 'Kan ikke slette siste kategori'}
                data-testid="cat-menu-delete"
              >
                <IconTrash className="cat-menu-icon" />
                <span>Slett kategori</span>
              </button>
            </>
          )}

          {mode !== null && (
            <form className="cat-menu-form" onSubmit={commit}>
              <label className="cat-menu-label">
                {mode === 'rename' ? 'Nytt navn' : 'Navn på ny kategori'}
              </label>
              <input
                ref={inputRef}
                type="text"
                className="cat-menu-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKey}
                placeholder={mode === 'rename' ? currentName : 'Skriv kategorinavn'}
                data-testid={mode === 'rename' ? 'cat-menu-rename-input' : 'cat-menu-add-input'}
              />
              <div className="cat-menu-form-actions">
                <button
                  type="button"
                  className="cat-menu-btn cat-menu-btn-secondary"
                  onClick={close}
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="cat-menu-btn cat-menu-btn-primary"
                  disabled={!draft.trim()}
                  data-testid={mode === 'rename' ? 'cat-menu-rename-save' : 'cat-menu-add-save'}
                >
                  {mode === 'rename' ? 'Lagre' : 'Legg til'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ── Inline SVG-ikoner (tynne, 16px, currentColor) ──
const SVG_PROPS = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

function IconPen(props) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
function IconPlus(props) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconArrow({ direction = 'up', ...props }) {
  const rotate = direction === 'down' ? 180 : 0;
  return (
    <svg {...SVG_PROPS} style={{ transform: `rotate(${rotate}deg)` }} {...props}>
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}
function IconTrash(props) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

