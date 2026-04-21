# Universal JSON Editor — Product Requirements Document

## Original problem statement
Build a "Universal JSON Editor" standalone web application (repo: `meetmax-no/editor`, deployed on Vercel) that lets a non-technical user safely edit nested JSON files such as `priser.json` (prislisten with a `studenttilbud` wrapper), `medisin.json`, `tjenester.json` and `apningstider.json` through a friendly React UI — then export the edited files without losing the original wrapper/structure.

Rules:
- No backend, no database. Pure static React app.
- Must be deployable to Vercel.
- UI language: Norwegian Bokmål.

## User personas
- Dentist office staff / content admins who maintain JSON config files in a GitHub repo. They must be able to load a file (from URL or local disk), edit values safely, and export a valid JSON that preserves the original structure.

## Core requirements
1. Load JSON from a URL (with presets defined in `/public/url.json`) or from a local file (with UTF-8 BOM handling).
2. Dynamically detect structure: flat array or nested with category groups (e.g. `prisliste[].pakker[]`).
3. Render each item as a row with the right input widget per field-type (text, long-text modal, number, boolean checkbox, array modal, icon picker for `ikon`, color picker for `farge`).
4. Navigate between categories with Forrige / Neste / dropdown — without losing edits.
5. Export (download or copy) preserves ALL non-array wrapper keys (e.g. `studenttilbud` in `priser.json`) and merges edits from every category.
6. Create new JSON from scratch with a 2-step wizard: pick flat vs nested, then define root-key / category-key / items-key / field-schema.

## Architecture
- Create React App at `/app/` root (for Vercel).
- Components: `TextEditModal`, `ListEditModal`, `IconPickerModal`, `ColorPickerModal`, `NewJsonModal`.
- Config: `/public/url.json` — array of `{ name, url }` preset sources.
- Styling: Linear/Notion-inspired theme in `App.css` + `NewJsonModal.css`; Inter + JetBrains Mono via Google Fonts.

## Changelog

### 2026-04-21 — Stability + New JSON + Modern UI
- **Fix (P0):** Restored missing `presetUrls` state in `App.js` → dev server back online.
- **Fix (P1):** Category-edit persistence — edits in category A now survive navigation to B and back; export includes edits from every visited category. New helper `persistCurrentPackages()` plus `loadPackagesForCategory()`.
- **Fix:** `handleAddPackage` now works when all rows of a category are deleted (falls back to schema from other categories or a blank `navn` field).
- **Feat:** `NewJsonModal` — 2-step wizard. Step 1 = Flat vs Nested choice with sample JSON preview. Step 2 = configure root/category/items keys + field list (text, longtext, number, boolean, array) + category names.
- **Feat:** Preset URL list externalised to `/public/url.json`.
- **UI:** Full theme rewrite — neutral slate palette, indigo accent (#4f46e5), dashed "Legg til pakke" button, uppercase column headers, subtle hover states, glass-morphism modal overlay, Inter font.
- **QA:** testing_agent_v3_fork — 9/9 scenarios passed (1.0).

### Earlier work (prior sessions)
- CRA app scaffold moved to `/app/` root for Vercel.
- Modal components (text/list/icon/color).
- Smart field detection, UTF-8 BOM stripping, JSON export / clipboard copy.
- Vercel deployment unblocked after wiping stale `/frontend` git history.
- README + DEPLOYMENT docs.

## Roadmap

### P1 — nice-to-have next
- Extract `parseJsonStructure(data)` helper — eliminate the duplicated detection logic in `handleLoadJSON` and `handleFileUpload`.
- Let the user override `categoryKey` / `itemsKey` when loading a JSON whose shape doesn't match the hardcoded `kategori` + `pakker|tjenester` heuristic.
- Replace `alert()` with toast notifications to match the modernized theme.
- Allow user-supplied filename on export (or derive from source URL).

### P2 — backlog
- Split `App.js` (~830 lines) into hooks: `useJsonLoader`, `useCategoryNav`, `useExport`; extract `DataTable` / `LoadPanel` components.
- Tooltip / expanded column for long text values in the table.
- Drag-and-drop reordering of items within a category.
- "Discard changes" button + dirty-state indicator.
- Undo / Redo stack.

### Future
- Push final updates to GitHub via Emergent's "Save to GitHub" so Vercel auto-deploys.

## Testing
- Last run: `/app/test_reports/iteration_1.json` — 9/9 frontend scenarios pass.
- No backend. No API. No database.

## Files of reference
- `/app/src/App.js`
- `/app/src/components/NewJsonModal.{js,css}`
- `/app/src/components/{TextEditModal,ListEditModal,IconPickerModal,ColorPickerModal}.js`
- `/app/public/url.json`
- `/app/src/App.css`, `/app/src/index.css`
