/**
 * useGithubSource — parser for raw.githubusercontent.com URL-er + tynne wrappere
 * rundt GitHub Contents API for to-commit push (backup + overskriv).
 *
 * Designet kun for raw-URLer på formen:
 *   https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{...path}/{file}.json
 *
 * Andre kilder (lokal fil, jsdelivr, etc.) returnerer parsed=null →
 * GitHub-knappen blir disablet.
 */

const PAT_STORAGE_KEY = 'kodo-editor-github-pat-v1';
const RAW_HOST = 'raw.githubusercontent.com';
const API_BASE = 'https://api.github.com';

export function parseGithubRawUrl(url) {
  if (!url || typeof url !== 'string') return null;
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.hostname !== RAW_HOST) return null;
  // Pathname kan være på to formater:
  //   /{owner}/{repo}/{branch}/{...path}
  //   /{owner}/{repo}/refs/heads/{branch}/{...path}
  const segments = u.pathname.split('/').filter(Boolean);
  if (segments.length < 4) return null;
  const [owner, repo, ...rest] = segments;
  let branch;
  let pathParts;
  if (rest[0] === 'refs' && rest[1] === 'heads' && rest.length >= 4) {
    branch = rest[2];
    pathParts = rest.slice(3);
  } else {
    branch = rest[0];
    pathParts = rest.slice(1);
  }
  if (!branch || pathParts.length === 0) return null;
  const path = pathParts.join('/');
  const filename = pathParts[pathParts.length - 1] || '';
  return { owner, repo, branch, path, filename };
}

export function readStoredPat() {
  try {
    return localStorage.getItem(PAT_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function writeStoredPat(pat) {
  try {
    if (pat) localStorage.setItem(PAT_STORAGE_KEY, pat);
    else localStorage.removeItem(PAT_STORAGE_KEY);
  } catch {
    /* quota — ignorer */
  }
}

export function clearStoredPat() {
  writeStoredPat('');
}

// Base64-koding som tåler full UTF-8 (emojis i JSON osv.)
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function authHeaders(pat) {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function ghJson(res) {
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  if (!res.ok) {
    const msg = body?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

// GET innhold + sha for en eksisterende fil. Returnerer null hvis 404.
export async function getFile({ owner, repo, branch, path, pat }) {
  const url = `${API_BASE}/repos/${owner}/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers: authHeaders(pat) });
  if (res.status === 404) return null;
  return ghJson(res);
}

// Hent gjeldende fil + dekod base64 → tekst. Brukes til diff og backup.
export async function fetchCurrentFile({ parsed, pat }) {
  const current = await getFile({ ...parsed, pat });
  if (!current) {
    throw new Error(
      `Fant ikke ${parsed.path} på ${parsed.owner}/${parsed.repo}@${parsed.branch}. ` +
      `Sjekk at branch og sti stemmer.`
    );
  }
  const rawB64 = (current.content || '').replace(/\n/g, '');
  let text = '';
  try {
    const bin = atob(rawB64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    text = new TextDecoder().decode(bytes);
  } catch {
    text = '';
  }
  return { sha: current.sha, text, raw: current };
}

// PUT — opprett eller oppdater en fil (commit). sha=null → opprett.
export async function putFile({
  owner, repo, branch, path, contentString, message, sha = null, pat,
}) {
  const url = `${API_BASE}/repos/${owner}/${repo}/contents/${encodeURI(path)}`;
  const body = {
    message,
    content: utf8ToBase64(contentString),
    branch,
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...authHeaders(pat), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return ghJson(res);
}

// ISO-timestamp egnet for filnavn (kolon → bindestrek)
export function backupTimestamp(d = new Date()) {
  return d.toISOString().replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z');
}

export function buildBackupPath(parsed, ts) {
  return `_kodo-backups/${parsed.filename}.${ts}.json`;
}

/**
 * To-commit push når current allerede er hentet (via fetchCurrentFile).
 *  1. PUT backup på `_kodo-backups/{filename}.{ts}.json` (commit 1)
 *  2. PUT oppdatert fil med originalSha (commit 2)
 *
 * onProgress(stage) kalles ved 'backup' | 'update' | 'done'.
 */
export async function commitTwoStep({
  parsed,
  current,
  newJsonString,
  commitMessage,
  pat,
  onProgress = () => {},
}) {
  if (!parsed) throw new Error('Kilden er ikke en GitHub raw-URL.');
  if (!pat) throw new Error('Mangler GitHub Personal Access Token.');
  if (!current?.sha) throw new Error('Mangler nåværende sha — hent fil først.');

  const ts = backupTimestamp();
  const backupPath = buildBackupPath(parsed, ts);

  onProgress('backup');
  const backupRes = await putFile({
    owner: parsed.owner,
    repo: parsed.repo,
    branch: parsed.branch,
    path: backupPath,
    contentString: current.text || '',
    message: `chore(kodo): backup ${parsed.filename} @ ${ts}`,
    pat,
  });

  onProgress('update');
  const updateRes = await putFile({
    owner: parsed.owner,
    repo: parsed.repo,
    branch: parsed.branch,
    path: parsed.path,
    contentString: newJsonString,
    message: commitMessage,
    sha: current.sha,
    pat,
  });

  onProgress('done');
  return {
    backupPath,
    backupCommit: backupRes?.commit?.sha || null,
    updateCommit: updateRes?.commit?.sha || null,
    backupHtmlUrl: backupRes?.content?.html_url || null,
    updateHtmlUrl: updateRes?.content?.html_url || null,
  };
}

/**
 * Full to-commit push (legacy hjelper — fetcher + commiter i én).
 */
export async function pushToGithub({
  parsed, newJsonString, commitMessage, pat, onProgress = () => {},
}) {
  onProgress('fetching');
  const current = await fetchCurrentFile({ parsed, pat });
  return commitTwoStep({
    parsed, current, newJsonString, commitMessage, pat, onProgress,
  });
}
