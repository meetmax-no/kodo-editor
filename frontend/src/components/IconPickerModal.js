import React, { useState, useEffect } from 'react';
import './Modal.css';

// Vanlige Lucide ikoner med emoji-representasjoner
const ICONS = [
  // ── Tannlege & medisinsk blokk (legg merke til at denne kommer øverst
  //     for rask tilgang ved tannlege/helse-relatert innhold) ──
  { name: 'Tooth', emoji: '🦷' },
  { name: 'Toothbrush', emoji: '🪥' },
  { name: 'Teeth', emoji: '😁' },
  { name: 'Mouth', emoji: '👄' },
  { name: 'Xray', emoji: '🩻' },
  { name: 'Pill', emoji: '💊' },
  { name: 'Syringe', emoji: '💉' },
  { name: 'Bandage', emoji: '🩹' },
  { name: 'Clinic', emoji: '🏥' },
  { name: 'Lotion', emoji: '🧴' },
  { name: 'Bone', emoji: '🦴' },
  { name: 'Scissors', emoji: '✂️' },
  { name: 'TestTube', emoji: '🧪' },
  { name: 'Tools', emoji: '🛠️' },
  { name: 'Bacteria', emoji: '🦠' },
  { name: 'Doctor', emoji: '🧑‍⚕️' },
  { name: 'Crutch', emoji: '🩼' },
  { name: 'Family', emoji: '👨‍👩‍👧' },
  { name: 'Senior', emoji: '👴' },
  { name: 'Student', emoji: '🧑‍🎓' },
  { name: 'Clipboard', emoji: '📋' },
  { name: 'Money', emoji: '💰' },

  // ── Generell blokk (uendret fra forrige liste) ──
  { name: 'Stethoscope', emoji: '🩺' },
  { name: 'Smile', emoji: '😊' },
  { name: 'HeartPulse', emoji: '❤️' },
  { name: 'Sparkles', emoji: '✨' },
  { name: 'AlertCircle', emoji: '⚠️' },
  { name: 'Activity', emoji: '📊' },
  { name: 'ArrowRightLeft', emoji: '↔️' },
  { name: 'Baby', emoji: '👶' },
  { name: 'Calendar', emoji: '📅' },
  { name: 'Camera', emoji: '📷' },
  { name: 'Check', emoji: '✅' },
  { name: 'CheckCircle', emoji: '✔️' },
  { name: 'Clock', emoji: '🕐' },
  { name: 'Cloud', emoji: '☁️' },
  { name: 'Coffee', emoji: '☕' },
  { name: 'Edit', emoji: '✏️' },
  { name: 'File', emoji: '📄' },
  { name: 'FileText', emoji: '📝' },
  { name: 'Flag', emoji: '🚩' },
  { name: 'Folder', emoji: '📁' },
  { name: 'Gift', emoji: '🎁' },
  { name: 'Globe', emoji: '🌐' },
  { name: 'Heart', emoji: '💖' },
  { name: 'Home', emoji: '🏠' },
  { name: 'Image', emoji: '🖼️' },
  { name: 'Info', emoji: 'ℹ️' },
  { name: 'Key', emoji: '🔑' },
  { name: 'Lightbulb', emoji: '💡' },
  { name: 'Lock', emoji: '🔒' },
  { name: 'Mail', emoji: '✉️' },
  { name: 'Map', emoji: '🗺️' },
  { name: 'MapPin', emoji: '📍' },
  { name: 'Menu', emoji: '☰' },
  { name: 'MessageCircle', emoji: '💬' },
  { name: 'Music', emoji: '🎵' },
  { name: 'Phone', emoji: '📞' },
  { name: 'Search', emoji: '🔍' },
  { name: 'Settings', emoji: '⚙️' },
  { name: 'ShoppingCart', emoji: '🛒' },
  { name: 'Star', emoji: '⭐' },
  { name: 'Tag', emoji: '🏷️' },
  { name: 'Trash', emoji: '🗑️' },
  { name: 'TrendingUp', emoji: '📈' },
  { name: 'User', emoji: '👤' },
  { name: 'Users', emoji: '👥' },
  { name: 'Video', emoji: '🎥' },
  { name: 'Wifi', emoji: '📶' },
  { name: 'X', emoji: '❌' },
  { name: 'Zap', emoji: '⚡' },
];

function IconPickerModal({ isOpen, onClose, currentIcon, onSave }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(currentIcon || '');

  useEffect(() => {
    setSelectedIcon(currentIcon || '');
    setSearchQuery('');
  }, [currentIcon, isOpen]);

  const filteredIcons = ICONS.filter(icon =>
    icon.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = () => {
    onSave(selectedIcon);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">🎨 Velg ikon</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <input
            type="text"
            className="icon-search"
            placeholder="Søk etter ikon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />

          {filteredIcons.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-text">
                Ingen ikoner funnet for "{searchQuery}"
              </div>
            </div>
          ) : (
            <div className="icon-grid">
              {filteredIcons.map((icon) => (
                <div
                  key={icon.name}
                  className={`icon-option ${selectedIcon === icon.name ? 'selected' : ''}`}
                  onClick={() => setSelectedIcon(icon.name)}
                >
                  <div className="icon-symbol">{icon.emoji}</div>
                  <div className="icon-name">{icon.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>
            Avbryt
          </button>
          <button 
            className="modal-btn modal-btn-save" 
            onClick={handleSave}
            disabled={!selectedIcon}
          >
            ✅ Velg {selectedIcon && `"${selectedIcon}"`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default IconPickerModal;
