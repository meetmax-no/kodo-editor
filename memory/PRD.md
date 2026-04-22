# KoDo-Editor — Product Requirements Document

## Original problem statement
Build a "Universal JSON Editor" standalone web application (repo: `meetmax-no/kodo-editor`, deployed on Vercel) that lets a non-technical user safely edit nested JSON files such as `priser.json` (prislisten with a `studenttilbud` wrapper), `medisin.json`, `tjenester.json`, `apningstider.json` and the app's own `url.json` through a friendly React UI — then export the edited files without losing the original wrapper/structure.

Rules:
- No backend, no database. Pure static React app.
- Deployable to Vercel, free tier.
- UI language: Norwegian Bokmål.

## User personas
- Dental office staff / content admins who maintain JSON config files in a GitHub repo. They must be able to load a file (from URL or local disk), edit values safely, and export a valid JSON that preserves the original structure.

## Core requirements (delivered)
1. ✅ Load JSON from a URL (with presets defined in `/public/url.json`) or from a local file (with UTF-8 BOM handling).
2. ✅ Dynamically detect structure: flat array or nested with category groups (e.g. `prisliste[].pakker[]`).
3. ✅ Render each item as a row with the right input widget per field-type (text, long-text modal, number, boolean checkbox, array modal, icon picker for `ikon`, color picker for `farge`).
4. ✅ Navigate between categories — edits preserved across navigation.
5. ✅ Export (download or copy) preserves ALL non-array wrapper keys (e.g. `studenttilbud` in `priser.json`).
6. ✅ Create new JSON from scratch — flat or nested wizard.
7. ✅ Edit wrapper-objects (like `studenttilbud`) via an auto-detected "Ekstra felter" panel.
8. ✅ Reorder rows with ▲/▼ buttons.
9. ✅ Dirty-state tracking with browser-close guard + confirm before discarding.

## Architecture
- Create React App at `/app/` root (for Vercel).
- Components: `TextEditModal`, `ListEditModal`, `IconPickerModal`, `ColorPickerModal`, `NewJsonModal`, `StatusModal`, `ExtraFieldsPanel`, `ConfirmModal`.
- Config: `/public/url.json` — array of `{ name, url }` preset sources, fetched with cache-busting.
- Styling: Linear/Notion-inspired; Inter + JetBrains Mono via Google Fonts.
- UX: `react-hot-toast` for notifications + custom Promise-based `ConfirmModal` for destructive actions.

---

## Changelog

### 2026-04-21 — V1.1 (Polish & UX)
- `react-hot-toast` replaces all `window.alert()` calls
- Custom `ConfirmModal` (Promise-based, `useConfirm()` hook) replaces all `window.confirm()`
- Footer version label bumped to V1.1, monochrome styling
- Pulled latest `url.json` from GitHub (now includes "JSON Editor - Default list" preset)
- Tab title set to "KoDo-Editor"

### 2026-04-21 — V1.0 (MVP shipped) 🎉
- **Stability fix** — restored missing `presetUrls` state
- **Category-edit persistence** — edits in category A survive navigation to B and back
- **NewJsonModal** — 2-step wizard for flat vs nested JSON from scratch
- **ExtraFieldsPanel** — auto-detect and edit root wrapper objects like `studenttilbud`
- **Row reordering** — ▲/▼ buttons per row (array order = export order)
- **Array-root fix** — files where root is an array (like `url.json`) export cleanly
- **Cache-busting** on both `/url.json` and remote fetches
- **Status pill + StatusModal** — compact status indicator with detail popup
- **Dirty-state tracking** — visual indicator (gul + pulserende prikk) + browser-close guard
- **Modern theme** — Linear/Notion-inspired, Inter font, slate palette
- **Footer** + rotating playful subtitle
- **Preset URLs externalised** to `/public/url.json`

### Earlier (prior sessions)
- CRA scaffolded at `/app/` root for Vercel
- Modal components (text/list/icon/color)
- Smart field detection, UTF-8 BOM stripping, JSON export / clipboard copy
- Vercel deployment unblocked

---

## V2.0 Close-out
V2.0 shipped 2026-04-21 with live JSON preview, row reordering, extra-fields panel, toast+confirm polish, and in-preview highlighting of edited values. All user requirements through this session delivered.

---

## V3.0 — Complex JSON structures (P0 — MUST fix)

### Problem
Editor was built assuming **one primary array** + optional wrapper objects. Real-world config files have richer structures that break the assumption.

### Reproducing case
`https://raw.githubusercontent.com/meetmax-no/Calender/refs/heads/main/public/config.json` exposes 3 concrete limitations:

