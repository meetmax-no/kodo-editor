# KoDo Editor — PRD

## Original problem statement
Pulle https://github.com/meetmax-no/kodo-editor og les dokumentasjonen. CRA-app for å redigere strukturerte JSON-filer. Klargjøre for ny kunde-leveranse: én kodebase, flere kunder via *.json + ENV-flagg. Auth-lag uten Upstash (kost-sensitivt).

## Tech stack
- React 19, CRA 5
- Vercel Serverless Functions (Node 20) for `/api/auth`, `/api/me`, `/api/logout`
- Auth: bcryptjs (cost 12) + jose (JWT HS256)
- Pure client-side editor, ingen DB
- Deploy: Vercel (Pro-plan, men ikke krevd for auth)
- Tilstand i `localStorage` for bakgrunner + GitHub PAT (eksisterende)

## Architecture
```
/app/frontend/                    ← Vercel root directory
├── api/                          ← Serverless funksjoner (Node 20, ESM via .mjs)
│   ├── auth.mjs                  POST /api/auth — bcrypt + signed cookie
│   ├── me.mjs                    GET /api/me — verifiser cookie
│   ├── logout.mjs                POST /api/logout — rydd cookie
│   └── _lib/session.mjs          jose JWT + cookie helpers
├── public/
│   ├── clients/
│   │   ├── default.json          branding + bakgrunner (default deploy)
│   │   └── <kunde>.json          per-kunde branding/bakgrunner (REACT_APP_NAME_CONFIG)
│   └── url.json                  preset-URLer (REACT_APP_NAME_URL bytter til url-<kunde>.json)
├── scripts/
│   └── gen-hash.js               CLI: bcrypt-hash for AUTH_PASSWORD_HASH
├── src/
│   ├── components/
│   │   ├── AuthGate.js           Wrapper rundt App (checking|auth|unauth)
│   │   ├── Login.js + .css       Branded login (KoDo Editor + kundenavn)
│   │   ├── PasswordAdminPanel.js Hash-generator + JWT-secret-gen (Settings)
│   │   ├── SettingsModal.js      Faner: Generelt (Tema + Bakgrunn + meta) / Sikkerhet
│   │   ├── CategoryMenu.js       Kategori-handlinger (rename/add/move/delete)
│   │   ├── PresetDropdown.js     Custom dark dropdown (URL/kategori-velger)
│   │   ├── StatusBar.js          Logout-knapp
│   │   ├── GithubPushModal.js
│   │   ├── DiffView.js
│   │   └── ...
│   ├── hooks/
│   │   ├── useAuth.js            login/logout/status mot /api
│   │   ├── useBackground.js      Henter /clients/<x>.json, bakgrunns-rotasjon
│   │   ├── useTheme.js           Hardkodet tema-velger (Mørk/Lys/Blå/Oransje)
│   │   └── useGithubSource.js
│   ├── themes.js                 APP_VERSION + THEMES-konstant + utils
│   ├── App.js                    (mottar `auth`-prop fra AuthGate)
│   ├── index.js                  (wrapper App i AuthGate)
│   └── App.css
├── .env / .env.example
├── vercel.json
└── DEPLOYMENT.md                 ← komplett Vercel-oppsett
```

## Vercel ENV

### 🔐 Påkrevd for auth (server-side, ingen REACT_APP_-prefiks)
| Navn | Verdi | Beskrivelse |
|---|---|---|
| `AUTH_PASSWORD_HASH` | `$2b$12$...` | bcrypt-hash av passord (kunde-spesifikk) |
| `AUTH_JWT_SECRET` | 32+ hex tegn | For signering av sesjons-cookie |

### ⚙️ App-config (REACT_APP_-prefiks → eksponert til frontend)
| Navn | Kunde-deploy | Admin-deploy | Lokal dev |
|---|---|---|---|
| `REACT_APP_NAME_URL` | `url` | `url` | `url` |
| `REACT_APP_PUSH_GITHUB` | `false` | `true` | `true` |
| `REACT_APP_SHOW_ADMIN_TOOLS` | `false` | `true` | `true` |
| `REACT_APP_AUTH_DEV_BYPASS` | unset/`false` | unset/`false` | `true` |

## Implemented features

### V5.0 — Soft Glass dark theme
- Dark glassmorphism, sidebar for ≥5 seksjoner, command palette (⌘K), status bar.
- Detect array-of-primitives i roten + multi-section JSON.
- Bakgrunner driftet av `/clients/default.json`.

