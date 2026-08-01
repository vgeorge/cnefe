# CNEFE logradouros — standalone reference app (spec)

Date: 2026-07-31. Branch: `feat/logradouros-id-prototype`.

## Decision (settled)
Pivot to a **standalone static web app** used *beside* any OSM editor. The mapper
compares CNEFE street names against their editor and copies names across.
**Drop the in-editor track entirely** (no iD custom-data, no editor-layer-index,
no raster, no server, no worker).

Why: iD can't read PMTiles ([iD#9480]) and can't style/label custom vector data
([iD#9863]) — so an *in-editor* CNEFE layer would need raster + a server, which we
don't want. A standalone vector app is the one shape where PMTiles is exactly right:
features are clickable and labels render natively. IBGE does serve the faces
nationwide via WMS (`CGMAT:qg_2022_800_facelogradouro__v00prelim`) but lines-only,
and its WAF rejects inline-SLD labeling — so that path can't show names either.

[iD#9480]: https://github.com/openstreetmap/iD/issues/9480
[iD#9863]: https://github.com/openstreetmap/iD/issues/9863

## Stack (unchanged)
React/Vite + `maplibre-gl` + `pmtiles`. `national.pmtiles` read via `pmtiles://`
(`VITE_PMTILES_URL`). OpenFreeMap **Positron** basemap. Nominatim search. Zoom HUD.

## Feature 1 — swipe compare slider
Two stacked, position-synced MapLibre maps:
- **base** (bottom): Positron only.
- **overlay** (top): Positron + CNEFE line + label layers.
- A draggable **vertical divider** clips the overlay via CSS `clip-path`
  (`inset(0 calc(100% - Xpx) 0 0)`) so **left = CNEFE + base, right = base only**.
- Divider starts at 50%; drag to move; handle is a distinct element (its pointer
  events don't pan the map).
- Maps stay in sync on `move` (center/zoom/bearing/pitch) with a reentrancy guard.
- All interaction (pan/zoom, NavigationControl, search marker, hover, click-to-copy)
  lives on the **overlay** map; the base map just follows.
- Note: `clip-path` hides pixels only — pointer events still reach the overlay right
  of the divider, so click-to-copy works across the whole map. That's intended.

## Feature 2 — click-to-copy (OSM-style name)
- **Wide hit line**: an invisible line layer (transparent, ~12px) over the
  logradouros so thin streets are easy to target.
- **Hover**: on `mousemove`, `queryRenderedFeatures` on the hit layer → put the
  hovered feature's geometry into a dedicated **highlight** GeoJSON source (a bright
  thick line). Cursor → pointer. (Use a highlight source, not feature-state — MVT
  feature ids aren't guaranteed.)
- **Click**: nearest feature's `name` → `toOsmCase()` → `navigator.clipboard
  .writeText` → toast **`copiado ✓ <name>`**. `http://localhost` is a secure context,
  so the Clipboard API works. Unnamed faces (empty `name`) → toast `sem nome`,
  copy nothing.
- UI framing: the OSM-style output is a **suggestion to eyeball**, not blind-paste
  (IBGE casing/accents aren't authoritative). A small hint conveys this.

## Feature 3 — OSM-style casing util
`src/lib/osmCase.js` → `toOsmCase(raw: string): string`
- Trim + collapse internal whitespace.
- Title-case each word; **minor words** stay lowercase unless first word:
  `de, da, do, das, dos, e`.
- All-digit tokens preserved (`13` → `13`): `RUA 13 DE MAIO` → `Rua 13 de Maio`.
- Roman-numeral tokens (`^[IVXLCDM]+$`) uppercased: `RUA XV DE NOVEMBRO` →
  `Rua XV de Novembro`.
- First word always capitalized even if a minor word.
- Accents left exactly as stored (we never invent missing ones).
- Ships with `osmCase.test.mjs` (plain `node`, no framework) asserting a case table.

## Feature 4 — cleanup
Remove the `window._map` dev inspection hook.

## Files
- `prototype/app/src/App.jsx` — rework (two synced maps, divider, hit/hover/copy,
  toast, wire `toOsmCase`, remove dev hook)
- `prototype/app/src/lib/osmCase.js` + `src/lib/osmCase.test.mjs` — new
- `prototype/app/src/index.css` — divider/handle, toast, highlight, hover cursor

## Non-goals (later)
App/tile deployment & hosting; address-node phase; anything in-editor.
