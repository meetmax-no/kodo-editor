import React, { useState } from 'react';
import { ROTATE_MODES, ROTATE_LABELS } from '../themes';
import PasswordAdminPanel from './PasswordAdminPanel';
import './SettingsModal.css';

const ADMIN_TOOLS_ENABLED = process.env.REACT_APP_SHOW_ADMIN_TOOLS === 'true';

/**
 * SettingsModal — bakgrunns- & meta-innstillinger, med faner for tekniske admin-verktøy.
 */
export default function SettingsModal({
  open,
  onClose,
  config,
  allBackgrounds,
  backgroundId,
  rotateMode,
  overlay,
  onChangeBackground,
  onChangeRotate,
  onChangeOverlay,
}) {
  const [tab, setTab] = useState('general');

  if (!open) return null;

  const meta = config?._meta || {};
  const brand = config?.brand || {};

  return (
    <div className="settings-overlay" onClick={onClose} data-testid="settings-modal">
      <div
        className="settings-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="settings-header">
          <div className="settings-header-left">
            <div className="settings-titlebar">
              <h2 className="settings-title">Innstillinger</h2>
              <nav className="settings-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  className={`settings-tab ${tab === 'general' ? 'active' : ''}`}
                  onClick={() => setTab('general')}
                  data-testid="settings-tab-general"
                >
                  Generelt
                </button>
                {ADMIN_TOOLS_ENABLED && (
                  <button
                    type="button"
                    role="tab"
                    className={`settings-tab ${tab === 'security' ? 'active' : ''}`}
                    onClick={() => setTab('security')}
                    data-testid="settings-tab-security"
                  >
                    Sikkerhet
                  </button>
                )}
              </nav>
            </div>
            <p className="settings-subtitle">{brand.name || 'Ko | Do · Editor'}</p>
          </div>
          <button
            className="settings-close"
            onClick={onClose}
            data-testid="settings-close-btn"
            aria-label="Lukk"
          >
            ✕
          </button>
        </header>

        {tab === 'general' && (
          <>
            <section className="settings-section">
              <h3 className="settings-section-title">Om denne konfigurasjonen</h3>
              <dl className="settings-meta">
                {Object.entries(meta).map(([k, v]) => (
                  <div className="settings-meta-row" key={k}>
                    <dt>{k}</dt>
                    <dd>{String(v)}</dd>
                  </div>
                ))}
                {brand.tagline && (
                  <div className="settings-meta-row">
                    <dt>tagline</dt>
                    <dd>{brand.tagline}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="settings-section">
              <h3 className="settings-section-title">Bakgrunn</h3>

              <div className="settings-row">
                <label className="settings-label">Modus</label>
                <div className="rotate-group">
                  {Object.values(ROTATE_MODES).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`rotate-pill ${rotateMode === mode ? 'active' : ''}`}
                      onClick={() => onChangeRotate(mode)}
                      data-testid={`rotate-mode-${mode}`}
                    >
                      {ROTATE_LABELS[mode]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-row">
                <label className="settings-label">
                  Overlay opacity
                  <span className="settings-value">{Math.round(overlay * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={overlay}
                  onChange={(e) => onChangeOverlay(parseFloat(e.target.value))}
                  className="settings-slider"
                  data-testid="overlay-slider"
                />
              </div>

              <div className="settings-row settings-row-full">
                <label className="settings-label">
                  Velg bakgrunn
                  <span className="settings-hint">
                    {rotateMode !== ROTATE_MODES.STATIC && (
                      <em>· I {ROTATE_LABELS[rotateMode].toLowerCase()}-modus brukes valget kun som fallback</em>
                    )}
                  </span>
                </label>
                <div className="bg-grid">
                  {allBackgrounds.map((bg) => {
                    const isActive = bg.id === backgroundId;
                    const previewStyle =
                      bg.css
                        ? { background: bg.css }
                        : { background: `url("${bg.url}") center/cover no-repeat` };
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        className={`bg-tile ${isActive ? 'active' : ''}`}
                        onClick={() => onChangeBackground(bg.id)}
                        title={bg.name}
                        data-testid={`bg-tile-${bg.id}`}
                      >
                        <div className="bg-tile-preview" style={previewStyle} />
                        <div className="bg-tile-meta">
                          <span className="bg-tile-name">{bg.name}</span>
                          <span className={`bg-tile-cat cat-${bg.category}`}>
                            {bg.category}
                          </span>
                        </div>
                        {isActive && <div className="bg-tile-check">✓</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}

        {tab === 'security' && ADMIN_TOOLS_ENABLED && (
          <PasswordAdminPanel />
        )}
      </div>
    </div>
  );
}
