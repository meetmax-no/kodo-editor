import React, { useState } from 'react';
import './AddFieldModal.css';

/**
 * AddFieldModal
 * Lar brukeren legge til et nytt felt (kolonne) i alle rader i gjeldende seksjon.
 */
export default function AddFieldModal({ isOpen, existingFields, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Feltnavnet kan ikke være tomt');
      return;
    }
    if (trimmed.startsWith('_')) {
      setError('Feltnavn kan ikke starte med understrek');
      return;
    }
    if (existingFields.includes(trimmed)) {
      setError('Dette feltnavnet finnes allerede');
      return;
    }
    onAdd(trimmed, type);
    setName('');
    setType('text');
    setError(null);
  };

  const handleClose = () => {
    setName('');
    setType('text');
    setError(null);
    onClose();
  };

  return (
    <div className="afm-overlay" onClick={handleClose} data-testid="add-field-modal-overlay">
      <div className="afm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="afm-header">
          <h3 className="afm-title">Legg til nytt felt</h3>
          <button className="afm-close" onClick={handleClose} data-testid="add-field-close-btn">✕</button>
        </div>

        <div className="afm-body">
          <div className="afm-section">
            <label className="afm-label">Feltnavn</label>
            <input
              className="afm-input"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="f.eks. rabatt, beskrivelse, ikon"
              autoFocus
              data-testid="add-field-name-input"
            />
          </div>

          <div className="afm-section">
            <label className="afm-label">Type</label>
            <select
              className="afm-input"
              value={type}
              onChange={(e) => setType(e.target.value)}
              data-testid="add-field-type-select"
            >
              <option value="text">Kort tekst</option>
              <option value="longtext">Lang tekst</option>
              <option value="number">Tall</option>
              <option value="boolean">Ja / Nei</option>
              <option value="array">Liste (array)</option>
            </select>
          </div>

          {error && <div className="afm-error">{error}</div>}
        </div>

        <div className="afm-footer">
          <button className="afm-btn-ghost" onClick={handleClose} data-testid="add-field-cancel-btn">
            Avbryt
          </button>
          <button className="afm-btn-primary" onClick={handleAdd} data-testid="add-field-confirm-btn">
            Legg til felt
          </button>
        </div>
      </div>
    </div>
  );
}
