import React, { useState, useEffect } from 'react';
import './Login.css';

/**
 * Login — branded login-skjerm for KoDo Editor.
 *
 * Bakgrunnen kommer fra <body> (satt av AuthGate via useBackground).
 * Login-kortet bruker samme glass-stil som resten av appen (var(--glass-strong)).
 *
 * @param {object} brand   – { name, tagline, logo? } fra clients/default.json (AuthGate)
 */
export default function Login({ onLogin, error, brand: brandProp }) {
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);
  // Fallback: hvis AuthGate ikke har lastet config enda, hent selv (samme kilde).
  const [fallbackBrand, setFallbackBrand] = useState(null);

  useEffect(() => {
    if (brandProp) return;
    fetch('/clients/default.json', { cache: 'no-store' })
      .then((r) => r.json())
      .then((cfg) => cfg?.brand && setFallbackBrand(cfg.brand))
      .catch(() => {});
  }, [brandProp]);

  const brand = brandProp || fallbackBrand || {
    name: 'KoDo Editor',
    tagline: 'Universal JSON Editor',
  };

  // Admin-modus: vis detaljert teknisk feilmelding ved server-feil (5xx)
  const showAdminDetails = process.env.REACT_APP_SHOW_ADMIN_TOOLS === 'true';

  // `error` fra useAuth er { status, message, code } eller string (localError).
  const renderError = () => {
    const e = localError || error;
    if (!e) return null;
    // localError er en string
    if (typeof e === 'string') return <span>{e}</span>;
    // Server-feil 5xx → vis admin-info hvis aktivert
    if (e.status >= 500 && showAdminDetails) {
      return (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            Server-feil ({e.status}{e.code ? ` · ${e.code}` : ''})
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 6 }}>{e.message}</div>
          {!e.code && e.rawText && (
            <details style={{ fontSize: 11, opacity: 0.85 }}>
              <summary style={{ cursor: 'pointer' }}>Rå respons (klikk for å vise)</summary>
              <pre style={{
                marginTop: 6, padding: 8, background: 'rgba(0,0,0,0.25)',
                borderRadius: 4, overflow: 'auto', maxHeight: 200, fontSize: 10
              }}>{e.rawText.slice(0, 600)}</pre>
            </details>
          )}
          {!e.code && !e.rawText && (
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
              Funksjonen krasjet før den fikk svart. Sjekk Vercel Dashboard → Logs.
            </div>
          )}
        </div>
      );
    }
    if (e.status >= 500) {
      return <span>Det oppstod en server-feil. Kontakt administrator.</span>;
    }
    // 4xx — vis selve meldingen (f.eks. "Feil passord")
    return <span>{e.message}</span>;
  };

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
      setPassword('');
    }
  };

  return (
    <div className="login-shell" data-testid="login-screen">
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
                <span className="login-brand-customer">{brand.name || 'Universal JSON Editor'}</span>
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

            {(localError || error) && (
              <div className="login-error" data-testid="login-error" role="alert">
                {renderError()}
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
            <span className="login-tagline">{brand.tagline || 'Universal JSON Editor'}</span>
          </footer>
        </form>
      </div>
    </div>
  );
}
