import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import './JsonPreviewPanel.css';

const STORAGE_WIDTH_KEY = 'kodo-editor-preview-width-v1';

/**
 * JsonPreviewPanel — read-only live mirror av JSON.
 * V5.0: line-numbers, drag-resize handle, bedre fargekoding.
 *
 * Path-edited highlighting bevart 1:1 fra forrige versjon.
 */
export default function JsonPreviewPanel({
  open,
  onClose,
  jsonValue,
  mainKey,
  isPathEdited,
}) {
  const [width, setWidth] = useState(() => {
    const stored = parseInt(localStorage.getItem(STORAGE_WIDTH_KEY) || '0', 10);
    return stored && stored >= 320 && stored <= 900 ? stored : 480;
  });

  const dragRef = useRef(null);
  const dragging = useRef(false);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const w = Math.min(900, Math.max(320, window.innerWidth - e.clientX));
      setWidth(w);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.classList.remove('jpp-dragging');
      try {
        localStorage.setItem(STORAGE_WIDTH_KEY, String(width));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [width]);

  if (!open) return null;

  const hasData = jsonValue !== null && jsonValue !== undefined;
  const jsonString = hasData ? JSON.stringify(jsonValue, null, 2) : '';
  const lineCount = jsonString ? jsonString.split('\n').length : 0;
  const byteSize = new Blob([jsonString]).size;
  const renderedHtml = hasData
    ? renderJson(jsonValue, isPathEdited || (() => false))
    : '';

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

  // Build line-numbers gutter
  const lineNumberHtml = Array.from({ length: lineCount }, (_, i) => i + 1)
    .map((n) => `<span class="jpp-ln">${n}</span>`)
    .join('');

  return (
    <aside
      className="jpp-panel"
      style={{ width: `${width}px` }}
      data-testid="json-preview-panel"
    >
      <div
        ref={dragRef}
        className="jpp-drag-handle"
        onMouseDown={(e) => {
          e.preventDefault();
          dragging.current = true;
          document.body.classList.add('jpp-dragging');
        }}
        title="Dra for å endre bredde"
        data-testid="preview-drag-handle"
      />

      <header className="jpp-header">
        <div className="jpp-title-row">
          <span className="jpp-title">Live JSON</span>
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
        <span className="jpp-meta-key">{mainKey || '—'}</span>
        <span className="jpp-meta-sep">·</span>
        <span>{lineCount} linjer</span>
        <span className="jpp-meta-sep">·</span>
        <span>{formatBytes(byteSize)}</span>
      </div>

      <div className="jpp-code-wrap" data-testid="preview-code">
        <pre
          className="jpp-gutter"
          dangerouslySetInnerHTML={{ __html: lineNumberHtml }}
        />
        <pre
          className="jpp-code"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      </div>
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
  if (t === 'number') return wrapLeaf(String(value), 'jpp-num', isPathEdited(path));
  if (t === 'string')
    return wrapLeaf(escapeHtml(JSON.stringify(value)), 'jpp-str', isPathEdited(path));

  const pad = INDENT.repeat(depth);
  const padInner = INDENT.repeat(depth + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) return '<span class="jpp-punc">[]</span>';
    const items = value
      .map((item, i) => padInner + renderJson(item, isPathEdited, [...path, i], depth + 1))
      .join('<span class="jpp-punc">,</span>\n');
    return `<span class="jpp-punc">[</span>\n${items}\n${pad}<span class="jpp-punc">]</span>`;
  }

  if (t === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '<span class="jpp-punc">{}</span>';
    const items = keys
      .map((k) => {
        const v = value[k];
        const keyStr = `<span class="jpp-key">"${escapeHtml(k)}"</span><span class="jpp-punc">:</span> `;
        const valueStr = renderJson(v, isPathEdited, [...path, k], depth + 1);
        return padInner + keyStr + valueStr;
      })
      .join('<span class="jpp-punc">,</span>\n');
    return `<span class="jpp-punc">{</span>\n${items}\n${pad}<span class="jpp-punc">}</span>`;
  }

  return '';
}

function wrapLeaf(text, colorClass, edited) {
  const cls = edited ? `${colorClass} jpp-edited` : colorClass;
  return `<span class="${cls}">${text}</span>`;
}
