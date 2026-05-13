// POST /api/auth — validér passord, sett sesjons-cookie.
//
// Body: { password: string, remember?: boolean }
// 200: { ok: true } + Set-Cookie: kodo_session=<jwt>
// 400: { error: "Manglende passord" }
// 401: { error: "Feil passord" }
// 500: { error: "Server-konfigurasjon mangler" }

const bcrypt = require('bcryptjs');
const {
  COOKIE_NAME,
  TTL_DEFAULT_SECONDS,
  TTL_REMEMBER_SECONDS,
  signSession,
  buildSetCookie,
  isHttpsRequest,
} = require('./_lib/session');

// Artifisiell delay for å bremse brute-force når bcrypt-cost alene ikke er nok.
// 400-1200ms random — sammen med bcrypt cost 12 (~150ms) gjør hvert forsøk dyrt.
function bruteForceDelay() {
  const ms = 400 + Math.floor(Math.random() * 800);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const password = typeof body.password === 'string' ? body.password : '';
  const remember = body.remember === true;

  if (!password) {
    return res.status(400).json({ error: 'Manglende passord' });
  }

  const hash = process.env.AUTH_PASSWORD_HASH;
  if (!hash) {
    console.error('AUTH_PASSWORD_HASH er ikke satt');
    return res.status(500).json({ error: 'Server-konfigurasjon mangler' });
  }

  let match = false;
  try {
    match = await bcrypt.compare(password, hash);
  } catch (err) {
    console.error('bcrypt.compare feilet:', err.message);
    return res.status(500).json({ error: 'Validering feilet' });
  }

  if (!match) {
    await bruteForceDelay();
    return res.status(401).json({ error: 'Feil passord' });
  }

  const ttl = remember ? TTL_REMEMBER_SECONDS : TTL_DEFAULT_SECONDS;
  const client = process.env.AUTH_CLIENT_ID || 'default';

  let token;
  try {
    token = await signSession({ client, ttlSeconds: ttl });
  } catch (err) {
    console.error('signSession feilet:', err.message);
    return res.status(500).json({ error: 'Server-konfigurasjon mangler' });
  }

  res.setHeader(
    'Set-Cookie',
    buildSetCookie({
      name: COOKIE_NAME,
      value: token,
      maxAgeSeconds: ttl,
      secure: isHttpsRequest(req),
    })
  );

  return res.status(200).json({ ok: true, client, expiresIn: ttl });
};
