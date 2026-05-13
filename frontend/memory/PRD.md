# KoDo Editor — PRD

## Original problem statement
Pulle https://github.com/meetmax-no/kodo-editor og les dokumentasjonen. CRA-app for å redigere strukturerte JSON-filer. Fix array-of-primitives i roten, modernisert "Soft Glass" dark theme, og en feature for å lagre redigert JSON direkte tilbake til GitHub via GitHub API med backup.

## Tech stack
- React 19, CRA 5
- Pure client-side, ingen backend, ingen DB
- Deploy: Vercel
- Tilstand i `localStorage` for bakgrunner + GitHub PAT

## Architecture
```
/app
├── public/
│   ├── clients/default.json     # branding + bakgrunner
│   └── url.json                 # liste over preset-URLer (filnavn styres av env)
├── src/
│   ├── components/
│   │   ├── GithubPushModal.{js,css}   # "Lagre til GitHub" UI (PAT + commit-flow)
│   │   ├── DiffView.js                # enkel endrings-liste (én linje per felt)
│   │   └── ...
│   ├── hooks/
│   │   ├── useBackground.js
│   │   └── useGithubSource.js   # raw-URL parser + Contents API wrapper
│   ├── App.js
│   └── App.css
├── .env / .env.example
├── vercel.json
└── DEPLOYMENT.md
```

## Vercel ENV (PÅKREVD — ingen fallback)
Begge må ha `REACT_APP_`-prefiks (CRA-krav). CRA leser ENV ved build-tid → endring krever **redeploy**.

| Navn | Verdi | Effekt |
|---|---|---|
| `REACT_APP_PUSH_GITHUB` | `true` / `false` | `true` viser "Lagre til GitHub"-knappen, alt annet skjuler den |
| `REACT_APP_NAME_URL` | f.eks. `url` | Filnavn (uten `.json`) under `/public/` for preset-URL-listen. Påkrevd — ingen fallback |

## Implemented features

### V5.0 — Soft Glass dark theme
- Dark glassmorphism, sidebar for ≥5 seksjoner, command palette (⌘K), status bar.
- Detect array-of-primitives i roten + multi-section JSON.
- Bakgrunner driftet av `/clients/default.json`.

### V5.2 — Lagre til GitHub (2026-02)
- "Lagre til GitHub"-knapp i export-section, mellom "Last ned JSON" og "Kopier til clipboard".
- Knapp aktiveres kun når kilde-URL er `raw.githubusercontent.com` + `REACT_APP_PUSH_GITHUB === 'true'`.
- Modal viser target (owner/repo, branch, path, backup-path).
- PAT lagres i `localStorage` (key `kodo-editor-github-pat-v1`); modal hopper over PAT-input når den finnes.
- **Diff-visning**: walker JSON og lister kun endrede felter — én linje per endring, format:
  `~ items[0].name   "Hjem" → "Hjemmeside"`
  Ingen kontekst, ingen linje-diff. `+` lagt til, `−` fjernet, `~` endret.
- "Lagre til GitHub"-knappen disables hvis ingen endringer mot remote.
- 2-commit flyt:
  1. GET file → fanger `sha` + originalt innhold (også basis for diff).
  2. PUT `_kodo-backups/{filename}.{ISO}.json` med originalt innhold (commit 1).
  3. PUT `{originalPath}` med redigert JSON + sha (commit 2).
- "Glem token"-lenke for å slette lagret PAT.
- Toast med commit-SHAs etter suksess.

### Bug fixes (V5.2)
- **Custom URL closure-bug**: `handleLoadJSON` tar nå optional override-URL → unngår closure-lag på `customUrl`-state.
- **`t.includes is not a function` ved Last inn**: `handleLoadJSON(overrideUrl)` ble kalt direkte fra `onClick`, slik at React sendte event-objektet som første arg. Lagt til `typeof overrideUrl === 'string'`-guard.
- **URL-parser støtter `refs/heads/`-format**: GitHub raw-URLer kan være på to former:
  - `/{owner}/{repo}/{branch}/{path}` (kort)
  - `/{owner}/{repo}/refs/heads/{branch}/{path}` (lang — som "Raw"-knappen i GitHub UI gir)
  Parseren detekterer `refs/heads/` og plukker branch + path korrekt.
- **ENV-håndtering ryddet**: `REACT_APP_PUSH_GITHUB === 'true'` (eksakt match), `REACT_APP_NAME_URL` påkrevd uten fallback. Verifiserer at CRA `REACT_APP_`-prefiks brukes.

## Data flow
- App.js sporer `loadedUrl` når en URL lastes via `handleLoadJSON`. File-upload, drag/drop og "Ny JSON" nullstiller `loadedUrl` → GitHub-knappen disabled.
- Live JSON serialiseres via `computeLiveJson()` (samme som "Last ned JSON" produserer) før push.
- Diff i modal: `current.text` (remote, fra GET) sammenlignes med `jsonString` (live state).

## API endpoints (eksternt — GitHub Contents API)
- `GET /repos/{owner}/{repo}/contents/{path}?ref={branch}` → `{sha, content (base64)}`
- `PUT /repos/{owner}/{repo}/contents/{path}` → body `{message, content (base64), branch, sha?}` → `{commit, content}`

## Test status
- Smoke + Playwright e2e: GitHub button render + disabled-tilstand verifisert.
- E2E push med mocket GitHub API: 1 GET + 2 PUT bekreftet, target/backup paths korrekte, PAT lagret etter push.
- Diff-rendering: enkelt-endring (én celle) → "1 endring" + korrekt path/before/after.
- No-change scenario: identisk remote/local → knapp disabled, label "Ingen endringer".
- Lint: ren.

## Backlog / future
- P2: Toggle for å hoppe over backup hvis brukeren ikke ønsker det (bruker har eksplisitt avvist — ikke prioritert).
- P2: Encrypt PAT i localStorage med passphrase (bruker har eksplisitt avvist).
- P2: Vis "ahead/behind" hvis remote sha har endret seg siden URL ble lastet (race condition).

## PAT — slik lager brukeren en
**Fine-grained (anbefalt):**
1. https://github.com/settings/personal-access-tokens/new
2. Repository access: "Only select repositories" → velg målrepoet
3. Permissions → Repository → **Contents: Read and write** (Metadata blir auto-Read-only)
4. Generate → kopier (`github_pat_...`)

**Klassisk:** https://github.com/settings/tokens/new → scope `repo` → Generate (`ghp_...`)

PAT lagres i nettleserens `localStorage` under key `kodo-editor-github-pat-v1`. Brukeren kan slette den via "Glem token"-lenken i modalen.

## Test credentials
N/A — appen er stateless. Bruker leverer sin egen GitHub PAT.
