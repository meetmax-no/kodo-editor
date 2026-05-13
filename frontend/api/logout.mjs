// POST /api/logout — slett sesjons-cookie.
// .mjs = pure ESM

import { COOKIE_NAME, buildSetCookie, isHttpsRequest } from './_lib/session.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader(
    'Set-Cookie',
    buildSetCookie({
      name: COOKIE_NAME,
      value: '',
      maxAgeSeconds: 0,
      secure: isHttpsRequest(req),
    })
  );

  return res.status(200).json({ ok: true });
}
