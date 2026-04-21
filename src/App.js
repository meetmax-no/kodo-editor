import React, { useState, useEffect } from 'react';
import './App.css';
import TextEditModal from './components/TextEditModal';
import ListEditModal from './components/ListEditModal';
import IconPickerModal from './components/IconPickerModal';
import ColorPickerModal from './components/ColorPickerModal';
import NewJsonModal from './components/NewJsonModal';
import StatusModal from './components/StatusModal';
import ExtraFieldsPanel from './components/ExtraFieldsPanel';

// Mock data kun for demo ved oppstart
const MOCK_CATEGORIES = ["Demo"];
const MOCK_PACKAGES = [
  {
    _internalId: 'demo_1',
    info: "Last inn en JSON-fil fra URL eller lokal disk for å starte redigering"
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
  const [presetUrls, setPresetUrls] = useState([{ name: "Custom URL...", url: "" }]);

  // Modal states
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [iconModalOpen, setIconModalOpen] = useState(false);
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [newJsonModalOpen, setNewJsonModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [editingField, setEditingField] = useState({ source: 'package', packageId: null, fieldName: null, value: null, wrapperKey: null });

  // Load preset URLs from url.json on mount
  useEffect(() => {
    // Cache-bust via query-param så vi alltid henter nyeste versjon
    fetch(`/url.json?t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setPresetUrls(data))
      .catch(err => {
        console.error('Could not load url.json:', err);
        // Fallback to hardcoded
        setPresetUrls([
          { name: "Custom URL...", url: "" }
        ]);
      });
  }, []);

  // Persist current packages back into jsonStructure.data for the current category.
  // Returns an updated jsonStructure clone that callers can use immediately.
  const persistCurrentPackages = () => {
    if (!jsonStructure) return null;
    const cleanedPackages = packages.map((pkg) => {
      const { _internalId, ...rest } = pkg;
      return rest;
    });

    // When the original JSON root IS an array (not an object wrapping an array),
    // we must emit an array — never spread it into an object (that would produce
    // numeric-keyed fields AND duplicate the data under mainKey).
    const rootIsArray = Array.isArray(jsonStructure.originalData);

    if (jsonStructure.hasCategories) {
      const itemsKey = jsonStructure.itemsKey || 'pakker';
      const updatedData = jsonStructure.data.map((cat, idx) =>
        idx === selectedCategoryIndex ? { ...cat, [itemsKey]: cleanedPackages } : cat
      );
      const updatedOriginal = rootIsArray
        ? updatedData
        : { ...jsonStructure.originalData, [jsonStructure.mainKey]: updatedData };
      const next = { ...jsonStructure, data: updatedData, originalData: updatedOriginal };
      setJsonStructure(next);
      return next;
    } else {
      const updatedOriginal = rootIsArray
        ? cleanedPackages
        : { ...jsonStructure.originalData, [jsonStructure.mainKey]: cleanedPackages };
      const next = { ...jsonStructure, data: cleanedPackages, originalData: updatedOriginal };
      setJsonStructure(next);
      return next;
    }
  };

  const loadPackagesForCategory = (structure, newIndex) => {
    const itemsKey = structure.itemsKey || 'pakker';
    const categoryData = structure.data[newIndex];
    const items = categoryData[itemsKey] || [];
    const itemsWithIds = items.map((item, idx) => ({
      _internalId: `cat_${newIndex}_${idx}_${Date.now()}`,
      ...item,
    }));
    setPackages(itemsWithIds);
  };


  const handleNext = () => {
    if (selectedCategoryIndex < categories.length - 1) {
      const newIndex = selectedCategoryIndex + 1;
      const persisted = persistCurrentPackages();
      setSelectedCategoryIndex(newIndex);
      if (persisted && persisted.hasCategories) {
        loadPackagesForCategory(persisted, newIndex);
      }
    }
  };

  const handlePrevious = () => {
    if (selectedCategoryIndex > 0) {
      const newIndex = selectedCategoryIndex - 1;
      const persisted = persistCurrentPackages();
      setSelectedCategoryIndex(newIndex);
      if (persisted && persisted.hasCategories) {
        loadPackagesForCategory(persisted, newIndex);
      }
    }
  };

  const handleCategoryChange = (e) => {
    const newIndex = parseInt(e.target.value);
    const persisted = persistCurrentPackages();
    setSelectedCategoryIndex(newIndex);
    if (persisted && persisted.hasCategories) {
      loadPackagesForCategory(persisted, newIndex);
    }
  };

  // Load JSON from URL
  const handleLoadJSON = async () => {
    const url = selectedPreset === presetUrls.length - 1 
      ? customUrl 
      : presetUrls[selectedPreset].url;

    if (!url) {
      setError('Vennligst skriv inn en URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Cache-bust for URL-er også (spesielt raw.githubusercontent.com har CDN-cache)
      const cacheBustedUrl = url.includes('?') ? `${url}&_=${Date.now()}` : `${url}?_=${Date.now()}`;
      const response = await fetch(cacheBustedUrl, { cache: 'no-store' });
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
          originalData: data,  // Store WHOLE JSON including studenttilbud etc.
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
          originalData: data,  // Store WHOLE JSON
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
            originalData: data,  // Store WHOLE JSON
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
            originalData: data,  // Store WHOLE JSON
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
    const template = packages[0];
    const newPackage = {};

    // Generate unique ID
    const uniqueId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    newPackage._internalId = uniqueId;

    if (template) {
      // Copy structure from first package with empty values
      Object.keys(template).forEach((key) => {
        if (key.startsWith('_')) return;
        const type = getFieldType(template[key]);
        if (type === 'boolean') newPackage[key] = false;
        else if (type === 'array') newPackage[key] = [];
        else if (type === 'number') newPackage[key] = 0;
        else newPackage[key] = '';
      });
    } else {
      // No existing rows — try to derive schema from other categories
      let schemaSource = null;
      if (jsonStructure?.hasCategories) {
        const itemsKey = jsonStructure.itemsKey || 'pakker';
        const anyCat = jsonStructure.data.find((cat) => (cat[itemsKey] || []).length > 0);
        if (anyCat) schemaSource = anyCat[itemsKey][0];
      }
      if (schemaSource) {
        Object.keys(schemaSource).forEach((key) => {
          if (key.startsWith('_')) return;
          const type = getFieldType(schemaSource[key]);
          if (type === 'boolean') newPackage[key] = false;
          else if (type === 'array') newPackage[key] = [];
          else if (type === 'number') newPackage[key] = 0;
          else newPackage[key] = '';
        });
      } else {
        // Completely blank — give a single navn field
        newPackage.navn = '';
      }
    }

    setPackages([...packages, newPackage]);
  };

  // Create a new JSON from scratch via NewJsonModal
  const handleCreateNewJson = ({ structure, data, mainKey, itemsKey, categoryLabelKey }) => {
    if (structure === 'flat') {
      const mainArray = data[mainKey];
      const itemsWithIds = mainArray.map((item, idx) => ({
        _internalId: `new_${Date.now()}_${idx}`,
        ...item,
      }));
      setCategories(['Alle']);
      setPackages(itemsWithIds);
      setJsonStructure({
        hasCategories: false,
        data: mainArray,
        originalData: data,
        mainKey,
      });
      setSelectedCategoryIndex(0);
    } else {
      const mainArray = data[mainKey];
      const catKey = categoryLabelKey || 'kategori';
      const categoryNames = mainArray.map((cat) => cat[catKey]);
      const firstItems = (mainArray[0][itemsKey] || []).map((item, idx) => ({
        _internalId: `new_${Date.now()}_${idx}`,
        ...item,
      }));
      setCategories(categoryNames);
      setPackages(firstItems);
      setJsonStructure({
        hasCategories: true,
        data: mainArray,
        originalData: data,
        mainKey,
        itemsKey,
      });
      setSelectedCategoryIndex(0);
    }
    setError(null);
    setNewJsonModalOpen(false);
  };

  const handleDeletePackage = (internalId) => {
    if (window.confirm('Er du sikker på at du vil slette denne pakken?')) {
      setPackages(packages.filter(pkg => (pkg._internalId || pkg.id) !== internalId));
    }
  };

  const handleMoveRow = (internalId, direction) => {
    const idx = packages.findIndex((pkg) => (pkg._internalId || pkg.id) === internalId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= packages.length) return;
    const copy = [...packages];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    setPackages(copy);
  };

  const handleInputChange = (internalId, field, value) => {
    setPackages(packages.map(pkg => 
      (pkg._internalId || pkg.id) === internalId ? { ...pkg, [field]: value } : pkg
    ));
  };

  // Open appropriate modal based on field type
  const handleEditClick = (internalId, fieldName, value) => {
    const fieldType = getFieldType(value);

    setEditingField({ source: 'package', packageId: internalId, fieldName, value, wrapperKey: null });

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

  // Inline change on an extra field (not via modal)
  const handleExtraFieldChange = (wrapperKey, fieldName, newValue) => {
    if (!jsonStructure) return;
    const updatedOriginal = {
      ...jsonStructure.originalData,
      [wrapperKey]: {
        ...jsonStructure.originalData[wrapperKey],
        [fieldName]: newValue,
      },
    };
    setJsonStructure({ ...jsonStructure, originalData: updatedOriginal });
  };

  // Open modal for an extra field (longtext / array / color / icon)
  const handleEditExtraField = (wrapperKey, fieldName, value) => {
    setEditingField({ source: 'extra', packageId: null, fieldName, value, wrapperKey });

    if (fieldName === 'color' || fieldName === 'farge') {
      setColorModalOpen(true);
    } else if (fieldName === 'ikon' || fieldName === 'icon') {
      setIconModalOpen(true);
    } else if (Array.isArray(value)) {
      setListModalOpen(true);
    } else {
      setTextModalOpen(true);
    }
  };

  const resetEditingField = () =>
    setEditingField({ source: 'package', packageId: null, fieldName: null, value: null, wrapperKey: null });

  // Dispatch save from modals to the right store (package row or extra field)
  const applySavedValue = (newValue) => {
    if (editingField.source === 'extra' && editingField.wrapperKey) {
      handleExtraFieldChange(editingField.wrapperKey, editingField.fieldName, newValue);
    } else {
      handleInputChange(editingField.packageId, editingField.fieldName, newValue);
    }
    resetEditingField();
  };

  const handleSaveText  = (newValue)   => applySavedValue(newValue);
  const handleSaveList  = (newList)    => applySavedValue(newList);
  const handleSaveIcon  = (iconName)   => applySavedValue(iconName);
  const handleSaveColor = (colorValue) => applySavedValue(colorValue);

  // Export functions
  const handleDownloadJSON = () => {
    if (!jsonStructure) {
      alert('Ingen data å eksportere. Last inn eller opprett en JSON-fil først.');
      return;
    }

    try {
      const persisted = persistCurrentPackages() || jsonStructure;
      const exportData = persisted.originalData;

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${persisted.mainKey}_edited.json`;
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
      alert('Ingen data å kopiere. Last inn eller opprett en JSON-fil først.');
      return;
    }

    try {
      const persisted = persistCurrentPackages() || jsonStructure;
      const exportData = persisted.originalData;

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
        <h1 className="title" data-testid="app-title">Universal JSON Editor</h1>
        <div className="subtitle">Rediger nestede JSON-filer trygt — uten å miste strukturen.</div>

        {/* Last inn metode */}
        <div className="load-section">
          <div className="load-buttons">
            <button
              onClick={() => setLoadMethod('url')}
              className={`tab-button ${loadMethod === 'url' ? 'active' : ''}`}
              data-testid="tab-url-btn"
            >
              🔗 Fra URL
            </button>
            <button
              onClick={() => setLoadMethod('file')}
              className={`tab-button ${loadMethod === 'file' ? 'active' : ''}`}
              data-testid="tab-file-btn"
            >
              📁 Lokal fil
            </button>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setNewJsonModalOpen(true)}
              className="tab-button new-json-btn"
              data-testid="open-new-json-btn"
            >
              ✨ Ny JSON
            </button>
          </div>

          {loadMethod === 'url' ? (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#475569', fontSize: '13px' }}>
                  Velg JSON-fil:
                </label>
                <select 
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(parseInt(e.target.value))}
                  className="category-select"
                  data-testid="preset-url-select"
                >
                  {presetUrls.map((preset, index) => (
                    <option key={index} value={index}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedPreset === presetUrls.length - 1 ? (
                <div className="url-input-row">
                  <input
                    type="text"
                    placeholder="https://example.com/data/din-fil.json"
                    className="url-input"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    data-testid="custom-url-input"
                  />
                  <button 
                    className="btn-primary" 
                    onClick={handleLoadJSON}
                    disabled={loading}
                    data-testid="load-json-btn"
                  >
                    {loading ? 'Laster…' : 'Last inn'}
                  </button>
                </div>
              ) : (
                <div className="url-input-row">
                  <input
                    type="text"
                    className="url-input"
                    value={presetUrls[selectedPreset]?.url || ''}
                    readOnly
                    style={{ background: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                  />
                  <button 
                    className="btn-primary"
                    onClick={handleLoadJSON}
                    disabled={loading}
                    data-testid="load-json-btn"
                  >
                    {loading ? 'Laster…' : 'Last inn'}
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
                data-testid="file-upload-input"
              />
              <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                  {loading ? '⏳' : '📁'}
                </div>
                <div style={{ fontWeight: 500, color: '#0f172a' }}>
                  {loading ? 'Laster…' : 'Klikk for å velge fil'}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  eller dra og slipp her
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Error banner (kun hvis feil) */}
        {error && (
          <div className="error-banner">
            ❌ <strong>Feil:</strong> {error}
          </div>
        )}

        {/* Kategori-navigering + status-pille på samme linje */}
        <div className="navigation">
          <button
            className={`status-pill ${jsonStructure ? 'loaded' : 'mock'}`}
            onClick={() => setStatusModalOpen(true)}
            data-testid="open-status-btn"
            title="Klikk for detaljer"
          >
            <span className="status-dot" />
            <span className="status-text">
              {jsonStructure ? 'Data lastet' : 'Mock'}
            </span>
            <span className="status-meta">
              {categories.length} · {packages.length}
            </span>
          </button>

          <button
            onClick={handlePrevious}
            disabled={selectedCategoryIndex === 0}
            className="nav-button"
            data-testid="prev-category-btn"
          >
            ← Forrige
          </button>

          <select
            value={selectedCategoryIndex}
            onChange={handleCategoryChange}
            className="category-select"
            data-testid="category-select"
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
            data-testid="next-category-btn"
          >
            Neste →
          </button>
        </div>

        {/* Ekstra felter — rot-objekter ved siden av hoved-arrayet */}
        {jsonStructure?.originalData && !Array.isArray(jsonStructure.originalData) && (() => {
          const extras = Object.entries(jsonStructure.originalData).filter(
            ([k, v]) => k !== jsonStructure.mainKey && v !== null && typeof v === 'object' && !Array.isArray(v)
          );
          if (extras.length === 0) return null;
          return (
            <ExtraFieldsPanel
              extraEntries={extras}
              getFieldType={getFieldType}
              onChange={handleExtraFieldChange}
              onEditField={handleEditExtraField}
            />
          );
        })()}

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
                  <th style={{ width: '140px' }}>Aksjon</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg, pkgIndex) => {
                  const internalId = pkg._internalId || pkg.id || pkgIndex;
                  const isFirst = pkgIndex === 0;
                  const isLast = pkgIndex === packages.length - 1;
                  return (
                    <tr key={internalId}>
                      {fieldNames.map(fieldName => (
                        <td key={fieldName}>
                          {renderFieldCell(pkg, fieldName)}
                        </td>
                      ))}
                      <td>
                        <div className="row-actions">
                          <button
                            onClick={() => handleMoveRow(internalId, 'up')}
                            className="btn-move"
                            disabled={isFirst}
                            title="Flytt opp"
                            data-testid={`move-up-btn-${pkgIndex}`}
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => handleMoveRow(internalId, 'down')}
                            className="btn-move"
                            disabled={isLast}
                            title="Flytt ned"
                            data-testid={`move-down-btn-${pkgIndex}`}
                          >
                            ▼
                          </button>
                          <button
                            onClick={() => handleDeletePackage(internalId)}
                            className="btn-delete"
                            title="Slett rad"
                            data-testid={`delete-btn-${pkgIndex}`}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legg til pakke knapp */}
        <button onClick={handleAddPackage} className="btn-add" data-testid="add-package-btn">
          ➕ Legg til pakke
        </button>

        {/* Eksporter-knapper */}
        <div className="export-section">
          <button className="btn-blue" onClick={handleDownloadJSON} data-testid="download-json-btn">
            💾 Last ned JSON
          </button>
          <button className="btn-orange" onClick={handleCopyToClipboard} data-testid="copy-json-btn">
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

      <NewJsonModal
        isOpen={newJsonModalOpen}
        onClose={() => setNewJsonModalOpen(false)}
        onCreate={handleCreateNewJson}
      />

      <StatusModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        jsonStructure={jsonStructure}
        categories={categories}
        packages={packages}
        selectedCategoryIndex={selectedCategoryIndex}
      />
    </div>
  );
}

export default App;
