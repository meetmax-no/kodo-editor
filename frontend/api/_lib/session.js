// Session helpers — sign/verify JWT, parse/serialize cookies.
// Shared by /api/auth, /api/me, /api/logout.
//
// Runtime: Node 20 (Vercel default). Uses `jose` (works in both Node + Edge).

const { SignJWT, jwtVerify } = require('jose');

const COOKIE_NAME = 'kodo_session';
const ALG = 'HS256';

// TTL i sekunder
const TTL_DEFAULT_SECONDS = 2 * 60 * 60;        // 2 timer
const TTL_REMEMBER_SECONDS = 30 * 24 * 60 * 60; // 30 dager

function getJwtSecret() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_JWT_SECRET må være satt og minimum 32 tegn');
  }
  return new TextEncoder().encode(secret);
}

async function signSession({ client = 'default', ttlSeconds }) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ client })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(getJwtSecret());
}

async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: [ALG] });
    return { ok: true, payload };
  } catch (err) {
    return { ok: false, error: err.code || err.message };
  }
}

function readCookie(req, name) {
  const header = req.headers?.cookie || '';
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function buildSetCookie({ name, value, maxAgeSeconds, secure }) {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
  ];
  if (secure) parts.push('Secure');
  if (maxAgeSeconds !== undefined) {
    parts.push(`Max-Age=${maxAgeSeconds}`);
    if (maxAgeSeconds === 0) parts.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  }
  return parts.join('; ');
}

function isHttpsRequest(req) {
  // Vercel sender alltid x-forwarded-proto=https i prod
  const proto = req.headers?.['x-forwarded-proto'];
  return proto === 'https' || (Array.isArray(proto) && proto.includes('https'));
}

module.exports = {
  COOKIE_NAME,
  TTL_DEFAULT_SECONDS,
  TTL_REMEMBER_SECONDS,
  signSession,
  verifySession,
  readCookie,
  buildSetCookie,
  isHttpsRequest,
};
