// POST /api/auth — validér passord, sett sesjons-cookie.
//
// Body: { password: string, remember?: boolean }
//
// Svar:
//   200 { ok: true, client, expiresIn } + Set-Cookie
//   400 { error, code: 'MISSING_PASSWORD' }
//   401 { error, code: 'WRONG_PASSWORD' }
//   405 { error: 'Method not allowed' }
//   500 { error, code: 'MISSING_HASH' | 'MISSING_JWT_SECRET' | 'JWT_TOO_SHORT'
//                       | 'INVALID_HASH' | 'INTERNAL' }
//
// Alle 500-svar har 'code' slik at frontend kan vise informativ feilmelding
// for admin (REACT_APP_SHOW_ADMIN_TOOLS=true) og generisk melding for kunde.

const bcrypt = require('bcryptjs');
const {
  COOKIE_NAME,
  TTL_DEFAULT_SECONDS,
  TTL_REMEMBER_SECONDS,
  signSession,
  buildSetCookie,
  isHttpsRequest,
} = require('./_lib/session');

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
    return res.status(400).json({ error: 'Manglende passord', code: 'MISSING_PASSWORD' });
  }

  // Pre-flight: sjekk at server-konfig er på plass FØR vi prøver å validere
  const hash = process.env.AUTH_PASSWORD_HASH;
  if (!hash) {
    console.error('[auth] AUTH_PASSWORD_HASH er ikke satt');
    return res.status(500).json({
      error: 'AUTH_PASSWORD_HASH er ikke satt på Vercel (Settings → Environment Variables)',
      code: 'MISSING_HASH',
    });
  }
  if (!hash.startsWith('$2')) {
    console.error('[auth] AUTH_PASSWORD_HASH har ugyldig format (mangler $2-prefiks)');
    return res.status(500).json({
      error: 'AUTH_PASSWORD_HASH har ugyldig format. Skal starte med "$2b$12$" og være 60 tegn.',
      code: 'INVALID_HASH',
    });
  }

  const jwtSecret = process.env.AUTH_JWT_SECRET;
  if (!jwtSecret) {
    console.error('[auth] AUTH_JWT_SECRET er ikke satt');
    return res.status(500).json({
      error: 'AUTH_JWT_SECRET er ikke satt på Vercel (Settings → Environment Variables)',
      code: 'MISSING_JWT_SECRET',
    });
  }
  if (jwtSecret.length < 32) {
    console.error(`[auth] AUTH_JWT_SECRET er for kort (${jwtSecret.length} tegn, krever ≥32)`);
    return res.status(500).json({
      error: `AUTH_JWT_SECRET er for kort: ${jwtSecret.length} tegn. Må være minimum 32 tegn (anbefalt 64+).`,
      code: 'JWT_TOO_SHORT',
    });
  }

  // Validér passord
  let match = false;
  try {
    match = await bcrypt.compare(password, hash);
  } catch (err) {
    console.error('[auth] bcrypt.compare kastet:', err.message);
    return res.status(500).json({
      error: 'Kunne ikke verifisere passord. Sjekk at AUTH_PASSWORD_HASH har riktig bcrypt-format.',
      code: 'INVALID_HASH',
    });
  }

  if (!match) {
    await bruteForceDelay();
    return res.status(401).json({ error: 'Feil passord', code: 'WRONG_PASSWORD' });
  }

  // Sign session
  const ttl = remember ? TTL_REMEMBER_SECONDS : TTL_DEFAULT_SECONDS;
  const client = process.env.AUTH_CLIENT_ID || 'default';

  let token;
  try {
    token = await signSession({ client, ttlSeconds: ttl });
  } catch (err) {
    console.error('[auth] signSession kastet:', err.message);
    return res.status(500).json({
      error: 'Kunne ikke signere sesjon. Sjekk AUTH_JWT_SECRET.',
      code: 'INTERNAL',
    });
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
