# 🚀 Deployment Guide — KoDo Editor

Komplett guide for å sette opp en ny kunde-deploy på Vercel.

---

## 📦 Krav før deploy

- GitHub-konto med push-tilgang til `meetmax-no/kodo-editor`
- Vercel-konto (Pro-plan anbefalt for serverless-quota og Password Protection)
- Et ønsket passord for kunden

---

## 🎯 Steg 1: Push kode til GitHub

Bruk Emergent sin **"Save to GitHub"**-knapp i chat-input → repo `meetmax-no/kodo-editor`.

---

## 🎯 Steg 2: Generer bcrypt-hash for kundens passord

**Anbefalt (etter første deploy):** Bruk innebygd verktøy i appen.
1. Åpne din egen admin-deploy (eller lokalt dev)
2. Innstillinger → **Passord-administrasjon** → "Generer hash"
3. Skriv passord, klikk Generer, kopier hashen

**Førstegangs (før appen er deployet):**
```bash
cd kodo-editor
yarn install
yarn gen-hash
# (prompter for passord, printer hash)
```

Eksempel-output:
```
$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldKxad68LJZdL17lhWy
```

---

## 🎯 Steg 3: Generer JWT-secret

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Output (eksempel — KOPIER, ikke bruk denne):
```
a7f3b2c1d4e5f6...e2f3a4b5c6d7e8f9
```

Skal være minimum 32 tegn. Lagres som `AUTH_JWT_SECRET` i Vercel.

---

## 🎯 Steg 4: Sett opp Vercel-prosjekt

1. **Vercel Dashboard** → "Add New..." → Project
2. Importer `meetmax-no/kodo-editor`
3. **Framework Preset**: Create React App
4. **Root Directory**: `frontend` *(viktig — koden ligger i underkatalogen `/frontend`)*
5. **Build settings** (auto-detektert fra `vercel.json`):
   - Build Command: `yarn build`
   - Output Directory: `build`
   - Install Command: `yarn install`

---

## 🎯 Steg 5: Environment Variables på Vercel

Project → Settings → Environment Variables. Sett følgende:

### 🔐 Påkrevd for auth (server-side, ingen `REACT_APP_`-prefiks)

| Navn | Verdi | Notat |
|---|---|---|
| `AUTH_PASSWORD_HASH` | `$2b$12$...` (fra Steg 2) | bcrypt-hash av kundens passord |
| `AUTH_JWT_SECRET` | 64+ hex tegn (fra Steg 3) | For signering av sesjons-cookie |

### ⚙️ App-config (`REACT_APP_`-prefiks → eksponeres til frontend)

| Navn | Kunde-deploy | Admin/dev-deploy |
|---|---|---|
| `REACT_APP_NAME_URL` | `url` (eller annet filnavn) | `url` |
| `REACT_APP_NAME_CONFIG` | `default` *(eller kunde-id, f.eks. `acme`)* | `default` |
| `REACT_APP_PUSH_GITHUB` | `false` | `true` |
| `REACT_APP_SHOW_ADMIN_TOOLS` | `false` | `true` |
| `REACT_APP_AUTH_DEV_BYPASS` | `false` *(eller unset)* | `false` |

> 💡 **`REACT_APP_NAME_CONFIG`** bestemmer hvilken JSON-fil fra `/public/clients/` som leses for branding + bakgrunner. Lag en egen `/public/clients/<kunde>.json` for kunde-spesifikk konfig, og sett env-varen til kundens id.

> ⚠️ **VIKTIG**: `REACT_APP_AUTH_DEV_BYPASS=true` slår av all auth! Bruk KUN lokalt under `yarn start`.

---

## 🎯 Steg 6: Deploy

Klikk **Deploy**. Vent ~90 sek. Når deploy er ferdig:

1. Åpne deploy-URL → du skal møte login-skjermen
2. Skriv passordet du valgte i Steg 2 → kommer inn i appen ✅

---

## 🔄 Bytte passord senere

1. **Admin/dev-deploy**: Innstillinger → Passord-administrasjon → Generer ny hash
2. **Vercel Dashboard**: Settings → Environment Variables → erstatt `AUTH_PASSWORD_HASH`
3. Klikk **Save** → gå til Deployments → … på siste deploy → **Redeploy**
4. Vent ~90 sek
5. Send nytt passord til kunde via sikker kanal (Signal, kryptert epost, etc.)

Eksisterende sesjoner forblir gyldige til cookien utløper (max 2t / 30d).

For å **logge ut alle umiddelbart**: roter `AUTH_JWT_SECRET`. Alle eksisterende cookies blir ugyldige på sekundet.

---

## 🌐 Custom Domene (valgfritt)

Vercel Dashboard → prosjektet → Settings → Domains → legg til custom domene.

---

## ✅ Post-Deployment Sjekkliste

- [ ] Login-skjermen vises på prod-URL
- [ ] Riktig passord → kommer inn i appen
- [ ] Feil passord → "Feil passord"-melding (med ~1 sek delay)
- [ ] "Logg ut"-knapp i StatusBar fungerer
- [ ] "Husk meg" gir 30-dagers cookie (sjekk i DevTools → Application → Cookies)
- [ ] `REACT_APP_PUSH_GITHUB=false` skjuler "Lagre til GitHub"-knappen
- [ ] `REACT_APP_SHOW_ADMIN_TOOLS=false` skjuler Settings → Passord-administrasjon
- [ ] Test URL-innlasting (GitHub raw URLs)
- [ ] Test lokal fil-opplasting
- [ ] Test eksport (download + clipboard)

---

## 🛠️ Auth-arkitektur (kort)

```
Kundens nettleser ──HTTPS──→ Vercel
                                ├── /  → CRA static bundle
                                └── /api/auth, /api/me, /api/logout
                                       └── Node 20 serverless funksjoner
                                              ├─ bcrypt-validerer passord mot AUTH_PASSWORD_HASH
                                              └─ Signerer JWT med AUTH_JWT_SECRET → httpOnly cookie
```

- Cookie: `kodo_session`, httpOnly + Secure + SameSite=Strict
- TTL: 2 timer default, 30 dager med "Husk meg"
- Brute-force: bcrypt cost 12 (~150ms per forsøk) + 400-1200ms random delay på feil → umulig å brute-force i praksis
- Ingen DB — stateless JWT

---

## 🐛 Troubleshooting

### "Server-konfigurasjon mangler"
→ `AUTH_PASSWORD_HASH` eller `AUTH_JWT_SECRET` er ikke satt på Vercel. Sjekk Environment Variables.

### Login-skjerm vises ikke (appen er åpen)
→ `REACT_APP_AUTH_DEV_BYPASS=true` er satt på Vercel. Endre til `false` eller fjern variabelen.

### Build failer
→ Sjekk at **Root Directory** er satt til `frontend` i Vercel-prosjektinnstillinger.

### `/api/me` returnerer 500
→ Sannsynligvis `AUTH_JWT_SECRET` er for kort. Minimum 32 tegn.

### URL-innlasting feiler (CORS)
→ Bruk GitHub raw URLs (`raw.githubusercontent.com`).

---

## 📞 Hjelp

- Vercel docs: https://vercel.com/docs
- Custom domene: https://vercel.com/docs/custom-domains
- Serverless logs: Vercel Dashboard → Deployments → siste → Functions

🎉 Lykke til!
