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

## V1.0 Close-out
All core user requirements delivered. The app is production-ready for its intended use case (editing Tannlege Per's JSON files). Repository at `meetmax-no/kodo-editor`, deployed via "Save to GitHub".

---

## Roadmap — V2.0 candidates

### 🥇 High value, low effort
1. **Undo / Redo** (Cmd+Z / Cmd+Shift+Z) — single action-history stack, low risk
2. **Diff-visning før eksport** — "Disse feltene endret du" summary before download
3. **Husk sist brukte URL** — `localStorage` recall of last preset + category
4. **Live JSON preview-panel** — collapsible side-panel showing the current exportable JSON

### 🥈 Bigger features
5. **Drag-and-drop sortering** av rader (replace ▲/▼) — `@dnd-kit/core`
6. **Refactor `App.js`** (~1000 lines) into `useJsonLoader`, `useCategoryNav`, `useDirty` hooks + `<DataTable>`, `<LoadPanel>` components
7. **Custom key overrides** — when structure auto-detection fails, let user pick `categoryKey` and `itemsKey` manually in a "Avansert"-mode modal
8. **Round-trip tests** — pytest or vitest suite that `load → edit → export → structurally-equal` for each preset
9. **Shareable URL** — gzip+base64-encode current state into URL-hash for collaboration without a backend

### 🥉 Nice-to-haves
10. **Tooltip / expanded column** for long text in tables
11. **Bulk-edit** — select multiple rows and change one field
12. **Search / filter** within a category
13. **Import JSON Schema** — validate against a `.schema.json`
14. **Export formats** — YAML / CSV in addition to JSON
15. **Keyboard shortcuts** — J/K navigation, Enter to edit, etc.

---

## Files of reference
- `/app/src/App.js` — main (~1000 lines; refactor candidate)
- `/app/src/components/NewJsonModal.{js,css}`
- `/app/src/components/StatusModal.{js,css}`
- `/app/src/components/ExtraFieldsPanel.{js,css}`
- `/app/src/components/ConfirmModal.{js,css}`
- `/app/src/components/{TextEditModal,ListEditModal,IconPickerModal,ColorPickerModal}.js`
- `/app/public/url.json`
- `/app/src/App.css`, `/app/src/index.css`
- `/app/public/index.html` — title: "KoDo-Editor"
