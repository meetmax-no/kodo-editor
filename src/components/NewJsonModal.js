import React, { useState } from 'react';
import './NewJsonModal.css';

/**
 * NewJsonModal
 * Lar bruker opprette en helt ny JSON-struktur fra bunnen av.
 * Steg 1: velg type (flat liste eller nested med kategorier)
 * Steg 2: definer felt-skjelett + evt. kategorier, og opprett.
 */
export default function NewJsonModal({ isOpen, onClose, onCreate }) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState(null); // 'flat' | 'nested'

  // Felter for elementer (pakker/items)
  const [fields, setFields] = useState([
    { name: 'navn', type: 'text' },
    { name: 'beskrivelse', type: 'longtext' },
  ]);

  // Nøkler og kategorier (kun for nested)
  const [wrapperKey, setWrapperKey] = useState('kategorier');
  const [categoryLabelKey, setCategoryLabelKey] = useState('kategori');
  const [itemsKey, setItemsKey] = useState('pakker');
  const [categoryNames, setCategoryNames] = useState(['Kategori 1']);

  // Nøkkel for flat liste
  const [flatKey, setFlatKey] = useState('items');

  const reset = () => {
    setStep(1);
    setType(null);
    setFields([
      { name: 'navn', type: 'text' },
      { name: 'beskrivelse', type: 'longtext' },
    ]);
    setWrapperKey('kategorier');
    setCategoryLabelKey('kategori');
    setItemsKey('pakker');
    setCategoryNames(['Kategori 1']);
    setFlatKey('items');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const addField = () => setFields([...fields, { name: '', type: 'text' }]);
  const updateField = (idx, key, value) => {
    const copy = [...fields];
    copy[idx] = { ...copy[idx], [key]: value };
    setFields(copy);
  };
  const removeField = (idx) => setFields(fields.filter((_, i) => i !== idx));

  const addCategory = () => setCategoryNames([...categoryNames, `Kategori ${categoryNames.length + 1}`]);
  const updateCategory = (idx, value) => {
    const copy = [...categoryNames];
    copy[idx] = value;
    setCategoryNames(copy);
  };
  const removeCategory = (idx) => {
    if (categoryNames.length <= 1) return;
    setCategoryNames(categoryNames.filter((_, i) => i !== idx));
  };

  const buildEmptyItem = () => {
    const item = {};
    fields.forEach((f) => {
      if (!f.name) return;
      if (f.type === 'boolean') item[f.name] = false;
      else if (f.type === 'number') item[f.name] = 0;
      else if (f.type === 'array') item[f.name] = [];
      else item[f.name] = '';
    });
    return item;
  };

  const handleCreate = () => {
    const validFields = fields.filter((f) => f.name.trim() !== '');
    if (validFields.length === 0) {
      alert('Legg til minst ett felt før du oppretter.');
      return;
    }

    if (type === 'flat') {
      const payload = {
        [flatKey || 'items']: [buildEmptyItem()],
      };
      onCreate({ structure: 'flat', data: payload, mainKey: flatKey || 'items' });
    } else {
      const payload = {
        [wrapperKey || 'kategorier']: categoryNames.map((catName) => ({
          [categoryLabelKey || 'kategori']: catName,
          [itemsKey || 'pakker']: [buildEmptyItem()],
        })),
      };
      onCreate({
        structure: 'nested',
        data: payload,
        mainKey: wrapperKey || 'kategorier',
        itemsKey: itemsKey || 'pakker',
        categoryLabelKey: categoryLabelKey || 'kategori',
      });
    }
    reset();
  };

  if (!isOpen) return null;

  return (
    <div className="njm-overlay" data-testid="new-json-modal-overlay" onClick={handleClose}>
      <div className="njm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="njm-header">
          <div>
            <h2 className="njm-title">Opprett ny JSON</h2>
            <p className="njm-subtitle">
              {step === 1 ? 'Velg hvilken struktur du vil starte med' : 'Definer felter og innhold'}
            </p>
          </div>
          <button className="njm-close" onClick={handleClose} data-testid="new-json-close-btn">
            ✕
          </button>
        </div>

        {step === 1 && (
          <div className="njm-body">
            <div className="njm-choice-grid">
              <button
                data-testid="choose-flat-btn"
                className={`njm-choice ${type === 'flat' ? 'selected' : ''}`}
                onClick={() => setType('flat')}
              >
                <div className="njm-choice-icon">📄</div>
                <div className="njm-choice-title">Flat liste</div>
                <div className="njm-choice-desc">
                  En enkel liste med objekter, f.eks. tjenester eller FAQ-er.
                </div>
                <pre className="njm-choice-sample">{`{
  "items": [
    { "navn": "...", "beskrivelse": "..." }
  ]
}`}</pre>
              </button>

              <button
                data-testid="choose-nested-btn"
                className={`njm-choice ${type === 'nested' ? 'selected' : ''}`}
                onClick={() => setType('nested')}
              >
                <div className="njm-choice-icon">🗂️</div>
                <div className="njm-choice-title">Med kategorier</div>
                <div className="njm-choice-desc">
                  Elementer gruppert i kategorier, f.eks. prislister med pakker.
                </div>
                <pre className="njm-choice-sample">{`{
  "kategorier": [
    { "kategori": "A", "pakker": [ ... ] }
  ]
}`}</pre>
              </button>
            </div>
          </div>
        )}

        {step === 2 && type === 'flat' && (
          <div className="njm-body">
            <div className="njm-section">
              <label className="njm-label">Rot-nøkkel (navn på arrayet i JSON)</label>
              <input
                className="njm-input"
                value={flatKey}
                onChange={(e) => setFlatKey(e.target.value)}
                placeholder="f.eks. items, tjenester, medisiner"
                data-testid="flat-key-input"
              />
            </div>

            <FieldsEditor fields={fields} onAdd={addField} onUpdate={updateField} onRemove={removeField} />
          </div>
        )}

        {step === 2 && type === 'nested' && (
          <div className="njm-body">
            <div className="njm-row">
              <div className="njm-section">
                <label className="njm-label">Rot-nøkkel</label>
                <input
                  className="njm-input"
                  value={wrapperKey}
                  onChange={(e) => setWrapperKey(e.target.value)}
                  data-testid="wrapper-key-input"
                />
              </div>
              <div className="njm-section">
                <label className="njm-label">Kategorinavn-felt</label>
                <input
                  className="njm-input"
                  value={categoryLabelKey}
                  onChange={(e) => setCategoryLabelKey(e.target.value)}
                  data-testid="category-label-key-input"
                />
              </div>
              <div className="njm-section">
                <label className="njm-label">Items-nøkkel</label>
                <input
                  className="njm-input"
                  value={itemsKey}
                  onChange={(e) => setItemsKey(e.target.value)}
                  data-testid="items-key-input"
                />
              </div>
            </div>

            <div className="njm-section">
              <label className="njm-label">Kategorier</label>
              <div className="njm-list">
                {categoryNames.map((cat, idx) => (
                  <div key={idx} className="njm-list-row">
                    <input
                      className="njm-input"
                      value={cat}
                      onChange={(e) => updateCategory(idx, e.target.value)}
                      data-testid={`category-name-input-${idx}`}
                    />
                    <button
                      className="njm-btn-ghost danger"
                      onClick={() => removeCategory(idx)}
                      disabled={categoryNames.length <= 1}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button className="njm-btn-ghost" onClick={addCategory} data-testid="add-category-btn">
                  + Legg til kategori
                </button>
              </div>
            </div>

            <FieldsEditor fields={fields} onAdd={addField} onUpdate={updateField} onRemove={removeField} />
          </div>
        )}

        <div className="njm-footer">
          {step === 2 && (
            <button className="njm-btn-ghost" onClick={() => setStep(1)} data-testid="back-btn">
              ← Tilbake
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step === 1 && (
            <button
              className="njm-btn-primary"
              onClick={() => type && setStep(2)}
              disabled={!type}
              data-testid="next-btn"
            >
              Neste →
            </button>
          )}
          {step === 2 && (
            <button className="njm-btn-primary" onClick={handleCreate} data-testid="create-json-btn">
              ✓ Opprett JSON
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldsEditor({ fields, onAdd, onUpdate, onRemove }) {
  return (
    <div className="njm-section">
      <label className="njm-label">Felter i hvert element</label>
      <div className="njm-list">
        {fields.map((f, idx) => (
          <div key={idx} className="njm-list-row">
            <input
              className="njm-input"
              placeholder="felt-navn (f.eks. navn)"
              value={f.name}
              onChange={(e) => onUpdate(idx, 'name', e.target.value)}
              data-testid={`field-name-input-${idx}`}
            />
            <select
              className="njm-input"
              value={f.type}
              onChange={(e) => onUpdate(idx, 'type', e.target.value)}
              style={{ maxWidth: '180px' }}
              data-testid={`field-type-select-${idx}`}
            >
              <option value="text">Kort tekst</option>
              <option value="longtext">Lang tekst</option>
              <option value="number">Tall</option>
              <option value="boolean">Ja / Nei</option>
              <option value="array">Liste (array)</option>
            </select>
            <button
              className="njm-btn-ghost danger"
              onClick={() => onRemove(idx)}
              disabled={fields.length <= 1}
            >
              ✕
            </button>
          </div>
        ))}
        <button className="njm-btn-ghost" onClick={onAdd} data-testid="add-field-btn">
          + Legg til felt
        </button>
      </div>
    </div>
  );
}