1. **Dictionary with object values** — `taskTypes.TRACK1 = {label, icon, color, ...}` renders as `[object Object]` in an unusable input.
2. **Multiple top-level arrays** — editor picks the first (`palette`) and silently hides the rest (`backgrounds` array of 9 items is invisible).
3. **Root-level primitives** — `version` and `updatedAt` (strings on root) are preserved on export but can't be edited.

### Chosen approach: A — Section picker
Agreed direction (user + agent): add a "section picker" that detects multi-section configs and lets the user pick one section at a time to edit. Accepted trade-off: editing two sections means loading the file twice. Pragmatic over fancy.

### Implementation plan

**Detection phase** — after load, classify each top-level key into one of:
| Type | Example | Rendering mode |
|---|---|---|
| `array-of-objects` | `palette`, `backgrounds` | Dagens tabell (eksisterer) |
| `dict-of-objects` | `taskTypes` | Tabell med key-kolonne + objektfelter (ny mode) |
| `dict-of-primitives` | `holidays`, `commercialDays` | Key/value-tabell (nesten eksisterer) |
| `primitive` | `version`, `updatedAt` | Header-inputs øverst (ny mode) |

**UI changes**
- If file has ≥2 editable sections → show section picker dropdown/tabs above the category navigator
- Each section type renders with its own tailored view
- Export always rebuilds the complete original structure; unedited sections pass through untouched
- Dirty-state tracking per section (kan vise 🟡-prikk per seksjon)

**Affected files / estimated effort**
- `/app/src/App.js` — detection + routing (~10 min)
- `/app/src/components/SectionPicker.{js,css}` — NY (~10 min)
- `/app/src/components/DictObjectsTable.{js,css}` — NY for `dict-of-objects` (~15 min)
- `/app/src/components/RootPrimitivesPanel.{js,css}` — NY for root scalar fields (~5 min)
- Testing mot config.json + regresjon på priser.json (~10 min)

**Total estimate:** ~45-60 min fokusert arbeid i én økt.
_(Original estimat på 6-8 timer gjaldt manuell koding fra bunnen. Med eksisterende mønstre fra ExtraFieldsPanel, StatusModal, JsonPreviewPanel m.fl. å gjenbruke går det mye raskere.)_

### Acceptance criteria
- [ ] Calender/config.json laster inn og viser seksjonsvelger med 6 seksjoner
- [ ] `taskTypes.TRACK1` er redigerbar (ikke `[object Object]`)
- [ ] `backgrounds` er redigerbar
- [ ] `version` og `updatedAt` kan redigeres via header-panel
- [ ] Round-trip: last inn → rediger én seksjon → eksporter → alle andre seksjoner uendret
- [ ] Gamle flat- og nested-filer (priser.json, tjenester.json) fungerer fortsatt uendret
- [ ] `holidays` og `commercialDays` fungerer som før

---

## Roadmap — V2.x / V3.x backlog

### 🥇 High value, low effort
1. **Undo / Redo** (Cmd+Z / Cmd+Shift+Z) — single action-history stack, low risk
2. **Diff-visning før eksport** — "Disse feltene endret du" summary before download
3. **Husk sist brukte URL** — `localStorage` recall of last preset + section

### 🥈 Bigger features
4. **Drag-and-drop sortering** av rader (replace ▲/▼) — `@dnd-kit/core`
5. **Round-trip tests** — pytest or vitest suite that `load → edit → export → structurally-equal` for each preset (critical before V3.0 lands)
6. **Shareable URL** — gzip+base64-encode current state into URL-hash for collaboration without a backend

### 🥉 Nice-to-haves
7. **Tooltip / expanded column** for long text in tables
8. **Bulk-edit** — select multiple rows and change one field
9. **Search / filter** within a section
10. **Import JSON Schema** — validate against a `.schema.json`
11. **Export formats** — YAML / CSV in addition to JSON
12. **Keyboard shortcuts** — J/K navigation, Enter to edit, etc.

### 🔧 V4/V5 — only if needed
13. **Refactor `App.js`** into hooks + smaller components — deferred. App fungerer fint i dag; premature refactoring gir unødvendig kompleksitet. Tas opp igjen hvis kodebase-navigering eller ytelse blir et reelt problem.

---

## Files of reference
- `/app/src/App.js` — main (~1100 lines; MUST refactor before V3.0)
- `/app/src/components/NewJsonModal.{js,css}`
- `/app/src/components/StatusModal.{js,css}`
- `/app/src/components/ExtraFieldsPanel.{js,css}`
- `/app/src/components/ConfirmModal.{js,css}`
- `/app/src/components/JsonPreviewPanel.{js,css}`
- `/app/src/components/{TextEditModal,ListEditModal,IconPickerModal,ColorPickerModal}.js`
- `/app/public/url.json`
- `/app/src/App.css`, `/app/src/index.css`
- `/app/public/index.html` — title: "KoDo-Editor"

