import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import './App.css';
import TextEditModal from './components/TextEditModal';
import ListEditModal from './components/ListEditModal';
import IconPickerModal from './components/IconPickerModal';
import ColorPickerModal from './components/ColorPickerModal';
import NewJsonModal from './components/NewJsonModal';
import StatusModal from './components/StatusModal';
import ExtraFieldsPanel from './components/ExtraFieldsPanel';
import JsonPreviewPanel from './components/JsonPreviewPanel';
import SectionPicker from './components/SectionPicker';
import Sidebar from './components/Sidebar';
import RootPrimitivesPanel from './components/RootPrimitivesPanel';
import AddFieldModal from './components/AddFieldModal';
import SettingsModal from './components/SettingsModal';
import CommandPalette from './components/CommandPalette';
import StatusBar from './components/StatusBar';
import CustomUrlModal from './components/CustomUrlModal';
import PresetDropdown from './components/PresetDropdown';
import GithubPushModal from './components/GithubPushModal';
import useBackground from './hooks/useBackground';
import useTheme from './hooks/useTheme';
import { parseGithubRawUrl } from './hooks/useGithubSource';
import { useConfirm } from './components/ConfirmModal';
import CategoryMenu from './components/CategoryMenu';
import { APP_VERSION } from './themes';
import {
  SECTION_TYPE,
  ROW_KEY_FIELD,
  ROW_VALUE_FIELD,
  detectSections,
  dictObjectsToRows,
  rowsToDictObjects,
  dictPrimitivesToRows,
  rowsToDictPrimitives,
} from './utils/sectionDetector';

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

