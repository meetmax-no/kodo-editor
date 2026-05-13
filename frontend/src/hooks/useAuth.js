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

      // Forsøk JSON først, fall tilbake til ren tekst hvis det feiler
      // (skjer typisk når Vercel-funksjonen krasjer før den får svart med JSON)
      const contentType = res.headers.get('content-type') || '';
      let data = {};
      let rawText = null;
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => ({}));
      } else {
        rawText = await res.text().catch(() => null);
      }

      if (!res.ok) {
        setError({
          status: res.status,
          message: data.error || rawText || `HTTP ${res.status}`,
          code: data.code || null,
          contentType,
          rawText,
        });
        return false;
      }
      setStatus('authenticated');
      setClient(data.client || 'default');
      return true;
    } catch (err) {
      setError({ status: 0, message: err.message || 'Innlogging feilet', code: 'NETWORK' });
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
