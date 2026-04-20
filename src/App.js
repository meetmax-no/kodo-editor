import React, { useState } from 'react';
import './App.css';
import TextEditModal from './components/TextEditModal';
import ListEditModal from './components/ListEditModal';
import IconPickerModal from './components/IconPickerModal';
import ColorPickerModal from './components/ColorPickerModal';

// Mock data kun for demo ved oppstart
const MOCK_CATEGORIES = ["Demo"];
const MOCK_PACKAGES = [
  {
    _internalId: 'demo_1',
    info: "Last inn en JSON-fil fra URL eller lokal disk for å starte redigering"
  }
];

// Forhåndslagrede URL-er
const PRESET_URLS = [
  {
    name: "Priser (Tannlege Per)",
    url: "https://raw.githubusercontent.com/meetmax-no/tannlege-per/refs/heads/main/frontend/public/data/priser.json"
  },
  {
    name: "Åpningstider (Tannlege Per)",
    url: "https://raw.githubusercontent.com/meetmax-no/tannlege-per/refs/heads/main/frontend/public/data/apningstider.json"
  },
  {
    name: "Tjenester (Tannlege Per)",
    url: "https://raw.githubusercontent.com/meetmax-no/tannlege-per/refs/heads/main/frontend/public/data/tjenester.json"
  },
  {
    name: "Custom URL...",
    url: ""
  }
];

// Helper: Detect field type
function getFieldType(value) {
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'string') {
    if (value.length > 50) return 'longtext';
    return 'text';
  }
  if (typeof value === 'number') return 'number';
  return 'text';
}

