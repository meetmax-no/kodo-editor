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

## V4.0 Close-out 🎉
V4.0 shipped 2026-04-24. Adds Undo, dynamic field addition, and non-blocking field validation with invalid-count badge.

### Changelog — V4.0
- **Undo (no redo)** — snapshot-based stack (max 50 steps) captures state before every mutation. Triggered via Cmd/Ctrl+Z globally (ignored when typing in inputs) or via the ↶ Angre button in the navigation row.
- **Legg til felt (add field/column)** — button next to "Legg til rad" opens a small modal with name + type (text/longtext/number/boolean/array). New field is applied to all rows in the active section with type-appropriate default value.
- **Field validation** — non-blocking hint-based validation for hex colors, dates (YYYY-MM-DD), times (HH:MM or HH-HH), email, URL. Invalid fields get red border + ⚠ icon. Status pill shows `⚠ N` badge when there are invalid fields. User is never prevented from exporting.
- Footer bumped to V4.0.

### New files
- `/app/src/utils/fieldValidators.js`
- `/app/src/components/AddFieldModal.{js,css}`

---

## V3.0 Close-out 🎉
V3.0 shipped 2026-04-24. Complex JSON structures now fully supported via auto-detected section picker. Calender/config.json renders all 6 sections cleanly. Regression on priser.json, url.json, and tjenester.json still works.

---

## V3.0 — Complex JSON structures (DONE ✅)

### Problem
Editor was built assuming **one primary array** + optional wrapper objects. Real-world config files have richer structures that broke the assumption.

### Solution delivered
- **`detectSections()`** utility classifies each top-level key as `array-of-objects`, `dict-of-objects`, `dict-of-primitives`, `primitive`, or `nested-categories`.
- **`<SectionPicker>`** tabs auto-appear when ≥2 editable sections or when dict-of-objects / root-primitives exist. Each tab shows type-icon, name, count badge, and a dirty marker (●) for unsaved changes.
- **`<RootPrimitivesPanel>`** renders root-level scalars (`version`, `updatedAt`) in a small header panel with same dirty-highlighting as the rest.
- **Dict transformation** — `dict-of-objects` and `dict-of-primitives` are mapped to synthetic rows with a `__key` column (shown as "Nøkkel" in UI). Edits are transformed back to dicts on export/persist.
- **Pragmatic flow** — user edits one section at a time, switches tab (auto-persists current), edits next, then exports. Loading twice is fine.
- **Backwards compatible** — single-section and nested-category flows (priser.json, tjenester.json, url.json) are untouched; SectionPicker doesn't appear for them.

### Acceptance criteria — ALL MET
- [x] Calender/config.json laster inn og viser seksjonsvelger med 6 seksjoner
- [x] `taskTypes.TRACK1` er redigerbar (ikke `[object Object]`)
- [x] `backgrounds` er redigerbar
- [x] `version` og `updatedAt` kan redigeres via header-panel
- [x] Round-trip: last inn → rediger én seksjon → eksporter → alle andre seksjoner uendret
- [x] Gamle flat- og nested-filer (priser.json, tjenester.json) fungerer fortsatt uendret
- [x] `holidays` og `commercialDays` fungerer som før

### New files
- `/app/src/utils/sectionDetector.js`
- `/app/src/components/SectionPicker.{js,css}`
- `/app/src/components/RootPrimitivesPanel.{js,css}`

### Actual time spent
~60 min from start to finished testing — as predicted. 🎯

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

