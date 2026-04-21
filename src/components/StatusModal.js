import React from 'react';
import './StatusModal.css';

/**
 * StatusModal
 * Viser detaljert status om den lastede JSON-filen:
 * kilde, struktur, kategorier, felter og bevarte wrapper-nøkler.
 */
export default function StatusModal({ isOpen, onClose, jsonStructure, categories, packages, selectedCategoryIndex }) {
  if (!isOpen) return null;

  const isLoaded = !!jsonStructure;
  const hasCategories = !!jsonStructure?.hasCategories;
  const itemsKey = jsonStructure?.itemsKey;
  const mainKey = jsonStructure?.mainKey;

  // Finn bevarte rot-nøkler (alle nøkler i originalData som IKKE er hoved-arrayet)
  const preservedKeys = jsonStructure?.originalData
    ? Object.keys(jsonStructure.originalData).filter((k) => k !== mainKey)
    : [];

  // Felt-navn i gjeldende kategori
  const fieldNames = packages.length > 0
    ? Object.keys(packages[0]).filter((k) => !k.startsWith('_'))
    : [];

  // Total antall elementer på tvers av alle kategorier
  const totalItems = hasCategories && jsonStructure?.data
    ? jsonStructure.data.reduce((sum, cat) => sum + ((cat[itemsKey] || []).length), 0)
    : packages.length;

  return (
    <div className="sm-overlay" onClick={onClose} data-testid="status-modal-overlay">
      <div className="sm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="sm-header">
          <div>
            <h2 className="sm-title">Status</h2>
            <p className="sm-subtitle">Detaljer om den lastede JSON-filen</p>
          </div>
          <button className="sm-close" onClick={onClose} data-testid="status-modal-close-btn">✕</button>
        </div>

        <div className="sm-body">
          <div className="sm-row">
            <span className="sm-label">Tilstand</span>
            <span className={`sm-badge ${isLoaded ? 'success' : 'muted'}`}>
              {isLoaded ? '● Data lastet' : '○ Mock data'}
            </span>
          </div>

          <div className="sm-row">
            <span className="sm-label">Struktur</span>
            <span className="sm-value">
              {hasCategories ? 'Nested (med kategorier)' : 'Flat liste'}
            </span>
          </div>

          <div className="sm-row">
            <span className="sm-label">Rot-nøkkel</span>
            <code className="sm-code">{mainKey || '—'}</code>
          </div>

          {hasCategories && (
            <div className="sm-row">
              <span className="sm-label">Items-nøkkel</span>
              <code className="sm-code">{itemsKey || '—'}</code>
            </div>
          )}

          <div className="sm-row">
            <span className="sm-label">{hasCategories ? 'Kategorier' : 'Grupper'}</span>
            <span className="sm-value">{categories.length}</span>
          </div>

          <div className="sm-row">
            <span className="sm-label">Elementer totalt</span>
            <span className="sm-value">{totalItems}</span>
          </div>

          <div className="sm-row">
            <span className="sm-label">Valgt kategori</span>
            <span className="sm-value">
              {categories[selectedCategoryIndex] || '—'} · {packages.length} elementer
            </span>
          </div>

          {fieldNames.length > 0 && (
            <div className="sm-row sm-row-block">
              <span className="sm-label">Felter</span>
              <div className="sm-chip-row">
                {fieldNames.map((f) => (
                  <code key={f} className="sm-chip">{f}</code>
                ))}
              </div>
            </div>
          )}

          {preservedKeys.length > 0 && (
            <div className="sm-row sm-row-block">
              <span className="sm-label">Bevarte rot-nøkler</span>
              <div className="sm-chip-row">
                {preservedKeys.map((k) => (
                  <code key={k} className="sm-chip accent">{k}</code>
                ))}
              </div>
              <p className="sm-note">
                Disse nøklene bevares automatisk ved eksport.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