function App() {
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [packages, setPackages] = useState(MOCK_PACKAGES);
  const [categories, setCategories] = useState(MOCK_CATEGORIES);
  const [loadMethod, setLoadMethod] = useState('url');
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customUrl, setCustomUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [jsonStructure, setJsonStructure] = useState(null); // Store original structure

  // Modal states
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [iconModalOpen, setIconModalOpen] = useState(false);
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [editingField, setEditingField] = useState({ packageId: null, fieldName: null, value: null });

  const handleNext = () => {
    if (selectedCategoryIndex < MOCK_CATEGORIES.length - 1) {
      setSelectedCategoryIndex(selectedCategoryIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (selectedCategoryIndex > 0) {
      setSelectedCategoryIndex(selectedCategoryIndex - 1);
    }
  };

  const handleCategoryChange = (e) => {
    const newIndex = parseInt(e.target.value);
    setSelectedCategoryIndex(newIndex);
    
    // If we have a nested structure, load packages for this category
    if (jsonStructure && jsonStructure.hasCategories) {
      const categoryData = jsonStructure.data[newIndex];
      const itemsKey = jsonStructure.itemsKey || 'pakker';
      if (categoryData[itemsKey]) {
        const itemsWithIds = categoryData[itemsKey].map((item, idx) => ({
          _internalId: `cat_${newIndex}_${idx}`,
          ...item
        }));
        setPackages(itemsWithIds);
      }
    }
  };

  // Load JSON from URL
  const handleLoadJSON = async () => {
    const url = selectedPreset === PRESET_URLS.length - 1 
      ? customUrl 
      : PRESET_URLS[selectedPreset].url;

    if (!url) {
      setError('Vennligst skriv inn en URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle different JSON structures
      let mainArray = null;
      let mainKey = null;
      
      // Check if root is already an array
      if (Array.isArray(data)) {
        mainArray = data;
        mainKey = 'items';
      } else {
        // Find the first array in the object
        for (const key of Object.keys(data)) {
          if (Array.isArray(data[key])) {
            mainArray = data[key];
            mainKey = key;
            break;
          }
        }
      }

      if (!mainArray) {
        throw new Error('Fant ingen array i JSON-filen. Sjekk strukturen.');
      }


      // Check if nested structure (like priser.json with categories)
      if (mainArray.length > 0 && mainArray[0].kategori && (mainArray[0].pakker || mainArray[0].tjenester)) {
        // Nested structure with categories
        const categoryNames = mainArray.map(cat => cat.kategori);
        const itemsKey = mainArray[0].pakker ? 'pakker' : 'tjenester';
        const firstCategoryPackages = (mainArray[0][itemsKey] || []).map((item, idx) => ({
          _internalId: `loaded_${Date.now()}_${idx}`,
          ...item
        }));
        
        setCategories(categoryNames);
        setPackages(firstCategoryPackages);
        setJsonStructure({ 
          hasCategories: true, 
          data: mainArray,
          mainKey: mainKey,
          itemsKey: itemsKey
        });
        setSelectedCategoryIndex(0);
      } else {
        // Flat structure (like tjenester.json or medisin.json)
        const itemsWithIds = mainArray.map((item, idx) => ({
          _internalId: `loaded_${Date.now()}_${idx}`,
          ...item
        }));
        
        
        setCategories(['Alle']);
        setPackages(itemsWithIds);
        setJsonStructure({ 
          hasCategories: false, 
          data: mainArray,
          mainKey: mainKey
        });
        setSelectedCategoryIndex(0);
      }

      setLoading(false);
    } catch (err) {
      setError(`Kunne ikke laste JSON: ${err.message}`);
      setLoading(false);
    }
  };

  // Load from file
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let text = e.target.result;
        
        // Remove UTF-8 BOM if present
        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.slice(1);
        }
        
        const data = JSON.parse(text);
        
        // Handle different JSON structures
        let mainArray = null;
        let mainKey = null;
        
        // Check if root is already an array
        if (Array.isArray(data)) {
          mainArray = data;
          mainKey = 'items';
        } else {
          // Find the first array in the object
          for (const key of Object.keys(data)) {
            if (Array.isArray(data[key])) {
              mainArray = data[key];
              mainKey = key;
              break;
            }
          }
        }

        if (!mainArray) {
          throw new Error('Fant ingen array i JSON-filen. Sjekk strukturen.');
        }

        if (mainArray.length > 0 && mainArray[0].kategori && (mainArray[0].pakker || mainArray[0].tjenester)) {
          const categoryNames = mainArray.map(cat => cat.kategori);
          const itemsKey = mainArray[0].pakker ? 'pakker' : 'tjenester';
          const firstCategoryPackages = (mainArray[0][itemsKey] || []).map((item, idx) => ({
            _internalId: `file_${Date.now()}_${idx}`,
            ...item
          }));
          
          setCategories(categoryNames);
          setPackages(firstCategoryPackages);
          setJsonStructure({ 
            hasCategories: true, 
            data: mainArray,
            mainKey: mainKey,
            itemsKey: itemsKey
          });
        } else {
          const itemsWithIds = mainArray.map((item, idx) => ({
            _internalId: `file_${Date.now()}_${idx}`,
            ...item
          }));
          
          setCategories(['Alle']);
          setPackages(itemsWithIds);
          setJsonStructure({ 
            hasCategories: false, 
            data: mainArray,
            mainKey: mainKey
          });
        }

        setSelectedCategoryIndex(0);
        setLoading(false);
      } catch (err) {
        setError(`Kunne ikke lese fil: ${err.message}`);
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleAddPackage = () => {
    const firstPackage = packages[0];
    const newPackage = {};
    
    // Generate unique ID
    const uniqueId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    newPackage._internalId = uniqueId;
    
    // Copy structure from first package with empty values
    Object.keys(firstPackage).forEach(key => {
      const type = getFieldType(firstPackage[key]);
      if (type === 'boolean') newPackage[key] = false;
      else if (type === 'array') newPackage[key] = [];
      else if (type === 'number') newPackage[key] = 0;
      else newPackage[key] = '';
    });
    
    setPackages([...packages, newPackage]);
  };

  const handleDeletePackage = (internalId) => {
    if (window.confirm('Er du sikker på at du vil slette denne pakken?')) {
      setPackages(packages.filter(pkg => (pkg._internalId || pkg.id) !== internalId));
    }
  };

  const handleInputChange = (internalId, field, value) => {
    setPackages(packages.map(pkg => 
      (pkg._internalId || pkg.id) === internalId ? { ...pkg, [field]: value } : pkg
    ));
  };

  // Open appropriate modal based on field type
  const handleEditClick = (internalId, fieldName, value) => {
    const fieldType = getFieldType(value);
    
    setEditingField({ packageId: internalId, fieldName, value });

    if (fieldName === 'color' || fieldName === 'farge') {
      setColorModalOpen(true);
    } else if (fieldName === 'ikon' || fieldName === 'icon') {
      setIconModalOpen(true);
    } else if (fieldType === 'array') {
      setListModalOpen(true);
    } else if (fieldType === 'longtext') {
      setTextModalOpen(true);
    }
  };

  // Save from modals
  const handleSaveText = (newValue) => {
    handleInputChange(editingField.packageId, editingField.fieldName, newValue);
    setEditingField({ packageId: null, fieldName: null, value: null });
  };

  const handleSaveList = (newList) => {
    handleInputChange(editingField.packageId, editingField.fieldName, newList);
    setEditingField({ packageId: null, fieldName: null, value: null });
  };

  const handleSaveIcon = (iconName) => {
    handleInputChange(editingField.packageId, editingField.fieldName, iconName);
    setEditingField({ packageId: null, fieldName: null, value: null });
  };

  const handleSaveColor = (colorValue) => {
    handleInputChange(editingField.packageId, editingField.fieldName, colorValue);
    setEditingField({ packageId: null, fieldName: null, value: null });
  };

  // Export functions
  const handleDownloadJSON = () => {
    if (!jsonStructure) {
      alert('Ingen data å eksportere. Last inn en JSON-fil først.');
      return;
    }

    try {
      // Reconstruct the original JSON structure
      let exportData = {};

      if (jsonStructure.hasCategories) {
        // Nested structure - rebuild with updated data
        const itemsKey = jsonStructure.itemsKey || 'pakker';
        const updatedData = jsonStructure.data.map((category, idx) => {
          if (idx === selectedCategoryIndex) {
            // Update current category with edited packages
            const cleanedPackages = packages.map(pkg => {
              const { _internalId, ...cleanPkg } = pkg;
              return cleanPkg;
            });
            return {
              ...category,
              [itemsKey]: cleanedPackages
            };
          }
          return category;
        });
        exportData[jsonStructure.mainKey] = updatedData;
      } else {
        // Flat structure
        const cleanedPackages = packages.map(pkg => {
          const { _internalId, ...cleanPkg } = pkg;
          return cleanPkg;
        });
        exportData[jsonStructure.mainKey] = cleanedPackages;
      }

      // Create and download file
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${jsonStructure.mainKey}_edited.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('✅ JSON-fil lastet ned!');
    } catch (err) {
      alert('❌ Kunne ikke eksportere: ' + err.message);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!jsonStructure) {
      alert('Ingen data å kopiere. Last inn en JSON-fil først.');
      return;
    }

    try {
      // Reconstruct the original JSON structure
      let exportData = {};

      if (jsonStructure.hasCategories) {
        const itemsKey = jsonStructure.itemsKey || 'pakker';
        const updatedData = jsonStructure.data.map((category, idx) => {
          if (idx === selectedCategoryIndex) {
            const cleanedPackages = packages.map(pkg => {
              const { _internalId, ...cleanPkg } = pkg;
              return cleanPkg;
            });
            return {
              ...category,
              [itemsKey]: cleanedPackages
            };
          }
          return category;
        });
        exportData[jsonStructure.mainKey] = updatedData;
      } else {
        const cleanedPackages = packages.map(pkg => {
          const { _internalId, ...cleanPkg } = pkg;
          return cleanPkg;
        });
        exportData[jsonStructure.mainKey] = cleanedPackages;
      }

      const jsonString = JSON.stringify(exportData, null, 2);
      await navigator.clipboard.writeText(jsonString);
      alert('✅ JSON kopiert til clipboard!');
    } catch (err) {
      alert('❌ Kunne ikke kopiere: ' + err.message);
    }
  };

  // Get all field names from first package (exclude internal fields starting with _)
  const fieldNames = packages.length > 0 
    ? Object.keys(packages[0]).filter(key => !key.startsWith('_'))
    : [];

  // Render field cell
  const renderFieldCell = (pkg, fieldName) => {
    const value = pkg[fieldName];
    const fieldType = getFieldType(value);
    const isIconField = fieldName === 'ikon' || fieldName === 'icon';
    const isColorField = fieldName === 'color' || fieldName === 'farge';
    const internalId = pkg._internalId || pkg.id;

    // Boolean checkbox
    if (fieldType === 'boolean') {
      return (
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => handleInputChange(internalId, fieldName, e.target.checked)}
          className="checkbox"
        />
      );
    }

    // Array - show edit button
    if (fieldType === 'array') {
      return (
        <button
          className="edit-btn"
          onClick={() => handleEditClick(internalId, fieldName, value)}
        >
          📝 {value.length} items
        </button>
      );
    }

    // Long text - show edit button
    if (fieldType === 'longtext') {
      return (
        <button
          className="edit-btn"
          onClick={() => handleEditClick(internalId, fieldName, value)}
        >
          ✏️ Rediger
        </button>
      );
    }

    // Color field - show color preview
    if (isColorField) {
      return (
        <button
          className="edit-btn color-preview-btn"
          onClick={() => handleEditClick(internalId, fieldName, value)}
        >
          <div 
            className="color-preview-box"
            style={{ background: value || '#CCCCCC' }}
          />
          {value || 'Velg'}
        </button>
      );
    }

    // Icon field - show edit button
    if (isIconField) {
      return (
        <button
          className="edit-btn"
          onClick={() => handleEditClick(internalId, fieldName, value)}
        >
          🎨 {value || 'Velg'}
        </button>
      );
    }

    // Short text or number - inline input
    return (
      <input
        type={fieldType === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(e) => handleInputChange(internalId, fieldName, e.target.value)}
        className="table-input"
      />
    );
  };

  return (
    <div className="app-container">
      <div className="editor-card">
        <h1 className="title">🔧 Universal JSON Editor</h1>

        {/* Last inn metode */}
        <div className="load-section">
          <div className="load-buttons">
            <button
              onClick={() => setLoadMethod('url')}
              className={`tab-button ${loadMethod === 'url' ? 'active' : ''}`}
            >
              🔗 Fra URL
            </button>
            <button
              onClick={() => setLoadMethod('file')}
              className={`tab-button ${loadMethod === 'file' ? 'active' : ''}`}
            >
              📁 Lokal fil
            </button>
          </div>

          {loadMethod === 'url' ? (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>
                  Velg JSON-fil:
                </label>
                <select 
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(parseInt(e.target.value))}
                  className="category-select"
                  style={{ border: '2px solid #2563eb' }}
                >
                  {PRESET_URLS.map((preset, index) => (
                    <option key={index} value={index}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedPreset === PRESET_URLS.length - 1 ? (
                <div className="url-input-row">
                  <input
                    type="text"
                    placeholder="https://example.com/data/din-fil.json"
                    className="url-input"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                  />
                  <button 
                    className="btn-primary" 
                    onClick={handleLoadJSON}
                    disabled={loading}
                  >
                    {loading ? '⏳ Laster...' : '📥 Last inn'}
                  </button>
                </div>
              ) : (
                <div className="url-input-row">
                  <input
                    type="text"
                    className="url-input"
                    value={PRESET_URLS[selectedPreset].url}
                    readOnly
                    style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                  />
                  <button 
                    className="btn-primary"
                    onClick={handleLoadJSON}
                    disabled={loading}
                  >
                    {loading ? '⏳ Laster...' : '📥 Last inn'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="file-upload-area">
              <input
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                id="file-upload"
                onChange={handleFileUpload}
              />
              <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>
                  {loading ? '⏳' : '📁'}
                </div>
                <div style={{ fontWeight: 500 }}>
                  {loading ? 'Laster...' : 'Klikk for å velge fil'}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                  eller dra og slipp her
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Info/Error banner */}
        {error ? (
          <div className="error-banner">
            ❌ <strong>Feil:</strong> {error}
          </div>
        ) : (
          <div className="info-banner">
            ✅ <strong>{jsonStructure ? 'Data lastet' : 'Mock data'}:</strong> {categories.length} {jsonStructure?.hasCategories ? 'kategorier' : 'gruppe'} | {packages.length} items
          </div>
        )}

        {/* Kategori-navigering */}
        <div className="navigation">
          <button
            onClick={handlePrevious}
            disabled={selectedCategoryIndex === 0}
            className="nav-button"
          >
            ← Forrige
          </button>

          <select
            value={selectedCategoryIndex}
            onChange={handleCategoryChange}
            className="category-select"
          >
            {categories.map((cat, index) => (
              <option key={index} value={index}>
                {cat} ({index + 1}/{categories.length})
              </option>
            ))}
          </select>

          <button
            onClick={handleNext}
            disabled={selectedCategoryIndex === categories.length - 1}
            className="nav-button"
          >
            Neste →
          </button>
        </div>

        {/* Pakker-tabell */}
        <div className="table-section">
          <h2 className="section-title">
            {jsonStructure?.hasCategories ? 'Pakker' : 'Items'} i "{categories[selectedCategoryIndex]}"
          </h2>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {fieldNames.map(fieldName => (
                    <th key={fieldName}>
                      {fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </th>
                  ))}
                  <th style={{ width: '100px' }}>Aksjon</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg, pkgIndex) => {
                  const internalId = pkg._internalId || pkg.id || pkgIndex;
                  return (
                    <tr key={internalId}>
                      {fieldNames.map(fieldName => (
                        <td key={fieldName}>
                          {renderFieldCell(pkg, fieldName)}
                        </td>
                      ))}
                      <td>
                        <button
                          onClick={() => handleDeletePackage(internalId)}
                          className="btn-delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legg til pakke knapp */}
        <button onClick={handleAddPackage} className="btn-add">
          ➕ Legg til pakke
        </button>

        {/* Eksporter-knapper */}
        <div className="export-section">
          <button className="btn-blue" onClick={handleDownloadJSON}>
            💾 Last ned JSON
          </button>
          <button className="btn-orange" onClick={handleCopyToClipboard}>
            📋 Kopier til clipboard
          </button>
        </div>
      </div>

      {/* Modals */}
      <TextEditModal
        isOpen={textModalOpen}
        onClose={() => setTextModalOpen(false)}
        title={`Rediger ${editingField.fieldName}`}
        value={editingField.value}
        onSave={handleSaveText}
      />

      <ListEditModal
        isOpen={listModalOpen}
        onClose={() => setListModalOpen(false)}
        title={`Rediger liste: ${editingField.fieldName}`}
        items={editingField.value}
        onSave={handleSaveList}
      />

      <IconPickerModal
        isOpen={iconModalOpen}
        onClose={() => setIconModalOpen(false)}
        currentIcon={editingField.value}
        onSave={handleSaveIcon}
      />

      <ColorPickerModal
        isOpen={colorModalOpen}
        onClose={() => setColorModalOpen(false)}
        currentColor={editingField.value}
        onSave={handleSaveColor}
      />
    </div>
  );
}

export default App;
