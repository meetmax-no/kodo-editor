import React, { useState, useEffect } from 'react';
import './Login.css';

/**
 * Login — branded login-skjerm for KoDo Editor.
 * Leser branding fra /clients/default.json (samme som useBackground).
 */
export default function Login({ onLogin, error }) {
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [brand, setBrand] = useState({ name: 'KoDo Editor', tagline: 'Universal JSON Editor' });
  const [localError, setLocalError] = useState(null);

  // Last branding fra clients/default.json (samme kilde som resten av appen)
  useEffect(() => {
    fetch('/clients/default.json', { cache: 'no-store' })
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg?.brand) {
          setBrand({
            name: cfg.brand.name || 'KoDo Editor',
            tagline: cfg.brand.tagline || 'Universal JSON Editor',
            logo: cfg.brand.logo,
          });
        }
      })
      .catch(() => { /* ignorér — bruk default branding */ });
  }, []);

  // Vis feilmelding fra parent (server-side error) eller lokal validering
  const displayedError = localError || error;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    if (!password) {
      setLocalError('Skriv inn passord');
      return;
    }
    setSubmitting(true);
    const ok = await onLogin(password, remember);
    setSubmitting(false);
    if (!ok) {
      setPassword(''); // tøm feltet etter feil
    }
  };

  return (
    <div className="login-shell" data-testid="login-screen">
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg-glow" />
        <div className="login-bg-grain" />
      </div>

      <div className="login-card-wrap">
        <form
          className="login-card"
          onSubmit={handleSubmit}
          autoComplete="off"
          data-testid="login-form"
        >
          <header className="login-header">
            <div className="login-brand">
              <div className="login-logo">Ko</div>
              <div className="login-brand-text">
                <span className="login-brand-name">KoDo Editor</span>
                <span className="login-brand-customer">{brand.name}</span>
              </div>
            </div>
          </header>

          <div className="login-body">
            <label className="login-label" htmlFor="login-password">
              Passord
            </label>
            <div className="login-input-wrap">
              <input
                id="login-password"
                className="login-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Skriv passord…"
                autoFocus
                autoComplete="current-password"
                data-testid="login-password-input"
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Skjul passord' : 'Vis passord'}
                title={showPassword ? 'Skjul' : 'Vis'}
                data-testid="login-eye-toggle"
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>

            <label className="login-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                data-testid="login-remember-checkbox"
              />
              <span>Husk meg i 30 dager</span>
            </label>

            {displayedError && (
              <div className="login-error" data-testid="login-error" role="alert">
                {displayedError}
              </div>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={submitting || !password}
              data-testid="login-submit-btn"
            >
              {submitting ? 'Logger inn…' : 'Logg inn'}
            </button>
          </div>

          <footer className="login-footer">
            <span className="login-tagline">{brand.tagline}</span>
          </footer>
        </form>
      </div>
    </div>
  );
}
