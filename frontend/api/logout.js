// POST /api/logout — slett sesjons-cookie.
//
// 200: { ok: true } + Set-Cookie: kodo_session=; Max-Age=0

const {
  COOKIE_NAME,
  buildSetCookie,
  isHttpsRequest,
} = require('./_lib/session');

module.exports = async function handler(req, res) {
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
};
