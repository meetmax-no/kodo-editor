import React, { useState, useEffect } from 'react';
import './Modal.css';

function TextEditModal({ isOpen, onClose, title, value, onSave }) {
  const [text, setText] = useState(value || '');

  useEffect(() => {
    setText(value || '');
  }, [value, isOpen]);

  const handleSave = () => {
    onSave(text);
    onClose();
  };

  const handleKeyDown = (e) => {
    // Save on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">✏️ {title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <textarea
            className="text-edit-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Skriv inn tekst her..."
            autoFocus
          />
          <div className="char-count">
            {text.length} tegn
          </div>
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280' }}>
            💡 Tips: Trykk Ctrl+Enter for å lagre raskt
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>
            Avbryt
          </button>
          <button className="modal-btn modal-btn-save" onClick={handleSave}>
            💾 Lagre
          </button>
        </div>
      </div>
    </div>
  );
}

export default TextEditModal;
