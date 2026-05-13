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
        className="cat-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        title="Kategori-meny"
        aria-label="Kategori-meny"
        data-testid="category-menu-btn"
      >
        <span className="cat-menu-dots">⋯</span>
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
                <span className="cat-menu-icon">✏️</span>
                <span>Endre navn</span>
              </button>
              <button className="cat-menu-item" onClick={startAdd} data-testid="cat-menu-add">
                <span className="cat-menu-icon">➕</span>
                <span>Ny kategori</span>
              </button>
              <div className="cat-menu-divider" />
              <button
                className="cat-menu-item"
                onClick={() => { onMoveUp(); close(); }}
                disabled={!canMoveUp}
                data-testid="cat-menu-up"
              >
                <span className="cat-menu-icon">↑</span>
                <span>Flytt opp</span>
              </button>
              <button
                className="cat-menu-item"
                onClick={() => { onMoveDown(); close(); }}
                disabled={!canMoveDown}
                data-testid="cat-menu-down"
              >
                <span className="cat-menu-icon">↓</span>
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
                <span className="cat-menu-icon">🗑</span>
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
