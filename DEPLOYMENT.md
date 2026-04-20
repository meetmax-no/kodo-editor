# 🚀 Deployment Guide - Universal JSON Editor

## 📋 Forutsetninger

- GitHub-konto
- Vercel-konto (gratis)
- Git installert lokalt

---

## 🎯 METODE 1: Via Emergent (Enklest)

### Steg 1: Save to GitHub via Emergent

1. **I Emergent chat:**
   - Klikk på "💾 Save to GitHub" knappen i chat-input
   - Velg `meetmax-no/editor` som repo
   - Skriv commit message: "Universal JSON Editor MVP"
   - Klikk "Push"

### Steg 2: Deploy til Vercel

1. **Gå til [vercel.com](https://vercel.com)**
2. **Klikk "Add New..." → Project**
3. **Import `meetmax-no/editor` repo**
4. **Framework Preset:** Velg "Create React App"
5. **Build Settings:**
   - Build Command: `yarn build`
   - Output Directory: `build`
   - Install Command: `yarn install`
6. **Environment Variables:** (Ingen nødvendig)
7. **Klikk "Deploy"**

🎉 Ferdig! Din app vil være live på `kodo-editor.vercel.app` (eller tilpasset domene)

---

## 🎯 METODE 2: Manuelt via Git

### Steg 1: Clone Emergent workspace

```bash
# I terminalen
cd /path/to/your/projects
git clone <emergent-workspace-url>
cd json-editor
```

### Steg 2: Push til GitHub

```bash
# Legg til remote (hvis ikke allerede gjort)
git remote add origin https://github.com/meetmax-no/editor.git

# Commit og push
git add .
git commit -m "Universal JSON Editor MVP"
git push -u origin main
```

### Steg 3: Deploy til Vercel (samme som Metode 1, Steg 2)

---

## 🔧 Vercel CLI (Alternativ)

```bash
# Installer Vercel CLI
npm i -g vercel

# I prosjekt-mappen
cd /app/json-editor

# Login
vercel login

# Deploy
vercel --prod
```

---

## 📝 Custom Domene (Valgfritt)

1. **I Vercel Dashboard:**
   - Gå til prosjektet
   - Settings → Domains
   - Legg til: `kodo-editor.vercel.app` eller eget domene

2. **DNS Setup (hvis eget domene):**
   - Legg til CNAME record:
     ```
     CNAME  editor  cname.vercel-dns.com
     ```

---

## ✅ Post-Deployment Checklist

- [ ] Test URL-innlasting (GitHub raw URLs)
- [ ] Test lokal fil-opplasting
- [ ] Test alle modals (tekst, liste, ikon, farge)
- [ ] Test eksport (download + clipboard)
- [ ] Test på mobil
- [ ] Test i forskjellige nettlesere

---

## 🐛 Troubleshooting

### Problem: "Build failed"
**Løsning:** Sjekk at alle dependencies er i `package.json`

### Problem: URL-innlasting feiler (CORS)
**Løsning:** Bruk GitHub raw URLs (`raw.githubusercontent.com`)

### Problem: Modals åpner ikke
**Løsning:** Hard refresh (Ctrl+Shift+R) for å tømme cache

---

## 🔄 Oppdatering senere

```bash
# Gjør endringer i koden
git add .
git commit -m "Beskrivelse av endringer"
git push

# Vercel deployer automatisk!
```

---

## 📞 Hjelp

- Vercel docs: https://vercel.com/docs
- React docs: https://react.dev
- Emergent support: support@emergent.ai

---

**Estimert tid: 10-15 minutter** ⏱️

🎉 Lykke til med deploymenten!
