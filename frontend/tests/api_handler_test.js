#!/usr/bin/env node
/**
 * api_handler_test.js — Direkte Node-tests for Vercel serverless handlers.
 *
 * Vercel CRA dev-server kjører ikke /api/*. Vi laster handlers direkte og
 * kaller dem med mock req/res for å verifisere oppførsel.
 */
process.env.AUTH_PASSWORD_HASH =
  '$2b$12$vAoJeLE7Sf4DyYn3wZw87ONoKz7yWHvx8A5CWxDnomJm7/aukGxlC';
process.env.AUTH_JWT_SECRET = 'test-jwt-secret-must-be-at-least-32-chars-long';
process.env.AUTH_CLIENT_ID = 'default';

const path = require('path');
const authHandler = require(path.resolve(__dirname, '../api/auth.js'));
const meHandler = require(path.resolve(__dirname, '../api/me.js'));
const logoutHandler = require(path.resolve(__dirname, '../api/logout.js'));

const PASSWORD = 'test-passord-123';

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.body = obj;
      return this;
    },
  };
  return res;
}

function mockReq({ method = 'POST', body = undefined, headers = {} } = {}) {
  return {
    method,
    body,
    headers: { 'x-forwarded-proto': 'https', ...headers },
  };
}

const results = [];
function assert(name, cond, detail = '') {
  results.push({ name, ok: !!cond, detail });
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function run() {
  // --- /api/auth ---
  // 1) Correct password
  {
    const req = mockReq({ body: { password: PASSWORD, remember: false } });
    const res = mockRes();
    await authHandler(req, res);
    assert(
      'auth: correct password returns 200',
      res.statusCode === 200 && res.body && res.body.ok === true,
      `status=${res.statusCode} body=${JSON.stringify(res.body)}`
    );
    const sc = res.headers['set-cookie'] || '';
    assert(
      'auth: Set-Cookie contains kodo_session, HttpOnly, SameSite=Strict, Max-Age=7200',
      /kodo_session=/.test(sc) &&
        /HttpOnly/.test(sc) &&
        /SameSite=Strict/.test(sc) &&
        /Max-Age=7200/.test(sc),
      sc
    );
    // Stash cookie for /api/me test
    global.__validCookie = sc.split(';')[0]; // 'kodo_session=<jwt>'
  }
  // 2) Correct password + remember
  {
    const req = mockReq({ body: { password: PASSWORD, remember: true } });
    const res = mockRes();
    await authHandler(req, res);
    const sc = res.headers['set-cookie'] || '';
    assert(
      'auth: remember=true → Max-Age=2592000',
      res.statusCode === 200 && /Max-Age=2592000/.test(sc),
      sc
    );
  }
  // 3) Wrong password
  {
    const req = mockReq({ body: { password: 'wrong', remember: false } });
    const res = mockRes();
    const t0 = Date.now();
    await authHandler(req, res);
    const elapsed = Date.now() - t0;
    assert(
      'auth: wrong password → 401',
      res.statusCode === 401,
      `status=${res.statusCode}`
    );
    assert(
      'auth: wrong password has brute-force delay (~400-1200ms)',
      elapsed >= 350 && elapsed <= 1600,
      `elapsed=${elapsed}ms`
    );
  }
  // 4) Missing password
  {
    const req = mockReq({ body: {} });
    const res = mockRes();
    await authHandler(req, res);
    assert(
      'auth: missing password → 400',
      res.statusCode === 400,
      `status=${res.statusCode}`
    );
  }
  // 5) GET method
  {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await authHandler(req, res);
    assert(
      'auth: GET → 405',
      res.statusCode === 405,
      `status=${res.statusCode} allow=${res.headers['allow']}`
    );
  }
  // 6) Stringified body
  {
    const req = mockReq({
      body: JSON.stringify({ password: PASSWORD, remember: false }),
    });
    const res = mockRes();
    await authHandler(req, res);
    assert(
      'auth: stringified JSON body accepted',
      res.statusCode === 200,
      `status=${res.statusCode}`
    );
  }

  // --- /api/me ---
  // 7) No cookie
  {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await meHandler(req, res);
    assert(
      'me: no cookie → 401',
      res.statusCode === 401 && res.body && res.body.authenticated === false,
      `status=${res.statusCode} body=${JSON.stringify(res.body)}`
    );
  }
  // 8) Valid cookie
  {
    const req = mockReq({
      method: 'GET',
      headers: { cookie: global.__validCookie },
    });
    const res = mockRes();
    await meHandler(req, res);
    assert(
      'me: valid cookie → 200 authenticated=true client/expiresAt set',
      res.statusCode === 200 &&
        res.body &&
        res.body.authenticated === true &&
        res.body.client &&
        typeof res.body.expiresAt === 'number',
      `status=${res.statusCode} body=${JSON.stringify(res.body)}`
    );
  }
  // 9) Invalid token
  {
    const req = mockReq({
      method: 'GET',
      headers: { cookie: 'kodo_session=not.a.valid.jwt' },
    });
    const res = mockRes();
    await meHandler(req, res);
    assert(
      'me: invalid token → 401',
      res.statusCode === 401,
      `status=${res.statusCode}`
    );
  }
  // 10) POST method
  {
    const req = mockReq({ method: 'POST' });
    const res = mockRes();
    await meHandler(req, res);
    assert('me: POST → 405', res.statusCode === 405, `status=${res.statusCode}`);
  }

  // --- /api/logout ---
  // 11) POST clears cookie
  {
    const req = mockReq({ method: 'POST' });
    const res = mockRes();
    await logoutHandler(req, res);
    const sc = res.headers['set-cookie'] || '';
    assert(
      'logout: returns 200',
      res.statusCode === 200 && res.body && res.body.ok === true,
      `status=${res.statusCode} body=${JSON.stringify(res.body)}`
    );
    assert(
      'logout: Set-Cookie clears kodo_session (Max-Age=0)',
      /kodo_session=/.test(sc) && /Max-Age=0/.test(sc) && /HttpOnly/.test(sc),
      sc
    );
  }
  // 12) GET method
  {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await logoutHandler(req, res);
    assert(
      'logout: GET → 405',
      res.statusCode === 405,
      `status=${res.statusCode}`
    );
  }

  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  console.log(`\n${passed}/${total} tests passed`);
  process.exit(passed === total ? 0 : 1);
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