### V5.2 — Lagre til GitHub (2026-02)
- "Lagre til GitHub"-knapp i export-section.
- 2-commit flyt: backup → update. SHA-tracking. Diff-modal med inline endringsliste.
- PAT i `localStorage` (`kodo-editor-github-pat-v1`).
- Skjult når `REACT_APP_PUSH_GITHUB !== 'true'`.

### V6.0 — Branded password auth (2026-05) ✨
**Auth-arkitektur:**
- Stateless JWT (HS256, jose) i httpOnly + Secure + SameSite=Strict cookie (`kodo_session`).
- 2 timer default TTL, 30 dager med "Husk meg" checkbox.
- bcryptjs cost 12 (~150ms/forsøk) + 400-1200ms random delay → brute-force-resistent.
- "Logg ut alle" gratis: roter `AUTH_JWT_SECRET` → alle cookies ugyldige.

**Endepunkter (Vercel serverless):**
- `POST /api/auth` — body `{password, remember?}` → 200 + Set-Cookie eller 401.
- `GET /api/me` — cookie → 200 `{authenticated, client, expiresAt}` eller 401.
- `POST /api/logout` — alltid 200 + Set-Cookie med Max-Age=0.

**Login UI (`/components/Login.js`):**
- Branded med "KoDo Editor" + kundenavn fra `clients/default.json`.
- Passord-felt med 👁/🙈 toggle (show/hide).
- "Husk meg i 30 dager" checkbox.
- Soft Glass-design som matcher resten av appen.
- Feilmelding inline (rødt banner med shake-animasjon).

**Lokal dev:**
- `REACT_APP_AUTH_DEV_BYPASS=true` → `useAuth` returnerer alltid `authenticated` uten å kalle `/api/me`.
- Brukes kun lokalt under `yarn start` siden Vercel serverless ikke kjører i CRA dev-server.
- MÅ være `false`/unset på prod.

**Logout:**
- Knapp i StatusBar (data-testid=statusbar-logout-btn), skjult under DEV_BYPASS.
- Klikk → `POST /api/logout` → `useAuth.status = 'unauthenticated'` → Login vises igjen.

**Passord-administrasjon (Settings → PasswordAdminPanel):**
- Synlig kun når `REACT_APP_SHOW_ADMIN_TOOLS=true`.
- **Hash-generator**: bcryptjs i browser (cost 12), passord forlater aldri maskinen.
  - Bekreft-felt (matching-validering).
  - Resultat i readonly textarea + "Kopier hash"-knapp.
  - Advarsel "Lukk dette vinduet når du er ferdig".
  - Steg-for-steg-instruksjoner for Vercel ENV-bytte.
- **Hash-tester**: lim inn hash + passord → ✅ match eller ❌ nomatch.
- Øye-toggle på alle passord-felt.

**CLI backup**: `yarn gen-hash` eller `node scripts/gen-hash.js <passord>` for terminal-flow.

## Data flow
- AuthGate (root wrapper) sjekker `/api/me` ved mount → renderer Login eller App.
- App mottar `auth`-prop → videresender til StatusBar (`onLogout`, `showLogout`).
- Editor-state (eksisterende V5.x flyt) er uendret.

## API endpoints (interne — Vercel serverless)
| Metode | Path | Body | Respons |
|---|---|---|---|
| POST | `/api/auth` | `{password, remember?}` | 200 `{ok,client,expiresIn}` + Cookie / 401 / 400 |
| GET | `/api/me` | – | 200 `{authenticated,client,expiresAt}` / 401 |
| POST | `/api/logout` | – | 200 `{ok}` + cookie-clear |

## API endpoints (eksternt — GitHub Contents API)
- `GET /repos/{owner}/{repo}/contents/{path}?ref={branch}` → `{sha, content}`
- `PUT /repos/{owner}/{repo}/contents/{path}` → `{message, content, branch, sha?}` → `{commit, content}`

## Test status (V6.0)
- ✅ /api/auth: feil passord (401, ~1s delay), riktig passord (200 + cookie), husk-meg (TTL 30d), manglende felt (400), GET (405)
- ✅ /api/me: gyldig cookie (200), ingen cookie (401), ugyldig token (401)
- ✅ /api/logout: 200 + Set-Cookie Max-Age=0
- ✅ Login UI: branded m/ kundenavn, alle data-testids, eye-toggle, remember checkbox, error shake
- ✅ DEV_BYPASS=true: app rendres direkte, logout-knapp skjult, Lagre til GitHub synlig, Settings åpner
- ✅ PasswordAdminPanel: hash-gen ($2b$12$...), bekreft-validering, copy-knapp, advarsel
- ✅ HashTester: match ✅ / nomatch ❌
- ✅ gen-hash CLI: produserer gyldig bcrypt-hash
- ✅ Eksisterende V5.x funksjonalitet: uendret (JSON load, edit, export, GitHub push)

