import React from 'react';
import toast from 'react-hot-toast';
import './JsonPreviewPanel.css';

/**
 * JsonPreviewPanel
 * Read-only "live mirror" av JSON som vil bli eksportert. Oppdateres
 * automatisk mens brukeren redigerer. Har egen kopier-knapp for rask tilgang.
 *
 * Props:
 *   open           - bool, om panelet er synlig
 *   onClose        - callback for å lukke
 *   jsonValue      - nåværende komplette JSON-data (objekt eller array)
 *   mainKey        - filnavn-hint for kopier-bekreftelse
 */
export default function JsonPreviewPanel({ open, onClose, jsonValue, mainKey }) {
  if (!open) return null;

  const jsonString = jsonValue ? JSON.stringify(jsonValue, null, 2) : '';
  const lineCount = jsonString ? jsonString.split('\n').length : 0;
  const byteSize = new Blob([jsonString]).size;

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
        dangerouslySetInnerHTML={{ __html: highlightJson(jsonString) }}
      />
    </aside>
  );
}

// Enkel syntax-highlighter (regex-basert, trygg fordi vi først escaper HTML)
function highlightJson(json) {
  if (!json) return '';
  const escaped = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(
    // eslint-disable-next-line no-useless-escape
    /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'jpp-num';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'jpp-key' : 'jpp-str';
      } else if (/true|false/.test(match)) {
        cls = 'jpp-bool';
      } else if (/null/.test(match)) {
        cls = 'jpp-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}
