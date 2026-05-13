import React from 'react';
import './StatusBar.css';

/**
 * StatusBar — bunn-strip à la VS Code.
 * Viser brand, kilde, dirty-state, JSON-størrelse og hurtigtaster.
 */
export default function StatusBar({
  brandName,
  fileLabel,
  loaded,
  dirty,
  dirtyCount,
  lineCount,
  byteSize,
  onOpenPalette,
  onLogout,
  showLogout,
}) {
  const formatBytes = (b) => {
    if (!b && b !== 0) return '—';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} kB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <footer className="statusbar" data-testid="status-bar">
      <button
        type="button"
        className="sb-brand"
        onClick={onOpenPalette}
        title="Åpne command palette (⌘K)"
        data-testid="statusbar-brand"
      >
        <span className="sb-brand-mark">▣</span>
        <strong>{brandName || 'KoDo'}</strong>
        {fileLabel && <span className="sb-file">· {fileLabel}</span>}
      </button>

      <span className={`sb-state ${loaded ? 'ok' : 'idle'}`}>
        <span className="sb-dot" />
        {loaded ? 'lastet' : 'ingen data'}
      </span>

      {dirty && (
        <span className="sb-state dirty">
          <span className="sb-dot" />
          {dirtyCount || 0} ulagrede
        </span>
      )}

      {loaded && (
        <span className="sb-info">
          {lineCount ?? '—'} linjer · {formatBytes(byteSize)}
        </span>
      )}

      <span className="sb-spacer" />

      <span className="sb-hints">
        <kbd>⌘</kbd><kbd>K</kbd> palette
        <span className="sb-sep">·</span>
        <kbd>⌘</kbd><kbd>Z</kbd> angre
        <span className="sb-sep">·</span>
        <kbd>⌘</kbd><kbd>⇧</kbd><kbd>Z</kbd> gjenopprett
      </span>

      {showLogout && (
        <button
          type="button"
          className="sb-logout"
          onClick={onLogout}
          title="Logg ut"
          data-testid="statusbar-logout-btn"
        >
          ↪ Logg ut
        </button>
      )}
    </footer>
  );
}
