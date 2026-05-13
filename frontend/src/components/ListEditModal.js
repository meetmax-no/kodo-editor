import React, { useState, useEffect } from 'react';
import './Modal.css';

function ListEditModal({ isOpen, onClose, title, items, onSave }) {
  const [listItems, setListItems] = useState([]);
  const [isObjectArray, setIsObjectArray] = useState(false);

  useEffect(() => {
    const itemsArray = Array.isArray(items) ? [...items] : [];
    setListItems(itemsArray);
    
    // Check if items are objects
    if (itemsArray.length > 0 && typeof itemsArray[0] === 'object' && itemsArray[0] !== null) {
      setIsObjectArray(true);
    } else {
      setIsObjectArray(false);
    }
  }, [items, isOpen]);

  const handleAddItem = () => {
    if (isObjectArray && listItems.length > 0) {
      // Create empty object with same keys as first item
      const newItem = {};
      Object.keys(listItems[0]).forEach(key => {
        newItem[key] = '';
      });
      setListItems([...listItems, newItem]);
    } else {
      setListItems([...listItems, '']);
    }
  };

  const handleUpdateItem = (index, value) => {
    const updated = [...listItems];
    updated[index] = value;
    setListItems(updated);
  };

  const handleUpdateObjectField = (index, field, value) => {
    const updated = [...listItems];
    updated[index] = { ...updated[index], [field]: value };
    setListItems(updated);
  };

  const handleDeleteItem = (index) => {
    const updated = listItems.filter((_, i) => i !== index);
    setListItems(updated);
  };

  const handleSave = () => {
    if (isObjectArray) {
      onSave(listItems);
    } else {
      // Filter out empty strings
      const filtered = listItems.filter(item => typeof item === 'string' && item.trim() !== '');
      onSave(filtered);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">📝 {title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {listItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">
                Listen er tom. Klikk "Legg til item" for å starte.
              </div>
            </div>
          ) : (
            <div className="list-items">
              {listItems.map((item, index) => (
                isObjectArray ? (
                  // Render object fields
                  <div key={index} className="list-item-object">
                    <div className="list-item-number">{index + 1}.</div>
                    <div className="list-item-fields">
                      {Object.keys(item).map((field) => (
                        <div key={field} className="object-field">
                          <label>{field}:</label>
                          <input
                            type="text"
                            value={item[field]}
                            onChange={(e) => handleUpdateObjectField(index, field, e.target.value)}
                            className="list-item-input"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      className="list-item-delete"
                      onClick={() => handleDeleteItem(index)}
                    >
                      🗑️
                    </button>
                  </div>
                ) : (
                  // Render simple string
                  <div key={index} className="list-item">
                    <div className="list-item-number">{index + 1}.</div>
                    <input
                      type="text"
                      className="list-item-input"
                      value={item}
                      onChange={(e) => handleUpdateItem(index, e.target.value)}
                      placeholder={`Item ${index + 1}`}
                    />
                    <button
                      className="list-item-delete"
                      onClick={() => handleDeleteItem(index)}
                    >
                      🗑️
                    </button>
                  </div>
                )
              ))}
            </div>
          )}

          <button className="add-item-button" onClick={handleAddItem}>
            ➕ Legg til item
          </button>
        </div>

        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>
            Avbryt
          </button>
          <button className="modal-btn modal-btn-save" onClick={handleSave}>
            💾 Lagre ({listItems.length} items)
          </button>
        </div>
      </div>
    </div>
  );
}

export default ListEditModal;
