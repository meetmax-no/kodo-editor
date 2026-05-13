import React, { useState, useEffect } from 'react';
import './Modal.css';

function ColorPickerModal({ isOpen, onClose, currentColor, onSave }) {
  const [color, setColor] = useState(currentColor || '#000000');

  useEffect(() => {
    setColor(currentColor || '#000000');
  }, [currentColor, isOpen]);

  const handleSave = () => {
    onSave(color);
    onClose();
  };

  const handleColorChange = (newColor) => {
    // Ensure hex format
    if (!newColor.startsWith('#')) {
      newColor = '#' + newColor;
    }
    setColor(newColor.toUpperCase());
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">🎨 Velg farge</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="color-preview-section">
            <div 
              className="color-preview-large"
              style={{ 
                background: color,
                border: `2px solid ${color === '#FFFFFF' ? '#e5e7eb' : color}`
              }}
            >
              <div className="color-preview-label">{color}</div>
            </div>
          </div>

          <div className="color-input-section">
            <label className="color-label">Hex-kode:</label>
            <div className="color-input-row">
              <span className="hex-prefix">#</span>
              <input
                type="text"
                className="color-hex-input"
                value={color.replace('#', '')}
                onChange={(e) => handleColorChange(e.target.value)}
                placeholder="000000"
                maxLength="6"
                pattern="[0-9A-Fa-f]{6}"
              />
            </div>
          </div>

          <div className="color-picker-section">
            <label className="color-label">Visuell velger:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
              className="color-picker-native"
            />
          </div>

          <div className="color-presets">
            <div className="color-label">Vanlige farger:</div>
            <div className="preset-colors">
              {[
                '#FF0000', '#FF6B00', '#FFD700', '#00FF00', 
                '#00BFFF', '#0000FF', '#8B00FF', '#FF1493',
                '#808080', '#000000', '#FFFFFF', '#8B4513'
              ].map((presetColor) => (
                <button
                  key={presetColor}
                  className="preset-color-btn"
                  style={{ 
                    background: presetColor,
                    border: color === presetColor ? '3px solid #2563eb' : '2px solid #e5e7eb'
                  }}
                  onClick={() => setColor(presetColor)}
                  title={presetColor}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>
            Avbryt
          </button>
          <button className="modal-btn modal-btn-save" onClick={handleSave}>
            ✅ Velg farge
          </button>
        </div>
      </div>
    </div>
  );
}

export default ColorPickerModal;
