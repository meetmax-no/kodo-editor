// GET /api/me — sjekk om gjeldende cookie er en gyldig sesjon.
// ESM module

import { COOKIE_NAME, verifySession, readCookie } from './_lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = readCookie(req, COOKIE_NAME);
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }

  const result = await verifySession(token);
  if (!result.ok) {
    return res.status(401).json({ authenticated: false });
  }

  return res.status(200).json({
    authenticated: true,
    client: result.payload.client || 'default',
    expiresAt: result.payload.exp,
  });
}
