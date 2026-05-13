// GET /api/me — sjekk om gjeldende cookie er en gyldig sesjon.
//
// 200: { authenticated: true, client: "default", expiresAt: 1234567890 }
// 401: { authenticated: false }

const {
  COOKIE_NAME,
  verifySession,
  readCookie,
} = require('./_lib/session');

module.exports = async function handler(req, res) {
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
};
