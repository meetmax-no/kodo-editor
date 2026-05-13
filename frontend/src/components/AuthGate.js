import React from 'react';
import useAuth from '../hooks/useAuth';
import Login from './Login';

/**
 * AuthGate — wrapper rundt App. Renderer:
 *   - Skeleton mens vi sjekker /api/me
 *   - Login når ikke innlogget
 *   - children (= App) når innlogget
 *
 * Passerer auth-objekt ned til children via render-prop, slik at App
 * (eller barn av den) kan trigge logout via en knapp i StatusBar.
 */
export default function AuthGate({ children }) {
  const auth = useAuth();

  if (auth.status === 'checking') {
    return (
      <div className="auth-gate-loading" data-testid="auth-checking">
        <div className="auth-gate-spinner" />
      </div>
    );
  }

  if (auth.status === 'unauthenticated') {
    return <Login onLogin={auth.login} error={auth.error} />;
  }

  // Authenticated — render App, expose auth via prop (callable from StatusBar etc.)
  if (typeof children === 'function') return children(auth);
  return React.cloneElement(children, { auth });
}
