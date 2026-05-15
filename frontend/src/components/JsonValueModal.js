import React, { useEffect, useState } from 'react';
import './Modal.css';

/**
 * JsonValueModal — rediger et nested objekt eller array-of-objects som rå JSON.
 *
 * Brukes som "escape hatch" for komplekse felter inne i et MIXED_OBJECT som
 * editorens vanlige tabell-/dict-modus ikke kan håndtere direkte.
 *
 * Props:
 *   isOpen
 *   onClose
 *   fieldName    – navn på feltet (vises i header)
 *   initialValue – verdien (objekt eller array) som skal redigeres
 *   onSave       – (newValue) => void  (kalles med parset JSON)
 */
export default function JsonValueModal({ isOpen, onClose, fieldName, initialValue, onSave }) {
  const [text, setText] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    try {
      setText(JSON.stringify(initialValue ?? null, null, 2));
    } catch {
      setText('');
    }
    setError(null);
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      const parsed = JSON.parse(text);
      onSave(parsed);
      onClose();
    } catch (e) {
      setError(`Ugyldig JSON: ${e.message}`);
    }
  };

  const summary = Array.isArray(initialValue)
    ? `liste · ${initialValue.length} element${initialValue.length === 1 ? '' : 'er'}`
    : initialValue && typeof initialValue === 'object'
    ? `objekt · ${Object.keys(initialValue).length} felt`
    : 'verdi';

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="json-value-modal">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '720px', width: '90vw' }}
        role="dialog"
        aria-modal="true"
      >
        <header className="modal-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2 className="modal-title">Rediger «{fieldName}»</h2>
            <p className="modal-subtitle" style={{ marginTop: 4 }}>
              {summary} · rediger som JSON
            </p>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            data-testid="json-value-close-btn"
            aria-label="Lukk"
          >
            ✕
          </button>
        </header>

        <div className="modal-body">
          <textarea
            className="modal-textarea"
            value={text}
            onChange={(e) => { setText(e.target.value); setError(null); }}
            spellCheck={false}
            rows={18}
            style={{
              width: '100%',
              fontFamily: "var(--mono, 'Geist Mono', monospace)",
              fontSize: 13,
              lineHeight: 1.55,
              tabSize: 2,
              minHeight: 320,
            }}
            data-testid="json-value-textarea"
          />
          {error && (
            <div
              className="modal-error"
              style={{
                marginTop: 10,
                padding: '8px 12px',
                background: 'rgba(248, 113, 113, 0.12)',
                border: '1px solid rgba(248, 113, 113, 0.35)',
                borderRadius: 8,
                color: '#FCA5A5',
                fontSize: 13,
              }}
              data-testid="json-value-error"
            >
              {error}
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            data-testid="json-value-cancel-btn"
          >
            Avbryt
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            data-testid="json-value-save-btn"
          >
            Lagre
          </button>
        </footer>
      </div>
    </div>
  );
}
