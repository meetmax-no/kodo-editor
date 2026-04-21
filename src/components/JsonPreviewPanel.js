import React from 'react';
import toast from 'react-hot-toast';
import './JsonPreviewPanel.css';

/**
 * JsonPreviewPanel
 * Read-only "live mirror" av JSON som vil bli eksportert. Oppdateres
 * automatisk mens brukeren redigerer. Har egen kopier-knapp.
 *
 * Props:
 *   open            - bool, om panelet er synlig
 *   onClose         - callback for å lukke
 *   jsonValue       - nåværende komplette JSON-data
 *   mainKey         - hint for meta-linjen
 *   isPathEdited    - (path: (string|number)[]) => bool: sjekker om en leaf-verdi er endret
 */
export default function JsonPreviewPanel({ open, onClose, jsonValue, mainKey, isPathEdited }) {
  if (!open) return null;

  const hasData = jsonValue !== null && jsonValue !== undefined;
  const jsonString = hasData ? JSON.stringify(jsonValue, null, 2) : '';
  const lineCount = jsonString ? jsonString.split('\n').length : 0;
  const byteSize = new Blob([jsonString]).size;
  const rendered = hasData ? renderJson(jsonValue, isPathEdited || (() => false)) : '';

  const handleCopy = async () => {
    if (!jsonString) {
      toast.error('Ingen JSON å kopiere ennå.');
      return;
    }
    try {
      await navigator.clipboard.writeText(jsonString);
      toast.success('JSON kopiert til clipboard');
    } catch (err) {
      toast.error('Kunne ikke kopiere: ' + err.message);
    }
  };

  const formatBytes = (b) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} kB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <aside className="jpp-panel" data-testid="json-preview-panel">
      <header className="jpp-header">
        <div className="jpp-title-row">
          <span className="jpp-title">Rå JSON</span>
          <span className="jpp-live-dot" title="Live preview" />
        </div>
        <div className="jpp-actions">
          <button
            className="jpp-copy-btn"
            onClick={handleCopy}
            title="Kopier hele JSON"
            data-testid="preview-copy-btn"
          >
            Kopier
          </button>
          <button
            className="jpp-close-btn"
            onClick={onClose}
            title="Skjul panel"
            data-testid="preview-close-btn"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="jpp-meta">
        <span><code>{mainKey || '—'}</code></span>
        <span className="jpp-meta-sep">·</span>
        <span>{lineCount} linjer</span>
        <span className="jpp-meta-sep">·</span>
        <span>{formatBytes(byteSize)}</span>
      </div>

      <pre
        className="jpp-code"
        data-testid="preview-code"
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
    </aside>
  );
}

// ---------- Custom JSON renderer med per-path edited-highlighting ----------

const INDENT = '  ';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderJson(value, isPathEdited, path = [], depth = 0) {
  if (value === null) return wrapLeaf('null', 'jpp-null', isPathEdited(path));
  const t = typeof value;
  if (t === 'boolean') return wrapLeaf(String(value), 'jpp-bool', isPathEdited(path));
  if (t === 'number')  return wrapLeaf(String(value), 'jpp-num',  isPathEdited(path));
  if (t === 'string')  return wrapLeaf(escapeHtml(JSON.stringify(value)), 'jpp-str', isPathEdited(path));

  const pad = INDENT.repeat(depth);
  const padInner = INDENT.repeat(depth + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((item, i) => {
      return padInner + renderJson(item, isPathEdited, [...path, i], depth + 1);
    }).join(',\n');
    return `[\n${items}\n${pad}]`;
  }

  if (t === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    const items = keys.map((k) => {
      const v = value[k];
      const keyStr = `<span class="jpp-key">"${escapeHtml(k)}"</span>: `;
      const valueStr = renderJson(v, isPathEdited, [...path, k], depth + 1);
      return padInner + keyStr + valueStr;
    }).join(',\n');
    return `{\n${items}\n${pad}}`;
  }

  return '';
}

function wrapLeaf(text, colorClass, edited) {
  const cls = edited ? `${colorClass} jpp-edited` : colorClass;
  return `<span class="${cls}">${text}</span>`;
}
