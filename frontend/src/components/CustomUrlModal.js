import React, { useEffect, useRef, useState } from 'react';
import './CustomUrlModal.css';

/**
 * CustomUrlModal — popup for å lime inn / skrive en custom JSON-URL.
 * Åpnes når brukeren velger "Custom URL..." fra preset-dropdown.
 */
export default function CustomUrlModal({ open, onClose, initialUrl, onConfirm }) {
  const [url, setUrl] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUrl(initialUrl || '');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open, initialUrl]);

  if (!open) return null;

  const isValid = url.trim().match(/^https?:\/\//i);

  const submit = () => {
    if (!isValid) return;
    onConfirm(url.trim());
  };

  return (
    <div className="curl-overlay" onClick={onClose} data-testid="custom-url-modal">
      <div
        className="curl-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="curl-header">
          <div>
            <h2 className="curl-title">Custom JSON-URL</h2>
            <p className="curl-subtitle">
              Lim inn URL-en til en JSON-fil (raw GitHub-link, eller direkte .json-URL)
            </p>
          </div>
          <button
            className="curl-close"
            onClick={onClose}
            data-testid="curl-close-btn"
            aria-label="Lukk"
          >
            ✕
          </button>
        </header>

        <div className="curl-body">
          <input
            ref={inputRef}
            type="text"
            className="curl-input"
            placeholder="https://raw.githubusercontent.com/.../data.json"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValid) submit();
              if (e.key === 'Escape') onClose();
            }}
            data-testid="curl-input"
            spellCheck={false}
          />
          <p className="curl-hint">
            <strong>Tips:</strong> For GitHub-filer, klikk "Raw" og bruk den URL-en.
            Den må starte med <code>https://</code>.
          </p>
        </div>

        <footer className="curl-footer">
          <button
            type="button"
            className="curl-btn-cancel"
            onClick={onClose}
            data-testid="curl-cancel-btn"
          >
            Avbryt
          </button>
          <button
            type="button"
            className="curl-btn-confirm"
            onClick={submit}
            disabled={!isValid}
            data-testid="curl-confirm-btn"
          >
            Last inn
          </button>
        </footer>
      </div>
    </div>
  );
}
