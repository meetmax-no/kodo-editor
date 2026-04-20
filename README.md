# 🔧 Universal JSON Editor

En kraftig, brukervennlig JSON-editor for å redigere strukturerte JSON-filer via et visuelt grensesnitt.

## ✨ Features

### 📥 Innlasting
- **Fra URL** - Last inn JSON direkte fra GitHub eller annen URL
- **Lokal fil** - Last opp JSON-filer fra disk
- **Forhåndslagrede URL-er** - Rask tilgang til ofte brukte filer

### 🎨 Smart Felt-Håndtering
- **Korte tekster** - Inline redigering
- **Lange tekster** - Modal med textarea
- **Arrays** - Liste-editor med legg til/slett
- **Boolean** - Checkbox
- **Ikoner** - Ikon-velger med 50+ ikoner
- **Farger** - Color picker med hex-input og visuell velger

### 🗂️ Kategori-Navigering
- Støtter både flat og nested JSON-strukturer
- Forrige/Neste-knapper
- Dropdown for rask navigering

### 💾 Eksport
- **Last ned JSON** - Eksporter til fil
- **Kopier til clipboard** - Rask kopiering

## 🚀 Kom i gang

### Installasjon

```bash
# Clone repo
git clone https://github.com/meetmax-no/editor.git
cd editor

# Installer dependencies
yarn install

# Start dev server
yarn start
```

Åpner på `http://localhost:3000`

### Produksjon

```bash
# Bygg for produksjon
yarn build

# Output: /build mappen
```

## 📖 Bruk

1. **Last inn JSON:**
   - Velg fra forhåndslagrede URL-er
   - Eller skriv inn custom URL
   - Eller last opp lokal fil

2. **Rediger:**
   - Inline-felt: Skriv direkte i tabellen
   - Komplekse felt: Klikk på "Rediger"-knappen
   - Arrays: Legg til/slett items i liste-editor
   - Farger: Velg farge visuelt eller skriv hex

3. **Eksporter:**
   - Klikk "💾 Last ned JSON"
   - Eller "📋 Kopier til clipboard"

## 🏗️ Arkitektur

```
/json-editor
  /src
    /components
      - TextEditModal.js      # Lang tekst-editor
      - ListEditModal.js      # Array-editor
      - IconPickerModal.js    # Ikon-velger
      - ColorPickerModal.js   # Farge-velger
      - Modal.css            # Modal styling
    - App.js                 # Hovedkomponent
    - App.css               # Styling
    - index.js
    - index.css
  - package.json
  - README.md
```

## 🛠️ Teknologi

- **React 18** - UI framework
- **CSS3** - Styling (ingen eksterne CSS frameworks)
- **HTML5 APIs** - File reader, clipboard, color input

## 📝 Støttede JSON-strukturer

### Flat struktur
```json
{
  "items": [
    { "id": 1, "name": "Item 1" },
    { "id": 2, "name": "Item 2" }
  ]
}
```

### Nested struktur (med kategorier)
```json
{
  "categories": [
    {
      "kategori": "Category 1",
      "pakker": [
        { "id": 1, "name": "Item 1" }
      ]
    }
  ]
}
```

### Direkte array
```json
[
  { "id": 1, "name": "Item 1" },
  { "id": 2, "name": "Item 2" }
]
```

## 🔒 Sikkerhet

- Ingen data sendes til server
- Alt kjører i nettleseren (client-side)
- Ingen external API-kall (utenom JSON-innlasting fra URL)

## 🌐 Deployment

Se [DEPLOYMENT.md](./DEPLOYMENT.md) for detaljerte instruksjoner.

## 📄 Lisens

MIT

## 👨‍💻 Utviklet av

Emergent AI - 2026