100% success rate på alle tester (frontend + serverless handlers).

## Test credentials
Se `/app/memory/test_credentials.md` — test passord `test-passord-123`, hash satt som `AUTH_PASSWORD_HASH`. Produksjonspassord settes av admin via PasswordAdminPanel eller `yarn gen-hash`.

## Deployment
Se `/app/frontend/DEPLOYMENT.md` for komplett Vercel-setup (Root Directory=`frontend`, ENV-tabeller for admin vs kunde-deploy, troubleshooting).

## Backlog / future
- P2: Per-IP rate-limiting via Vercel KV eller Upstash (avvist pga kost).
- P2: Logging av mislykkede login-forsøk (kun console.log i prod nå — Vercel-logs gir basic sporbarhet).
- P2: Multi-tenant — JWT-payload har allerede `client`-felt; støtte `AUTH_PASSWORD_HASH_<client>` + `?client=acme` URL-param.
- P2: Rolling session (forleng cookie på hver request) — for nå er det fast TTL.
- P2: Sesjon-utløp midt i bruk → toast + redirect (nå: 401 ved neste request, brukeren må re-logge).
- P3: Toggle for backup-skip ved GitHub push (bruker avvist).
- P3: Encrypt PAT i localStorage med passphrase (bruker avvist).

## Hva ble levert i denne sesjonen (2026-05-13)
- ✅ Pullet og verifisert kodo-editor v5.2 i /app/frontend
- ✅ Implementert komplett auth-lag (3 serverless endepunkter, AuthGate, Login, useAuth)
- ✅ Branded login matchende app-stil (Soft Glass dark, "KoDo Editor" + kundenavn)
- ✅ Husk meg checkbox (30 dager)
- ✅ Eye-toggle på alle passord-felt
- ✅ Logout-knapp i StatusBar
- ✅ PasswordAdminPanel i Settings: hash-gen + hash-tester + JWT-secret-gen (admin-only via env-flag)
- ✅ CLI backup `yarn gen-hash`
- ✅ Oppdatert DEPLOYMENT.md med komplett Vercel-setup
- ✅ Fullstendig e2e-testet, 100% success

## Patches etter første deploy (2026-05-13, samme sesjon)
- ✅ Bedre 500-feilmeldinger med error codes (MISSING_HASH, INVALID_HASH, MISSING_JWT_SECRET, JWT_TOO_SHORT, INTERNAL). Admin-modus viser detaljer; kunde får generisk melding.
- ✅ Login bakgrunn arver app-bakgrunn via AuthGate-`useBackground(null)` — ikke lenger hardkodet svart
- ✅ Login-kortet bruker `var(--glass-strong)` / `backdrop-filter: blur(20px) saturate(140%)` — samme glass-stil som resten av appen
- ✅ Innebygd JWT-secret-generator (crypto.getRandomValues, 32/48/64 bytes)
- ✅ **Fikset Vercel deploy-error (runde 1)**: `jose v6` er ESM-only og kunne ikke `require()`-es. Konvertert hele `/api/`-mappa til ESM.
- ✅ **Fikset Vercel deploy-error (runde 2)**: `{"type":"module"}` i `api/package.json` + `.js`-extension kolliderte med Vercel build-pipeline (transpilert CJS-output mens Node forventet ESM → "exports is not defined"). Løsning: brukt `.mjs`-extension direkte (`auth.mjs`, `me.mjs`, `logout.mjs`, `_lib/session.mjs`) → utvetydig ESM uten transpilering. Fjernet `api/package.json`.
- ✅ **Fjernet hash-tester**: Vercel ENV-vars markert "Sensitive" (default + best practice) er ikke lesbare etter save → ingen måte å sammenligne mot stored hash → testeren hadde ingen reell nytteverdi.
- ✅ **Settings-faner**: SettingsModal delt i to faner — "Generelt" (config-info + bakgrunn) og "Sikkerhet" (Auth-secrets). Sikkerhet-fanen vises kun når `REACT_APP_SHOW_ADMIN_TOOLS=true`. Modalen er nå kortere og mer logisk strukturert.
- ✅ **Multi-tenant via `REACT_APP_NAME_CONFIG`**: Samme mønster som `REACT_APP_NAME_URL`. Default-verdi `default` → `/clients/default.json`. Multi-tenant: sett til kundens id (f.eks. `acme`) → leser `/clients/acme.json`. Påvirker både `useBackground`-hook og Login-skjermens branding-fetch.
- ✅ **Login-styling**: Branding-felt hentet fra `clients/<x>.json`:
  - Stor tittel = `brand.name`
  - Subtittel = `_meta.createdBy`
  - Footer = `_meta.client · brand.tagline · APP_VERSION`
