import React, { useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import useBackground from '../hooks/useBackground';
import Login from './Login';

/**
 * AuthGate — wrapper rundt App. Renderer:
 *   - Skeleton mens vi sjekker /api/me
 *   - Login når ikke innlogget
 *   - children (= App) når innlogget
 *
 * Kjører også useBackground(null) → setter --app-bg på <body> så
 * login-skjermen får samme bakgrunn som resten av appen.
 */
export default function AuthGate({ children }) {
  const auth = useAuth();
  const bg = useBackground(null);

  // Speil App.js sin effect: sett CSS-variabler på body + tone-class på html.
  useEffect(() => {
    if (!bg.activeBackground) return;
    document.body.style.setProperty('--app-bg', bg.activeCss);
    document.body.style.setProperty('--app-overlay', String(bg.overlay));
    const root = document.documentElement;
    root.classList.toggle('tone-light', bg.tone === 'light');
  }, [bg.activeCss, bg.overlay, bg.tone, bg.activeBackground]);

  if (auth.status === 'checking') {
    return (
      <div className="auth-gate-loading" data-testid="auth-checking">
        <div className="auth-gate-spinner" />
      </div>
    );
  }

  if (auth.status === 'unauthenticated') {
    return <Login onLogin={auth.login} error={auth.error} brand={bg.config?.brand} />;
  }

  // Authenticated — render App, expose auth via prop
  if (typeof children === 'function') return children(auth);
  return React.cloneElement(children, { auth });
}
