# 🔧 Universal JSON Editor

En kraftig, brukervennlig JSON-editor for å redigere strukturerte JSON-filer via et visuelt grensesnitt. **Desktop-app** (min. 1024px bredde).

## ✨ Features

### 📥 Innlasting
- **Fra URL** - Last inn JSON direkte fra GitHub eller annen URL
- **Lokal fil** - Last opp JSON-filer fra disk
- **Drag & Drop** - Dra og slipp .json-filer rett inn i appen
- **Forhåndslagrede URL-er** - Rask tilgang til ofte brukte filer

### 🎨 Smart Felt-Håndtering
- **Korte tekster** - Inline redigering
- **Lange tekster** - Modal med textarea
- **Arrays** - Liste-editor med legg til/slett
- **Boolean** - Checkbox
- **Ikoner** - Ikon-velger med 50+ ikoner
- **Farger** - Color picker med hex-input og visuell velger
- **Rot-arrays** (V4.1) - Arrays-av-primitiver på rot-nivå (f.eks. `emojiPresets`) vises som chips med list-editor

### 🗂️ Kategori-Navigering
- Støtter både flat og nested JSON-strukturer
- Forrige/Neste-knapper
- Dropdown for rask navigering
- Multi-section mode (V3.0): Egne tabs for hver redigerbar seksjon

### 🔍 Søk & Filter (V4.1)
- Live filter på alle felter i hovedtabellen
- Fungerer på tekst, tall, arrays og objekter
- Treff-teller viser hvor mange rader som matcher

### ⏱️ Undo / Redo (V4.1)
- **Cmd/Ctrl+Z** for angre (opp til 50 steg)
- **Cmd/Ctrl+Shift+Z** for gjenopprett

### 📋 Rad-handlinger
- Legg til rad
- Legg til felt/kolonne (V4.0)
- **Dupliser rad** (V4.1)
- Flytt opp/ned
- Slett (med bekreftelse)

### 💾 Eksport
- **Last ned JSON** - Eksporter til fil
- **Kopier til clipboard** - Rask kopiering
- **Live JSON-preview** - Splittvisning med gul highlight på endrede felter

## 🚀 Kom i gang

### Installasjon

```bash
# Clone repo
git clone https://github.com/meetmax-no/kodo-editor.git
cd kodo-editor

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
   - Eller last opp lokal fil (klikk eller dra-og-slipp)

2. **Rediger:**
   - Inline-felt: Skriv direkte i tabellen
   - Komplekse felt: Klikk på "Rediger"-knappen
   - Arrays: Legg til/slett items i liste-editor
   - Farger: Velg farge visuelt eller skriv hex
   - Søk: Bruk søkefeltet over tabellen for å filtrere rader
   - Angre: Cmd/Ctrl+Z (eller knapp i navigasjon)

3. **Eksporter:**
   - Klikk "💾 Last ned JSON"
   - Eller "📋 Kopier til clipboard"

## 🏗️ Arkitektur

```
/kodo-editor
  /src
    /components
      - TextEditModal.js      # Lang tekst-editor
      - ListEditModal.js      # Array-editor
      - IconPickerModal.js    # Ikon-velger
      - ColorPickerModal.js   # Farge-velger
      - NewJsonModal.js       # Lag JSON fra scratch
      - StatusModal.js        # Struktur-status
      - AddFieldModal.js      # V4.0 — legg til kolonne
      - ConfirmModal.js       # Bekreft-dialog (hook)
      - ExtraFieldsPanel.js   # Rot-objekter ved siden av main array
      - JsonPreviewPanel.js   # Live JSON med highlight
      - SectionPicker.js      # V3.0 — multi-section navigator
      - RootPrimitivesPanel.js# V3.0/V4.1 — rot-primitiver + arrays
    /utils
      - sectionDetector.js    # Klassifiser top-level keys
    - App.js                  # Hovedkomponent
    - App.css                 # Styling
    - index.js
    - index.css
  - package.json
  - README.md
```

## 🛠️ Teknologi

- **React 19** - UI framework
- **CSS3** - Styling (ingen eksterne CSS frameworks)
- **HTML5 APIs** - File reader, clipboard, color input, drag-drop

## 📝 Støttede JSON-strukturer

### Flat struktur
```json
{
  "items": [
    { "id": 1, "name": "Item 1" }
  ]
}
```

### Nested struktur (med kategorier)
```json
{
  "categories": [
    {
      "kategori": "Category 1",
      "pakker": [{ "id": 1, "name": "Item 1" }]
    }
  ]
}
```

### Multi-section (V3.0)
```json
{
  "version": "1.0",
  "demoMode": true,
  "emojiPresets": ["☎️", "📄", "📩"],
  "taskTypes": { "TRACK1": { "color": "red" } },
  "palette": [{ "name": "Rosa", "hex": "#EC4899" }],
  "holidays": { "2026-01-01": "Nyttårsdag" }
}
```

### Direkte array
```json
[
  { "id": 1, "name": "Item 1" }
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

Emergent AI — KO · DO · CONSULT