- ✅ **Versjons-konstant**: `APP_VERSION` sentralisert i `themes.js` (`v6.0`). Brukes i topbar og login.
- ✅ **Kategori-administrasjon**: Ny `CategoryMenu`-komponent (⋯-ikon ved siden av kategori-dropdown). Støtter:
  - ✏️ Endre navn (inline tekst-input)
  - ➕ Ny kategori (auto-switcher til ny)
  - ↑↓ Flytt opp/ned
  - 🗑 Slett (med bekreftelse via `useConfirm`)
  - Setter `isDirty=true` på alle mutasjoner
  - Synlig kun når `jsonStructure.hasCategories` (multi-section JSON med `kategori`-felt)
- ✅ **Fikset tabell-overskrift**: Tidligere hardkodet til "Pakker i ..." — nå bruker faktisk `itemsKey` fra JSON (f.eks. "Tjenester i ..." for tannlege-per).

## V6.1 — Whitelabel-polish (2026-05, fork-sesjon)
Tema-velger og dynamisk H1 slik at samme kodebase kan deployes til flere kunder uten visuell "KoDo Editor"-branding i selve editoren.

### CategoryMenu visuell tilpasning
- Trigger-knapp og popover speiler nå `PresetDropdown`-stilen: høyde 40px, border-radius 10px, glass-bakgrunn `rgba(255,255,255,0.03)`, accent-glow ved fokus/aktiv.
- Chevron byttet til samme ▾-tegn som dropdown ved siden av for pixel-match.
- Ikoner (pen/plus/pil/trash) beholdt inne i menyvalgene.
- Light-tone-overrides oppdatert tilsvarende.
- Filer: `src/components/CategoryMenu.js`, `src/components/CategoryMenu.css`.

### Dynamisk H1 + browser-tab-tittel
- Hardkodet `"Universal JSON Editor"` + tilfeldig undertittel fjernet.
- H1 leser nå `bg.config?._meta?.client` → `"{kunde} — Innholdsredigering"` (fallback: `"Ko | Do Consult — Innholdsredigering"`).
- Browser `document.title` settes via `useEffect` når clients/<x>.json er lastet — samme mønster.
- `SUBTITLES`-array, `randomSubtitle`-helper og `subtitle`-state slettet fra `App.js`.
- Favicon urørt — brukerønske.
- Filer: `src/App.js`.

### Tema-velger (hardkodet, uavhengig av bakgrunn)
- Ny `THEMES`-konstant i `themes.js` med 4 valg:
  - **Mørk** — `tone: dark`, accent `#FBBF24` (amber, default)
  - **Lys** — `tone: light`, accent `#F59E0B`
  - **Blå** — `tone: dark`, accent `#60A5FA`
  - **Oransje** — `tone: dark`, accent `#FB923C`
- Hver tema definerer `accent` + `accentSoft` + `accentGlow` for CSS-vars.
- Ny `hooks/useTheme.js` — setter `.theme-<id>` + `.tone-<light|dark>` på `<html>`. Persisterer i `localStorage` (`kodo-editor-theme-v1`).
- **Viktig endring:** tone-light styres nå av tema, IKKE bakgrunnens `tone`-felt. Bakgrunn = wallpaper, tema = panel-tone + accent.
- CSS: `.theme-dark`/`.theme-light`/`.theme-blue`/`.theme-orange` i `src/index.css` overstyrer `--accent`/`--accent-soft`/`--accent-glow`/`--warn`/`--warn-soft`.
- UI: Ny "Tema"-seksjon over "Bakgrunn" i SettingsModal Generelt-fane. Fargesirkel + label i pill-form. `data-testid="theme-pill-{id}"`.
- Filer: `src/themes.js`, `src/hooks/useTheme.js` (ny), `src/App.js`, `src/index.css`, `src/components/SettingsModal.js`, `src/components/SettingsModal.css`.

### Verifisert
- Lint OK på alle endrede filer.
- Smoke-test via Playwright: H1 viser `"Ko | Do Consult — Innholdsredigering"`, Innstillinger åpnes, klikk på "Blå"-pill kjører uten feil.
- Bruker bekreftet visuelt at CategoryMenu nå matcher dropdown.

### Klar for deploy
Brukeren håndterer per-kunde-filer (`public/clients/<kunde>.json` + `public/url-<kunde>.json`) selv ifm. Vercel-deploy. Ingen kode-endringer trengs per kunde — kun env-vars `REACT_APP_NAME_CONFIG` og `REACT_APP_NAME_URL`.


