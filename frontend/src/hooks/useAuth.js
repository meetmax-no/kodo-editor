import { useState, useEffect, useCallback } from 'react';

/**
 * useAuth — håndterer auth-state mot Vercel serverless funksjoner.
 *
 * Returnerer:
 *   { status: 'checking' | 'authenticated' | 'unauthenticated',
 *     client, login, logout, error }
 *
 * Local dev: hvis REACT_APP_AUTH_DEV_BYPASS=true → returnerer alltid authenticated.
 */
const DEV_BYPASS = process.env.REACT_APP_AUTH_DEV_BYPASS === 'true';

export default function useAuth() {
  const [status, setStatus] = useState(DEV_BYPASS ? 'authenticated' : 'checking');
  const [client, setClient] = useState(DEV_BYPASS ? 'dev-bypass' : null);
  const [error, setError] = useState(null);

  const check = useCallback(async () => {
    if (DEV_BYPASS) {
      setStatus('authenticated');
      setClient('dev-bypass');
      return;
    }
    try {
      const res = await fetch('/api/me', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setStatus('authenticated');
        setClient(data.client || 'default');
      } else {
        setStatus('unauthenticated');
        setClient(null);
      }
    } catch (err) {
      // Nettverksfeil → behandle som ikke-innlogget, men logg
      console.warn('[useAuth] /api/me feilet:', err.message);
      setStatus('unauthenticated');
      setClient(null);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const login = useCallback(async (password, remember = false) => {
    setError(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, remember }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        return false;
      }
      setStatus('authenticated');
      setClient(data.client || 'default');
      return true;
    } catch (err) {
      setError(err.message || 'Innlogging feilet');
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    if (DEV_BYPASS) return;
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch (err) {
      console.warn('[useAuth] /api/logout feilet:', err.message);
    }
    setStatus('unauthenticated');
    setClient(null);
  }, []);

  return { status, client, error, login, logout, check, devBypass: DEV_BYPASS };
}