function App({ auth }) {
  const confirm = useConfirm();
  // V5.0: bakgrunns-hook (laster /clients/default.json + persist localStorage)
  // loadedJsonData refereres senere — vi sender inn jsonStructure?.originalData når det er klart
  const [loadedRootData, setLoadedRootData] = useState(null);
  const bg = useBackground(loadedRootData);
  const themeCtx = useTheme();

  // V5.0: appliser bakgrunn på <html> via CSS-variabler.
  //       (Tone styres nå av useTheme — bakgrunnens tone ignoreres.)
  useEffect(() => {
    if (!bg.activeBackground) return;
    document.body.style.setProperty('--app-bg', bg.activeCss);
    document.body.style.setProperty('--app-overlay', String(bg.overlay));
  }, [bg.activeCss, bg.overlay, bg.activeBackground]);

  // Sett nettleser-tab-tittel dynamisk fra clients/<x>.json _meta.client
  useEffect(() => {
    const client = bg.config?._meta?.client;
    if (client) document.title = `${client} — Innholdsredigering`;
  }, [bg.config]);

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
  const [isDirty, setIsDirty] = useState(false);
  const [dirtyFields, setDirtyFields] = useState(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  // V3.0 — multi-section state
  const [sections, setSections] = useState(null); // null = single-section mode
  const [activeSectionKey, setActiveSectionKey] = useState(null);
  const [activeSectionType, setActiveSectionType] = useState(null);
  const [rootPrimitives, setRootPrimitives] = useState(null); // { key: value } when root-primitives seksjon er valgt
  const [dirtySections, setDirtySections] = useState(new Set());
  const [addFieldModalOpen, setAddFieldModalOpen] = useState(false);
  // Undo: stack av snapshots. Hver snapshot er {packages, rootPrimitives, jsonStructure, dirtyFields}
  const [undoStack, setUndoStack] = useState([]);
  const [editingField, setEditingField] = useState({ source: 'package', packageId: null, fieldName: null, value: null, wrapperKey: null });

  // V4.1: search/filter for hovedtabellen
  const [searchQuery, setSearchQuery] = useState('');
  // V4.1: redo-stack (komplement til undo)
  const [redoStack, setRedoStack] = useState([]);
  // V4.1: drag-over state for fil-opplasting
  const [isDragOver, setIsDragOver] = useState(false);

  // V5.0: settings modal & command palette
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // V5.1: custom URL modal
  const [customUrlOpen, setCustomUrlOpen] = useState(false);
  // V5.2: GitHub push modal + tracking av lastet kilde-URL
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [loadedUrl, setLoadedUrl] = useState(null);
  // V5.0: sidebar collapsed state for ≥7 seksjoner
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('kodo-editor-sidebar-collapsed-v1') === '1'; } catch { return false; }
  });

  // Load preset URLs from url.json on mount
  useEffect(() => {
    // Filnavn (uten .json) styres av REACT_APP_NAME_URL (Vercel ENV).
    const urlListName = process.env.REACT_APP_NAME_URL;
    if (!urlListName) {
      console.error('REACT_APP_NAME_URL er ikke satt');
      return;
    }
    fetch(`/${urlListName}.json?t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setPresetUrls(data))
      .catch(err => console.error(`Could not load ${urlListName}.json:`, err));
  }, []);

  // Advar brukeren hvis han prøver å lukke vinduet med ulagrede endringer
  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Persist current packages back into jsonStructure.data for the current category.
  // Returns an updated jsonStructure clone that callers can use immediately.
  const persistCurrentPackages = () => {
    if (!jsonStructure) return null;

    // Multi-section mode: dispatch by section type
    if (sections && activeSectionKey) {
      return persistCurrentSection();
    }

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

  // Multi-section: persist current active section back into originalData.
  // Håndterer array-of-objects / dict-of-objects / dict-of-primitives / primitive.
  const persistCurrentSection = () => {
    if (!jsonStructure || !activeSectionKey) return jsonStructure;
    const original = jsonStructure.originalData || {};
    let updatedOriginal = { ...original };

    if (activeSectionType === SECTION_TYPE.PRIMITIVE) {
      // Merge rootPrimitives tilbake direkte på roten
      if (rootPrimitives) {
        updatedOriginal = { ...updatedOriginal, ...rootPrimitives };
      }
    } else {
      const cleanedPackages = packages.map((pkg) => {
        const { _internalId, ...rest } = pkg;
        return rest;
      });

      if (activeSectionType === SECTION_TYPE.ARRAY_OF_OBJECTS) {
        updatedOriginal[activeSectionKey] = cleanedPackages;
      } else if (activeSectionType === SECTION_TYPE.DICT_OF_OBJECTS) {
        updatedOriginal[activeSectionKey] = rowsToDictObjects(cleanedPackages);
      } else if (activeSectionType === SECTION_TYPE.DICT_OF_PRIMITIVES) {
        updatedOriginal[activeSectionKey] = rowsToDictPrimitives(cleanedPackages);
      }
    }

    const next = { ...jsonStructure, originalData: updatedOriginal };
    setJsonStructure(next);
    return next;
  };

  // Switch to a different section: persist current, then load new
  const switchToSection = (sectionKey) => {
    if (sectionKey === activeSectionKey) return;
    const persisted = persistCurrentSection();
    loadSectionFromOriginal(persisted, sectionKey);
  };

  // Load a section's data from originalData into the editor state
  const loadSectionFromOriginal = (structure, sectionKey) => {
    if (!structure || !sections) return;
    const section = sections.find((s) => s.key === sectionKey);
    if (!section) return;

    setActiveSectionKey(sectionKey);
    setActiveSectionType(section.type);
    setDirtyFields(new Set()); // local field-dirty tracker resets per seksjon

    const original = structure.originalData || {};

    if (section.type === SECTION_TYPE.PRIMITIVE) {
      const primData = {};
      for (const f of section.fields || []) primData[f] = original[f];
      setRootPrimitives(primData);
      setPackages([]);
      setCategories(['Rot']);
      setSelectedCategoryIndex(0);
      return;
    }

    setRootPrimitives(null);
    const raw = original[sectionKey];
    let rows = [];

    if (section.type === SECTION_TYPE.ARRAY_OF_OBJECTS) {
      rows = (raw || []).map((item, idx) => ({
        _internalId: `sec_${sectionKey}_${idx}_${Date.now()}`,
        ...item,
      }));
    } else if (section.type === SECTION_TYPE.DICT_OF_OBJECTS) {
      rows = dictObjectsToRows(raw || {}).map((item, idx) => ({
        _internalId: `sec_${sectionKey}_${idx}_${Date.now()}`,
        ...item,
      }));
    } else if (section.type === SECTION_TYPE.DICT_OF_PRIMITIVES) {
      rows = dictPrimitivesToRows(raw || {}).map((item, idx) => ({
        _internalId: `sec_${sectionKey}_${idx}_${Date.now()}`,
        ...item,
      }));
    }

    setPackages(rows);
    setCategories([sectionKey]);
    setSelectedCategoryIndex(0);
  };

  // Beregn live JSON (uten å mutere state) — brukes av preview-panelet.
  const computeLiveJson = () => {
    if (!jsonStructure) return null;

    // Multi-section: merge active section inn i originalData
    if (sections && activeSectionKey) {
      const original = jsonStructure.originalData || {};
      const merged = { ...original };

      if (activeSectionType === SECTION_TYPE.PRIMITIVE) {
        if (rootPrimitives) Object.assign(merged, rootPrimitives);
        return merged;
      }

      const cleanedPackages = packages.map((pkg) => {
        const { _internalId, ...rest } = pkg;
        return rest;
      });

      if (activeSectionType === SECTION_TYPE.ARRAY_OF_OBJECTS) {
        merged[activeSectionKey] = cleanedPackages;
      } else if (activeSectionType === SECTION_TYPE.DICT_OF_OBJECTS) {
        merged[activeSectionKey] = rowsToDictObjects(cleanedPackages);
      } else if (activeSectionType === SECTION_TYPE.DICT_OF_PRIMITIVES) {
        merged[activeSectionKey] = rowsToDictPrimitives(cleanedPackages);
      }
      return merged;
    }

    const cleanedPackages = packages.map((pkg) => {
      const { _internalId, ...rest } = pkg;
      return rest;
    });
    const rootIsArray = Array.isArray(jsonStructure.originalData);

    if (jsonStructure.hasCategories) {
      const itemsKey = jsonStructure.itemsKey || 'pakker';
      const updatedData = jsonStructure.data.map((cat, idx) =>
        idx === selectedCategoryIndex ? { ...cat, [itemsKey]: cleanedPackages } : cat
      );
      return rootIsArray
        ? updatedData
        : { ...jsonStructure.originalData, [jsonStructure.mainKey]: updatedData };
    }
    return rootIsArray
      ? cleanedPackages
      : { ...jsonStructure.originalData, [jsonStructure.mainKey]: cleanedPackages };
  };

  // Sjekk om en gitt path i den serialiserte JSON-en tilsvarer en endret verdi.
  // Brukes av JsonPreviewPanel for å male gul bakgrunn på endrede tokens.
  const isPathEdited = (path) => {
    if (!jsonStructure || !path || path.length === 0) return false;

    // Rot-primitives og rot-arrays (V4.1)
    //   path = [fieldName]            for primitive
    //   path = [fieldName, index]     for array-of-primitives
    if (typeof path[0] === 'string' && dirtyFields.has(`root__${path[0]}`)) {
      return true;
    }

    if (path.length < 2) return false;

    // Multi-section mode (V3.0+)
    if (sections && activeSectionKey && path[0] === activeSectionKey) {
      if (activeSectionType === SECTION_TYPE.ARRAY_OF_OBJECTS) {
        // [sectionKey, idx, fieldName]
        if (path.length >= 3 && typeof path[1] === 'number') {
          const pkg = packages[path[1]];
          if (!pkg) return false;
          const internalId = pkg._internalId || pkg.id;
          return dirtyFields.has(`pkg__${internalId}__${path[2]}`);
        }
      } else if (activeSectionType === SECTION_TYPE.DICT_OF_OBJECTS) {
        // [sectionKey, dictKey, fieldName]
        if (path.length >= 3 && typeof path[1] === 'string') {
          const pkg = packages.find((p) => p[ROW_KEY_FIELD] === path[1]);
          if (!pkg) return false;
          const internalId = pkg._internalId || pkg.id;
          return dirtyFields.has(`pkg__${internalId}__${path[2]}`);
        }
      } else if (activeSectionType === SECTION_TYPE.DICT_OF_PRIMITIVES) {
        // [sectionKey, dictKey]
        if (path.length === 2 && typeof path[1] === 'string') {
          const pkg = packages.find((p) => p[ROW_KEY_FIELD] === path[1]);
          if (!pkg) return false;
          const internalId = pkg._internalId || pkg.id;
          return dirtyFields.has(`pkg__${internalId}__${ROW_VALUE_FIELD}`);
        }
      }
      return false;
    }

    // Single-section mode (priser-stil)
    // 1) Ekstra-felt: path = [wrapperKey, fieldName]
    if (path.length === 2 && typeof path[0] === 'string' && typeof path[1] === 'string') {
      if (dirtyFields.has(`extra__${path[0]}__${path[1]}`)) return true;
    }

    // 2) Package-felt i gjeldende kategori
    const rootIsArray = Array.isArray(jsonStructure.originalData);
    const itemsKey = jsonStructure.itemsKey || 'pakker';
    let pkgIdx = null;
    let fieldName = null;

    if (jsonStructure.hasCategories) {
      // [mainKey, categoryIndex, itemsKey, pkgIndex, fieldName]
      if (
        path.length === 5 &&
        path[0] === jsonStructure.mainKey &&
        path[1] === selectedCategoryIndex &&
        path[2] === itemsKey
      ) {
        pkgIdx = path[3];
        fieldName = path[4];
      }
    } else if (rootIsArray) {
      // [pkgIndex, fieldName]
      if (path.length === 2 && typeof path[0] === 'number' && typeof path[1] === 'string') {
        pkgIdx = path[0];
        fieldName = path[1];
      }
    } else {
      // [mainKey, pkgIndex, fieldName]
      if (path.length === 3 && path[0] === jsonStructure.mainKey) {
        pkgIdx = path[1];
        fieldName = path[2];
      }
    }

    if (pkgIdx === null || fieldName === null) return false;
    const pkg = packages[pkgIdx];
    if (!pkg) return false;
    const internalId = pkg._internalId || pkg.id;
    return dirtyFields.has(`pkg__${internalId}__${fieldName}`);
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

  // ─── Kategori-administrasjon (rename/add/delete/reorder) ───
  // Felles helper som muterer jsonStructure.data + categories + tilhørende
  // state i én operasjon. Markerer dirty via persistCurrentPackages før mutasjon.
  const mutateCategories = (mutator, { newSelectedIndex, reloadPackages = true } = {}) => {
    if (!jsonStructure?.hasCategories) return;
    const persisted = persistCurrentPackages() || jsonStructure;
    const next = mutator(persisted.data);
    if (!next) return;
    const catKey = persisted.categoryKey || 'kategori';
    const updatedNames = next.map((c) => c[catKey]);
    const rootIsArray = Array.isArray(persisted.originalData);
    const updatedOriginal = rootIsArray
      ? next
      : { ...persisted.originalData, [persisted.mainKey]: next };
    const updatedStructure = { ...persisted, data: next, originalData: updatedOriginal };
    setJsonStructure(updatedStructure);
    setCategories(updatedNames);
    setIsDirty(true);
    const idx = (newSelectedIndex !== undefined)
      ? Math.max(0, Math.min(newSelectedIndex, updatedNames.length - 1))
      : Math.max(0, Math.min(selectedCategoryIndex, updatedNames.length - 1));
    setSelectedCategoryIndex(idx);
    if (reloadPackages) loadPackagesForCategory(updatedStructure, idx);
  };

  const handleCategoryRename = (newName) => {
    const catKey = jsonStructure?.categoryKey || 'kategori';
    mutateCategories((data) =>
      data.map((c, i) => (i === selectedCategoryIndex ? { ...c, [catKey]: newName } : c))
    );
    toast.success(`Kategorinavn endret til "${newName}"`);
  };

  const handleCategoryAdd = (newName) => {
    const catKey = jsonStructure?.categoryKey || 'kategori';
    const itemsKey = jsonStructure?.itemsKey || 'pakker';
    mutateCategories(
      (data) => [...data, { [catKey]: newName, [itemsKey]: [] }],
      { newSelectedIndex: jsonStructure.data.length }
    );
    toast.success(`La til kategori "${newName}"`);
  };

  const handleCategoryMoveUp = () => {
    if (selectedCategoryIndex === 0) return;
    mutateCategories(
      (data) => {
        const next = [...data];
        const tmp = next[selectedCategoryIndex - 1];
        next[selectedCategoryIndex - 1] = next[selectedCategoryIndex];
        next[selectedCategoryIndex] = tmp;
        return next;
      },
      { newSelectedIndex: selectedCategoryIndex - 1 }
    );
  };

  const handleCategoryMoveDown = () => {
    if (selectedCategoryIndex >= categories.length - 1) return;
    mutateCategories(
      (data) => {
        const next = [...data];
        const tmp = next[selectedCategoryIndex + 1];
        next[selectedCategoryIndex + 1] = next[selectedCategoryIndex];
        next[selectedCategoryIndex] = tmp;
        return next;
      },
      { newSelectedIndex: selectedCategoryIndex + 1 }
    );
  };

  const handleCategoryDelete = async () => {
    if (categories.length <= 1) {
      toast.error('Kan ikke slette siste kategori');
      return;
    }
    const name = categories[selectedCategoryIndex];
    const ok = await confirm({
      title: `Slett "${name}"?`,
      message: `Kategorien og alle ${packages.length} ${jsonStructure?.itemsKey || 'item'}-rader fjernes. Endringen blir lagret når du klikker "Lagre" eller "Lagre til GitHub".`,
      confirmLabel: 'Slett kategori',
      cancelLabel: 'Avbryt',
      variant: 'danger',
    });
    if (!ok) return;
    mutateCategories(
      (data) => data.filter((_, i) => i !== selectedCategoryIndex),
      { newSelectedIndex: Math.max(0, selectedCategoryIndex - 1) }
    );
    toast.success(`Slettet "${name}"`);
  };


  // Load JSON from URL
  // Sjekk om brukeren vil forkaste ulagrede endringer.
  // Returnerer true hvis det er trygt å fortsette.
  const confirmDiscardIfDirty = async () => {
    if (!isDirty) return true;
    return await confirm({
      title: 'Du har ulagrede endringer',
      message: 'Vil du fortsette og forkaste endringene, eller avbryte for å lagre først?',
      confirmLabel: 'Forkast endringer',
      cancelLabel: 'Avbryt',
      variant: 'danger',
    });
  };

  // Shared: initialize editor from a parsed JSON value (both URL and File paths).
  // Returnerer ingenting; oppdaterer state. Kastes hvis JSON er ubrukelig.
  const initializeFromData = (data, sourceTag) => {
    // V5.0: oppdater loadedRootData så bg-hook kan trekke ut backgrounds[]
    setLoadedRootData(data);

    // V3.0: prøv først å detektere flere seksjoner
    const detected = detectSections(data);

    if (detected && detected.length > 0) {
      // Multi-section mode: lagre seksjoner, aktiver første
      // Beregn telling per seksjon for SectionPicker badge
      const annotated = detected.map((s) => {
        let count;
        if (s.type === SECTION_TYPE.PRIMITIVE) count = (s.fields || []).length;
        else {
          const raw = data[s.key];
          if (Array.isArray(raw)) count = raw.length;
          else if (raw && typeof raw === 'object') count = Object.keys(raw).length;
        }
        return { ...s, count };
      });

      setSections(annotated);
      setJsonStructure({ originalData: data, mainKey: annotated[0].key, hasCategories: false });
      setError(null);

      // Last første seksjon (midlertidig — annotated blir kilden via argument)
      loadSectionInto(data, annotated, annotated[0].key);
      return;
    }

    // Single-section mode (som før)
    setSections(null);
    setActiveSectionKey(null);
    setActiveSectionType(null);
    setRootPrimitives(null);

    let mainArray = null;
    let mainKey = null;
    if (Array.isArray(data)) {
      mainArray = data;
      mainKey = 'items';
    } else {
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) { mainArray = data[key]; mainKey = key; break; }
      }
    }
    if (!mainArray) throw new Error('Fant ingen array i JSON-filen. Sjekk strukturen.');

    if (
      mainArray.length > 0 &&
      mainArray[0].kategori &&
      (mainArray[0].pakker || mainArray[0].tjenester)
    ) {
      const categoryNames = mainArray.map((cat) => cat.kategori);
      const itemsKey = mainArray[0].pakker ? 'pakker' : 'tjenester';
      const firstCategoryPackages = (mainArray[0][itemsKey] || []).map((item, idx) => ({
        _internalId: `${sourceTag}_${Date.now()}_${idx}`,
        ...item,
      }));
      setCategories(categoryNames);
      setPackages(firstCategoryPackages);
      setJsonStructure({
        hasCategories: true,
        data: mainArray,
        originalData: data,
        mainKey,
        itemsKey,
        categoryKey: 'kategori',
      });
    } else {
      const itemsWithIds = mainArray.map((item, idx) => ({
        _internalId: `${sourceTag}_${Date.now()}_${idx}`,
        ...item,
      }));
      setCategories(['Alle']);
      setPackages(itemsWithIds);
      setJsonStructure({ hasCategories: false, data: mainArray, originalData: data, mainKey });
    }
    setSelectedCategoryIndex(0);
  };

  // Hjelper brukt under første lasting når "sections" state ikke er oppdatert ennå.
  const loadSectionInto = (data, sectionList, sectionKey) => {
    const section = sectionList.find((s) => s.key === sectionKey);
    if (!section) return;

    setActiveSectionKey(sectionKey);
    setActiveSectionType(section.type);
    setDirtyFields(new Set());

    if (section.type === SECTION_TYPE.PRIMITIVE) {
      const primData = {};
      for (const f of section.fields || []) primData[f] = data[f];
      setRootPrimitives(primData);
      setPackages([]);
      setCategories(['Rot']);
      setSelectedCategoryIndex(0);
      return;
    }

    setRootPrimitives(null);
    const raw = data[sectionKey];
    let rows = [];
    if (section.type === SECTION_TYPE.ARRAY_OF_OBJECTS) {
      rows = (raw || []).map((item, idx) => ({
        _internalId: `sec_${sectionKey}_${idx}_${Date.now()}`,
        ...item,
      }));
    } else if (section.type === SECTION_TYPE.DICT_OF_OBJECTS) {
      rows = dictObjectsToRows(raw || {}).map((item, idx) => ({
        _internalId: `sec_${sectionKey}_${idx}_${Date.now()}`,
        ...item,
      }));
    } else if (section.type === SECTION_TYPE.DICT_OF_PRIMITIVES) {
      rows = dictPrimitivesToRows(raw || {}).map((item, idx) => ({
        _internalId: `sec_${sectionKey}_${idx}_${Date.now()}`,
        ...item,
      }));
    }
    setPackages(rows);
    setCategories([sectionKey]);
    setSelectedCategoryIndex(0);
  };

  const handleLoadJSON = async (overrideUrl) => {
    const url = typeof overrideUrl === 'string' && overrideUrl
      ? overrideUrl
      : (selectedPreset === presetUrls.length - 1
          ? customUrl
          : presetUrls[selectedPreset].url);

    if (!url) {
      setError('Vennligst skriv inn en URL');
      return;
    }

    if (!(await confirmDiscardIfDirty())) return;

    setLoading(true);
    setError(null);

    try {
      const cacheBustedUrl = url.includes('?') ? `${url}&_=${Date.now()}` : `${url}?_=${Date.now()}`;
      const response = await fetch(cacheBustedUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      initializeFromData(data, 'loaded');
      setLoadedUrl(url);
      setLoading(false);
      setIsDirty(false); setDirtyFields(new Set()); setDirtySections(new Set()); setUndoStack([]); setRedoStack([]); setSearchQuery('');
    } catch (err) {
      setError(`Kunne ikke laste JSON: ${err.message}`);
      setLoading(false);
    }
  };

  // Load from file
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!(await confirmDiscardIfDirty())) {
      event.target.value = ''; // reset input så brukeren kan velge samme fil igjen
      return;
    }

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let text = e.target.result;
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        const data = JSON.parse(text);
        initializeFromData(data, 'file');
        setLoadedUrl(null);
        setLoading(false);
        setIsDirty(false); setDirtyFields(new Set()); setDirtySections(new Set()); setUndoStack([]); setRedoStack([]); setSearchQuery('');
      } catch (err) {
        setError(`Kunne ikke lese fil: ${err.message}`);
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleAddPackage = () => {
    pushUndo();
    setIsDirty(true);
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

  // V4.0: Legg til nytt felt (kolonne) i alle rader i gjeldende seksjon
  const handleAddField = (fieldName, fieldType) => {
    pushUndo();
    const defaults = {
      text: '',
      longtext: '',
      number: 0,
      boolean: false,
      array: [],
    };
    const defaultValue = defaults[fieldType] ?? '';
    setPackages((prev) => prev.map((p) => ({ ...p, [fieldName]: defaultValue })));
    setIsDirty(true);
    if (activeSectionKey) setDirtySections((prev) => new Set(prev).add(activeSectionKey));
    setAddFieldModalOpen(false);
    toast.success(`Feltet "${fieldName}" lagt til`);
  };

  // Create a new JSON from scratch via NewJsonModal
  const handleCreateNewJson = ({ structure, data, mainKey, itemsKey, categoryLabelKey }) => {
    // V3.0: Brukeren starter alltid i single-section mode ved NyJSON
    setSections(null);
    setActiveSectionKey(null);
    setActiveSectionType(null);
    setRootPrimitives(null);

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
        categoryKey: catKey,
      });
      setSelectedCategoryIndex(0);
    }
    setError(null);
    setNewJsonModalOpen(false);
    setLoadedUrl(null);
    setIsDirty(false); setDirtyFields(new Set()); setDirtySections(new Set()); setUndoStack([]); setRedoStack([]); setSearchQuery('');
  };

  const handleDeletePackage = async (internalId) => {
    const ok = await confirm({
      title: 'Slett denne pakken?',
      message: 'Denne handlingen kan ikke angres.',
      confirmLabel: 'Slett',
      cancelLabel: 'Avbryt',
      variant: 'danger',
    });
    if (ok) {
      pushUndo();
      setPackages(packages.filter(pkg => (pkg._internalId || pkg.id) !== internalId));
      setIsDirty(true);
      if (activeSectionKey) setDirtySections((prev) => new Set(prev).add(activeSectionKey));
    }
  };

  const handleMoveRow = (internalId, direction) => {
    const idx = packages.findIndex((pkg) => (pkg._internalId || pkg.id) === internalId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= packages.length) return;
    pushUndo();
    const copy = [...packages];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    setPackages(copy);
    setIsDirty(true);
    if (activeSectionKey) setDirtySections((prev) => new Set(prev).add(activeSectionKey));
  };

  // V4.1: Dupliser en rad (settes inn rett etter originalen)
  const handleDuplicatePackage = (internalId) => {
    const idx = packages.findIndex((pkg) => (pkg._internalId || pkg.id) === internalId);
    if (idx === -1) return;
    pushUndo();
    const original = packages[idx];
    // eslint-disable-next-line no-unused-vars
    const { _internalId, id: _id, ...rest } = original;
    const newPackage = {
      ...rest,
      _internalId: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    };
    const next = [
      ...packages.slice(0, idx + 1),
      newPackage,
      ...packages.slice(idx + 1),
    ];
    setPackages(next);
    setIsDirty(true);
    if (activeSectionKey) setDirtySections((prev) => new Set(prev).add(activeSectionKey));
    toast.success('Rad duplisert');
  };

  // ============================================================
  //  Undo — snapshot-based (ingen redo)
  // ============================================================
  const MAX_UNDO = 50;

  // Lag et snapshot av mutable editor-state. Gjøres rett FØR en endring.
  const snapshot = () => ({
    packages: packages.map((p) => ({ ...p })),
    rootPrimitives: rootPrimitives ? { ...rootPrimitives } : null,
    originalData: jsonStructure?.originalData
      ? JSON.parse(JSON.stringify(jsonStructure.originalData))
      : null,
    dirtyFields: new Set(dirtyFields),
  });

  const pushUndo = () => {
    setUndoStack((stack) => {
      const next = [...stack, snapshot()];
      if (next.length > MAX_UNDO) next.shift();
      return next;
    });
    // En ny endring invaliderer redo-historikken
    setRedoStack([]);
  };

  const handleUndo = () => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      // Push current state to redo stack før vi restaurerer
      setRedoStack((r) => {
        const next = [...r, snapshot()];
        if (next.length > MAX_UNDO) next.shift();
        return next;
      });
      setPackages(prev.packages);
      setRootPrimitives(prev.rootPrimitives);
      setDirtyFields(prev.dirtyFields);
      if (prev.originalData && jsonStructure) {
        setJsonStructure({ ...jsonStructure, originalData: prev.originalData });
      }
      return stack.slice(0, -1);
    });
    toast.success('Endring angret');
  };

  const handleRedo = () => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;
      const next = stack[stack.length - 1];
      // Push current state to undo stack
      setUndoStack((u) => {
        const nextU = [...u, snapshot()];
        if (nextU.length > MAX_UNDO) nextU.shift();
        return nextU;
      });
      setPackages(next.packages);
      setRootPrimitives(next.rootPrimitives);
      setDirtyFields(next.dirtyFields);
      if (next.originalData && jsonStructure) {
        setJsonStructure({ ...jsonStructure, originalData: next.originalData });
      }
      return stack.slice(0, -1);
    });
    toast.success('Endring gjenopprettet');
  };

  // Cmd+Z / Ctrl+Z (undo) og Cmd+Shift+Z / Ctrl+Y (redo) globalt
  useEffect(() => {
    const handler = (e) => {
      const cmd = e.metaKey || e.ctrlKey;
      // Cmd+K åpner command palette uavhengig av input-fokus
      if (cmd && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (!cmd) return;
      // Ikke trigger hvis man skriver i input/textarea
      const tag = (e.target?.tagName || '').toLowerCase();
      const isEditable = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;
      if (isEditable) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (undoStack.length > 0) handleUndo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        if (redoStack.length > 0) handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoStack.length, redoStack.length, packages, rootPrimitives, jsonStructure, dirtyFields]);

  const handleInputChange = (internalId, field, value) => {
    pushUndo();
    setPackages(packages.map(pkg => 
      (pkg._internalId || pkg.id) === internalId ? { ...pkg, [field]: value } : pkg
    ));
    setIsDirty(true);
    setDirtyFields((prev) => new Set(prev).add(`pkg__${internalId}__${field}`));
    if (activeSectionKey) {
      setDirtySections((prev) => new Set(prev).add(activeSectionKey));
    }
  };

  // Open appropriate modal based on field type
  const handleEditClick = (internalId, fieldName, value) => {
    const fieldType = getFieldType(value);

    setEditingField({ source: 'package', packageId: internalId, fieldName, value, wrapperKey: null });

    if (fieldName === 'color' || fieldName === 'farge' || fieldName === 'hex') {
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
    pushUndo();
    const updatedOriginal = {
      ...jsonStructure.originalData,
      [wrapperKey]: {
        ...jsonStructure.originalData[wrapperKey],
        [fieldName]: newValue,
      },
    };
    setJsonStructure({ ...jsonStructure, originalData: updatedOriginal });
    setIsDirty(true);
    setDirtyFields((prev) => new Set(prev).add(`extra__${wrapperKey}__${fieldName}`));
  };

  // V3.0: endring av rot-nivå primitiv (fra RootPrimitivesPanel)
  const handleRootPrimitiveChange = (fieldName, newValue) => {
    pushUndo();
    setRootPrimitives((prev) => ({ ...(prev || {}), [fieldName]: newValue }));
    setIsDirty(true);
    setDirtyFields((prev) => new Set(prev).add(`root__${fieldName}`));
    if (activeSectionKey) {
      setDirtySections((prev) => new Set(prev).add(activeSectionKey));
    }
  };

  // Open modal for an extra field (longtext / array / color / icon)
  const handleEditExtraField = (wrapperKey, fieldName, value) => {
    setEditingField({ source: 'extra', packageId: null, fieldName, value, wrapperKey });

    if (fieldName === 'color' || fieldName === 'farge' || fieldName === 'hex') {
      setColorModalOpen(true);
    } else if (fieldName === 'ikon' || fieldName === 'icon') {
      setIconModalOpen(true);
    } else if (Array.isArray(value)) {
      setListModalOpen(true);
    } else {
      setTextModalOpen(true);
    }
  };

  // V4.1: Åpne ListEditModal for et array-of-primitives rot-felt
  const handleEditRootArray = (fieldName, value) => {
    setEditingField({ source: 'root', packageId: null, fieldName, value, wrapperKey: null });
    setListModalOpen(true);
  };

  const resetEditingField = () =>
    setEditingField({ source: 'package', packageId: null, fieldName: null, value: null, wrapperKey: null });

  // Dispatch save from modals to the right store (package row, extra field eller rot-array)
  const applySavedValue = (newValue) => {
    if (editingField.source === 'root') {
      handleRootPrimitiveChange(editingField.fieldName, newValue);
    } else if (editingField.source === 'extra' && editingField.wrapperKey) {
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
      toast.error('Ingen data å eksportere. Last inn eller opprett en JSON-fil først.');
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

      toast.success('JSON-fil lastet ned');
      setIsDirty(false); setDirtyFields(new Set()); setDirtySections(new Set()); setUndoStack([]); setRedoStack([]);
    } catch (err) {
      toast.error('Kunne ikke eksportere: ' + err.message);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!jsonStructure) {
      toast.error('Ingen data å kopiere. Last inn eller opprett en JSON-fil først.');
      return;
    }

    try {
      const persisted = persistCurrentPackages() || jsonStructure;
      const exportData = persisted.originalData;

      const jsonString = JSON.stringify(exportData, null, 2);
      await navigator.clipboard.writeText(jsonString);
      toast.success('JSON kopiert til clipboard');
      setIsDirty(false); setDirtyFields(new Set()); setDirtySections(new Set()); setUndoStack([]); setRedoStack([]);
    } catch (err) {
      toast.error('Kunne ikke kopiere: ' + err.message);
    }
  };

  // V5.2: GitHub push — flagg + parsed kilde-URL
  // REACT_APP_PUSH_GITHUB må være "true" for å vise knappen, "false" skjuler.
  const githubEnabled = process.env.REACT_APP_PUSH_GITHUB === 'true';
  const githubParsed = loadedUrl ? parseGithubRawUrl(loadedUrl) : null;
  const canPushToGithub = !!(githubEnabled && githubParsed && jsonStructure);

  const handleOpenGithubPush = () => {
    if (!canPushToGithub) return;
    // Persister gjeldende seksjon før vi serialiserer
    persistCurrentPackages();
    setGithubModalOpen(true);
  };

  // Live-serialisert JSON for GitHub-modalen (matcher det "Last ned JSON" produserer)
  const githubJsonString = (() => {
    if (!jsonStructure) return '';
    const live = computeLiveJson();
    return live ? JSON.stringify(live, null, 2) + '\n' : '';
  })();

  const handleGithubSuccess = (res) => {
    toast.success(
      `Pushet til GitHub. Backup: ${res.backupCommit?.slice(0, 7) || '?'}, ` +
      `Update: ${res.updateCommit?.slice(0, 7) || '?'}`
    );
    setIsDirty(false); setDirtyFields(new Set()); setDirtySections(new Set());
  };

  // Get all field names from first package (exclude internal fields like _internalId,
  // but keep __key which is a user-visible dict-key column).
  const fieldNames = packages.length > 0
    ? Object.keys(packages[0]).filter(
        (key) => key === ROW_KEY_FIELD || !key.startsWith('_')
      )
    : [];

  // V4.1: filtrert visning basert på søk. Match mot alle felter (case-insensitive,
  // arrays joined på " "). Vi beholder original index slik at row-actions fungerer.
  const filteredPackages = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return packages.map((pkg, idx) => ({ pkg, idx }));
    return packages
      .map((pkg, idx) => ({ pkg, idx }))
      .filter(({ pkg }) =>
        Object.entries(pkg).some(([k, v]) => {
          if (k.startsWith('_') && k !== ROW_KEY_FIELD) return false;
          if (v === null || v === undefined) return false;
          if (Array.isArray(v)) return v.some((it) => String(it).toLowerCase().includes(q));
          if (typeof v === 'object') return JSON.stringify(v).toLowerCase().includes(q);
          return String(v).toLowerCase().includes(q);
        })
      );
  })();

  // Render field cell
  const renderFieldCell = (pkg, fieldName) => {
    const value = pkg[fieldName];
    const fieldType = getFieldType(value);
    const isIconField = fieldName === 'ikon' || fieldName === 'icon';
    const isColorField = fieldName === 'color' || fieldName === 'farge' || fieldName === 'hex';
    const internalId = pkg._internalId || pkg.id;
    const isEdited = dirtyFields.has(`pkg__${internalId}__${fieldName}`);
    const dirtyClass = isEdited ? ' edited' : '';

    // Boolean checkbox
    if (fieldType === 'boolean') {
      return (
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => handleInputChange(internalId, fieldName, e.target.checked)}
          className={`checkbox${dirtyClass}`}
        />
      );
    }

    // Array - show edit button
    if (fieldType === 'array') {
      return (
        <button
          className={`edit-btn${dirtyClass}`}
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
          className={`edit-btn${dirtyClass}`}
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
          className={`edit-btn color-preview-btn${dirtyClass}`}
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
          className={`edit-btn${dirtyClass}`}
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
        className={`table-input${dirtyClass}`}
      />
    );
  };

  // V5.0: command palette items
  const paletteActions = useMemo(() => {
    const arr = [
      {
        id: 'toggle-preview',
        label: previewOpen ? 'Skjul JSON-preview' : 'Vis JSON-preview',
        hint: 'Toggle',
        icon: '{}',
        run: () => setPreviewOpen((v) => !v),
      },
      {
        id: 'open-settings',
        label: 'Åpne innstillinger (bakgrunn, modus, opacity)',
        hint: 'Settings',
        icon: '⚙️',
        run: () => setSettingsOpen(true),
      },
      {
        id: 'export-download',
        label: 'Eksporter — last ned JSON',
        hint: 'Handling',
        icon: '↓',
        run: () => handleDownloadJSON(),
      },
      {
        id: 'export-clipboard',
        label: 'Eksporter — kopier til clipboard',
        hint: 'Handling',
        icon: '⎘',
        run: () => handleCopyToClipboard(),
      },
      {
        id: 'undo',
        label: 'Angre siste endring',
        hint: 'Cmd+Z',
        icon: '↶',
        run: () => undoStack.length > 0 && handleUndo(),
      },
      {
        id: 'redo',
        label: 'Gjenopprett',
        hint: 'Cmd+Shift+Z',
        icon: '↷',
        run: () => redoStack.length > 0 && handleRedo(),
      },
      {
        id: 'new-json',
        label: 'Lag ny JSON fra scratch',
        hint: 'New',
        icon: '✨',
        run: async () => {
          if (await confirmDiscardIfDirty()) setNewJsonModalOpen(true);
        },
      },
    ];
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOpen, undoStack.length, redoStack.length]);

  return (
    <div className="app-container">
      {/* V5.0: Topbar med brand + globale handlinger */}
      <header className="topbar" data-testid="topbar">
        <div className="brand" data-testid="brand">
          <div className="brand-logo">Ko</div>
          <div className="brand-text">
            <span className="brand-name">{bg.config?.brand?.name || 'Ko | Do · Editor'}</span>
            <span className="brand-tag">{bg.config?.brand?.tagline || 'Universal JSON Editor'} · {APP_VERSION}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button
            className="btn btn-kbd"
            onClick={() => setPaletteOpen(true)}
            data-testid="open-palette-btn"
            title="Command palette (⌘K)"
          >
            <kbd>⌘</kbd><kbd>K</kbd> Søk
          </button>
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="btn"
            data-testid="undo-btn-top"
            title={undoStack.length === 0 ? 'Ingenting å angre' : `Angre (${undoStack.length} steg)`}
          >
            ↶ Angre
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="btn"
            data-testid="redo-btn-top"
            title={redoStack.length === 0 ? 'Ingenting å gjenopprette' : `Gjenopprett (${redoStack.length} steg)`}
          >
            ↷ Gjenopprett
          </button>
          <button
            onClick={async () => { if (await confirmDiscardIfDirty()) setNewJsonModalOpen(true); }}
            className="btn"
            data-testid="open-new-json-btn"
            title="Lag ny JSON fra scratch"
          >
            ✨ Ny JSON
          </button>
          <button
            className="btn icon-btn"
            onClick={() => setSettingsOpen(true)}
            data-testid="open-settings-btn"
            title="Innstillinger"
          >
            ⚙
          </button>
        </div>
      </header>

      <div className={`app-shell ${previewOpen ? 'split' : ''}`}>
        {/* V5.0: Sidebar når ≥5 seksjoner — ellers horisontal picker (i main) */}
        {sections && sections.length >= 5 && (
          <Sidebar
            sections={sections}
            activeKey={activeSectionKey}
            onSelect={switchToSection}
            dirtySections={dirtySections}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => {
              setSidebarCollapsed((v) => {
                const next = !v;
                try { localStorage.setItem('kodo-editor-sidebar-collapsed-v1', next ? '1' : '0'); } catch {}
                return next;
              });
            }}
          />
        )}

        <div className="app-shell-main">
        <div className={`workspace ${previewOpen ? 'split' : ''}`}>
        <div className="workspace-main">
        <div className="editor-card">
        <div className="editor-header">
          <div>
            <h1 className="title" data-testid="app-title">
              {bg.config?._meta?.client || 'Ko | Do Consult'} — Innholdsredigering
            </h1>
          </div>
        </div>

        {/* Last inn metode */}
        <div className="load-section">
          <div className="load-tabs" data-testid="load-tabs">
            <button
              onClick={() => setLoadMethod('url')}
              className={`load-tab ${loadMethod === 'url' ? 'active' : ''}`}
              data-testid="tab-url-btn"
            >
              🔗 Fra URL
            </button>
            <button
              onClick={() => setLoadMethod('file')}
              className={`load-tab ${loadMethod === 'file' ? 'active' : ''}`}
              data-testid="tab-file-btn"
            >
              📁 Lokal fil
            </button>
          </div>

          {loadMethod === 'url' ? (
            <div>
              <div className="url-row">
                <PresetDropdown
                  value={selectedPreset}
                  options={presetUrls}
                  onChange={(idx) => {
                    setSelectedPreset(idx);
                    if (idx === presetUrls.length - 1) {
                      setCustomUrlOpen(true);
                    }
                  }}
                  testId="preset-url-select"
                />

                {selectedPreset === presetUrls.length - 1 ? (
                  <button
                    className="btn-secondary"
                    onClick={() => setCustomUrlOpen(true)}
                    data-testid="open-custom-url-btn"
                    title="Skriv inn custom URL"
                  >
                    {customUrl ? '✏️ Endre URL' : '+ Skriv URL'}
                  </button>
                ) : null}

                <div className="url-actions-stack">
                  <button
                    className={`btn-stack-toggle ${previewOpen ? 'active' : ''}`}
                    onClick={() => setPreviewOpen(!previewOpen)}
                    data-testid="toggle-preview-btn"
                    title={previewOpen ? 'Skjul rå JSON' : 'Vis rå JSON'}
                  >
                    {'{}'} {previewOpen ? 'Skjul JSON' : 'Vis JSON'}
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleLoadJSON}
                    disabled={loading || (selectedPreset === presetUrls.length - 1 && !customUrl)}
                    data-testid="load-json-btn"
                  >
                    {loading ? 'Laster…' : 'Last inn'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`file-upload-area${isDragOver ? ' drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
              onDrop={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
                const file = e.dataTransfer?.files?.[0];
                if (!file) return;
                if (!file.name.toLowerCase().endsWith('.json')) {
                  setError('Vennligst slipp en .json-fil');
                  return;
                }
                if (!(await confirmDiscardIfDirty())) return;
                setLoading(true);
                setError(null);
                const reader = new FileReader();
                reader.onload = (ev) => {
                  try {
                    let text = ev.target.result;
                    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
                    const data = JSON.parse(text);
                    initializeFromData(data, 'drop');
                    setLoadedUrl(null);
                    setLoading(false);
                    setIsDirty(false); setDirtyFields(new Set()); setDirtySections(new Set()); setUndoStack([]); setRedoStack([]); setSearchQuery('');
                  } catch (err) {
                    setError(`Kunne ikke lese fil: ${err.message}`);
                    setLoading(false);
                  }
                };
                reader.readAsText(file);
              }}
              data-testid="file-drop-area"
            >
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
                  {loading ? '⏳' : isDragOver ? '⬇️' : '📁'}
                </div>
                <div style={{ fontWeight: 500, color: '#0f172a' }}>
                  {loading ? 'Laster…' : isDragOver ? 'Slipp fil for å laste inn' : 'Klikk for å velge fil'}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  eller dra og slipp .json-fil her
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

        {/* V3.0: SectionPicker — horisontal, kun når <5 seksjoner (sidebar tar over ellers) */}
        {sections && sections.length < 5 && (
          <SectionPicker
            sections={sections}
            activeKey={activeSectionKey}
            onSelect={switchToSection}
            dirtySections={dirtySections}
          />
        )}

        {/* Kategori-navigering + status-pille på samme linje */}
        <div className="navigation">
          <button
            className={`status-pill ${jsonStructure ? 'loaded' : 'mock'} ${isDirty ? 'dirty' : ''}`}
            onClick={() => setStatusModalOpen(true)}
            data-testid="open-status-btn"
            title={isDirty ? 'Du har ulagrede endringer' : 'Klikk for detaljer'}
          >
            <span className="status-dot" />
            <span className="status-text">
              {jsonStructure ? 'Data lastet' : 'Mock'}
              {isDirty && <span className="status-dirty-marker" aria-label="ulagrede endringer">●</span>}
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
            style={{ display: 'none' }}
          >
            {categories.map((cat, index) => (
              <option key={index} value={index}>
                {cat} ({index + 1}/{categories.length})
              </option>
            ))}
          </select>
          <PresetDropdown
            value={selectedCategoryIndex}
            options={categories.map((cat, index) => ({
              name: `${cat} (${index + 1}/${categories.length})`,
            }))}
            onChange={(idx) => {
              const persisted = persistCurrentPackages();
              setSelectedCategoryIndex(idx);
              if (persisted && persisted.hasCategories) {
                loadPackagesForCategory(persisted, idx);
              }
            }}
            testId="category-dropdown"
          />

          {jsonStructure?.hasCategories && (
            <CategoryMenu
              currentName={categories[selectedCategoryIndex]}
              index={selectedCategoryIndex}
              total={categories.length}
              onRename={handleCategoryRename}
              onAdd={handleCategoryAdd}
              onMoveUp={handleCategoryMoveUp}
              onMoveDown={handleCategoryMoveDown}
              onDelete={handleCategoryDelete}
            />
          )}

          <button
            onClick={handleNext}
            disabled={selectedCategoryIndex === categories.length - 1}
            className="nav-button"
            data-testid="next-category-btn"
          >
            Neste →
          </button>

          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="nav-button"
            data-testid="undo-btn"
            title={undoStack.length === 0 ? 'Ingenting å angre' : `Angre (${undoStack.length} steg) — Cmd/Ctrl+Z`}
          >
            ↶ Angre
          </button>

          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="nav-button"
            data-testid="redo-btn"
            title={redoStack.length === 0 ? 'Ingenting å gjenopprette' : `Gjenopprett (${redoStack.length} steg) — Cmd/Ctrl+Shift+Z`}
          >
            ↷ Gjenopprett
          </button>
        </div>

        {/* Ekstra felter — rot-objekter ved siden av hoved-arrayet (kun i single-section mode) */}
        {!sections && jsonStructure?.originalData && !Array.isArray(jsonStructure.originalData) && (() => {
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
              dirtyFields={dirtyFields}
            />
          );
        })()}

        {/* V3.0: RootPrimitivesPanel når aktiv seksjon er primitive */}
        {sections && activeSectionType === SECTION_TYPE.PRIMITIVE && rootPrimitives && (
          <RootPrimitivesPanel
            data={rootPrimitives}
            dirtyFields={dirtyFields}
            onChange={handleRootPrimitiveChange}
            onEditArray={handleEditRootArray}
          />
        )}

        {/* Pakker-tabell — skjules når aktiv seksjon er primitive */}
        {!(sections && activeSectionType === SECTION_TYPE.PRIMITIVE) && (
        <div className="table-section">
          <div className="table-header-bar">
            <h2 className="section-title-inline">
              {jsonStructure?.hasCategories
                ? (jsonStructure.itemsKey
                    ? jsonStructure.itemsKey.charAt(0).toUpperCase() + jsonStructure.itemsKey.slice(1)
                    : 'Pakker')
                : 'Items'} i "{categories[selectedCategoryIndex]}"
              {searchQuery && (
                <span className="filter-badge" data-testid="filter-badge">
                  {filteredPackages.length} av {packages.length} treff
                </span>
              )}
            </h2>
            <div className="table-search">
              <span className="table-search-icon" aria-hidden="true">🔍</span>
              <input
                type="text"
                className="table-search-input"
                placeholder="Søk i alle felter…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="table-search-input"
                disabled={packages.length === 0}
              />
              {searchQuery && (
                <button
                  className="table-search-clear"
                  onClick={() => setSearchQuery('')}
                  data-testid="table-search-clear"
                  title="Tøm søk"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {fieldNames.map(fieldName => (
                    <th key={fieldName}>
                      {fieldName === ROW_KEY_FIELD
                        ? 'Nøkkel'
                        : fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </th>
                  ))}
                  <th style={{ width: '170px' }}>Aksjon</th>
                </tr>
              </thead>
              <tbody>
                {filteredPackages.length === 0 && searchQuery && (
                  <tr>
                    <td colSpan={fieldNames.length + 1} className="empty-row">
                      Ingen rader matcher "<strong>{searchQuery}</strong>".
                    </td>
                  </tr>
                )}
                {filteredPackages.map(({ pkg, idx: pkgIndex }) => {
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
                            onClick={() => handleDuplicatePackage(internalId)}
                            className="btn-duplicate"
                            title="Dupliser rad"
                            data-testid={`duplicate-btn-${pkgIndex}`}
                          >
                            ⧉
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
        )}

        {/* Legg til pakke + Legg til felt — skjules når aktiv seksjon er primitive */}
        {!(sections && activeSectionType === SECTION_TYPE.PRIMITIVE) && (
          <div className="row-action-bar">
            <button onClick={handleAddPackage} className="btn-add" data-testid="add-package-btn">
              ➕ Legg til rad
            </button>
            <button
              onClick={() => setAddFieldModalOpen(true)}
              className="btn-add"
              data-testid="add-field-btn"
              disabled={packages.length === 0}
              title={packages.length === 0 ? 'Legg til en rad først' : 'Legg til nytt felt i alle rader'}
            >
              ➕ Legg til felt
            </button>
          </div>
        )}

        {/* Eksporter-knapper */}
        <div className="export-section">
          <button className="btn-blue" onClick={handleDownloadJSON} data-testid="download-json-btn">
            💾 Last ned JSON
          </button>
          {githubEnabled && (
            <button
              className="btn-github"
              onClick={handleOpenGithubPush}
              disabled={!canPushToGithub}
              data-testid="push-github-btn"
              title={
                !githubParsed
                  ? 'Last inn en raw.githubusercontent.com-URL for å pushe direkte'
                  : 'Lagre redigert JSON tilbake til GitHub (backup + commit)'
              }
            >
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2 .37-2.53-.49-2.7-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              Lagre til GitHub
            </button>
          )}
          <button className="btn-orange" onClick={handleCopyToClipboard} data-testid="copy-json-btn">
            📋 Kopier til clipboard
          </button>
        </div>
      </div>
      </div>{/* /workspace-main */}

      <JsonPreviewPanel
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        jsonValue={computeLiveJson()}
        mainKey={jsonStructure?.mainKey}
        isPathEdited={isPathEdited}
      />
      </div>{/* /workspace */}
      </div>{/* /app-shell-main */}
      </div>{/* /app-shell */}

      {/* V5.0: Status bar (footer-ish), Settings & Command palette */}
      <StatusBar
        brandName={bg.config?.brand?.name || 'KoDo'}
        fileLabel={loadedRootData ? (presetUrls[selectedPreset]?.name || 'Custom') : null}
        loaded={!!loadedRootData}
        dirty={isDirty}
        dirtyCount={dirtyFields.size}
        lineCount={(() => {
          const j = computeLiveJson();
          return j ? JSON.stringify(j, null, 2).split('\n').length : 0;
        })()}
        byteSize={(() => {
          const j = computeLiveJson();
          return j ? new Blob([JSON.stringify(j, null, 2)]).size : 0;
        })()}
        onOpenPalette={() => setPaletteOpen(true)}
        onLogout={auth?.logout}
        showLogout={!!auth && !auth.devBypass}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={bg.config}
        allBackgrounds={bg.allBackgrounds}
        backgroundId={bg.backgroundId}
        rotateMode={bg.rotateMode}
        overlay={bg.overlay}
        onChangeBackground={bg.setBackgroundId}
        onChangeRotate={bg.setRotateMode}
        onChangeOverlay={bg.setOverlay}
        themeId={themeCtx.themeId}
        onChangeTheme={themeCtx.setThemeId}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        sections={sections}
        activeSectionKey={activeSectionKey}
        onSelectSection={switchToSection}
        presets={presetUrls}
        onSelectPreset={(idx) => {
          setSelectedPreset(idx);
          // Trigger load via existing load flow
          setLoadMethod('url');
          // For Custom URL, åpne modal i stedet for å laste direkte
          if (idx === presetUrls.length - 1) {
            setCustomUrlOpen(true);
          } else {
            setTimeout(() => handleLoadJSON && handleLoadJSON(), 50);
          }
        }}
        actions={paletteActions}
        onSearchInTable={(q) => {
          setSearchQuery(q);
          toast.success(`Søker "${q}" i tabell`);
        }}
      />

      <CustomUrlModal
        open={customUrlOpen}
        onClose={() => setCustomUrlOpen(false)}
        initialUrl={customUrl}
        onConfirm={(url) => {
          setCustomUrl(url);
          // Sett preset til "Custom URL..." og last inn — send url direkte
          // for å unngå closure-lag på customUrl-state.
          setSelectedPreset(presetUrls.length - 1);
          setCustomUrlOpen(false);
          handleLoadJSON(url);
        }}
      />

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

      <AddFieldModal
        isOpen={addFieldModalOpen}
        existingFields={fieldNames}
        onClose={() => setAddFieldModalOpen(false)}
        onAdd={handleAddField}
      />

      <GithubPushModal
        open={githubModalOpen}
        onClose={() => setGithubModalOpen(false)}
        parsed={githubParsed}
        jsonString={githubJsonString}
        onSuccess={handleGithubSuccess}
      />
    </div>
  );
}

export default App;
