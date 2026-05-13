// Session helpers — sign/verify JWT, parse/serialize cookies.
// ESM (api/package.json: "type": "module") — kompatibel med jose v6.

import { SignJWT, jwtVerify } from 'jose';

export const COOKIE_NAME = 'kodo_session';
const ALG = 'HS256';

// TTL i sekunder
export const TTL_DEFAULT_SECONDS = 2 * 60 * 60;        // 2 timer
export const TTL_REMEMBER_SECONDS = 30 * 24 * 60 * 60; // 30 dager

function getJwtSecret() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_JWT_SECRET må være satt og minimum 32 tegn');
  }
  return new TextEncoder().encode(secret);
}

export async function signSession({ client = 'default', ttlSeconds }) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ client })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(getJwtSecret());
}

export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: [ALG] });
    return { ok: true, payload };
  } catch (err) {
    return { ok: false, error: err.code || err.message };
  }
}

export function readCookie(req, name) {
  const header = req.headers?.cookie || '';
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function buildSetCookie({ name, value, maxAgeSeconds, secure }) {
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

export function isHttpsRequest(req) {
  // Vercel sender alltid x-forwarded-proto=https i prod
  const proto = req.headers?.['x-forwarded-proto'];
  return proto === 'https' || (Array.isArray(proto) && proto.includes('https'));
}
