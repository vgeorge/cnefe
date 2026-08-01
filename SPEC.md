# SPEC — Panel redesign + OSM for Cities visual language

Status: approved direction, ready for implementation plan
Date: 2026-07-31

## Goal

Simplify the CNEFE app's UI and align it to the **OSM for Cities** visual
language (its "Design Atlas" token set), so this personal project feels part of
the same family. The map is the product; the panel is a calm companion surface
used beside any editor.

## Problems being fixed (from UX review)

1. Three stacked surfaces (About + Search + nested toggle); About is expanded by
   default with 5 paragraphs — heavy first load for a repeat-use utility.
2. Search (the primary action) sits *below* About.
3. Compare mode — a real feature — is buried inside the "Sobre" card footer.
4. Empty state: layer minzoom is 13/15, so national/zoomed-out load shows a blank
   basemap with no guidance (looks broken). This also covers the previously
   deferred "street-level only" warning.
5. Same text repeated 3× (About paragraph, toggle hint, swipe tooltip).
6. Heavy `0 1px 6px` shadows, system font, ad-hoc grays — no shared identity.

## Visual language (source: osmforcities/osmforcities `globals.css`)

Design Atlas tokens, adapted to this app's hand-written CSS as `:root` variables:

| Token            | Value            | Use                                   |
|------------------|------------------|---------------------------------------|
| `--font-sans`    | Geist Sans       | all UI text (bundled, self-hosted)    |
| `--font-mono`    | Geist Mono       | zoom HUD (tabular)                    |
| `--radius`       | 10px             | cards; 8px inner controls; 6px pills   |
| `--background`   | `#ffffff`        | card bg                                |
| `--foreground`   | `#252525`        | primary text                          |
| `--muted`        | `#f7f7f7`        | headers / hover rows                   |
| `--muted-foreground` | `#737373`    | secondary text / hints                |
| `--border`       | `#e5e5e5`        | hairline borders (replaces shadows)    |
| `--accent-blue`  | `#0b4ad8`        | links, highlight, divider, marker      |
| `--accent-blue-active` | `#06256d`  | active/pressed                        |
| shadow           | `0 1px 2px rgba(0,0,0,.06)` + border | subtle card lift    |

**Font bundling:** self-host Geist woff2 (via `@fontsource/geist-sans` +
`@fontsource/geist-mono`, or the `geist` package's woff2) and import in
`main.jsx`. No external font requests (CSP/offline-safe).

### Map colors (full retheme → Design Atlas)

| Element               | Before      | After (Atlas)          |
|-----------------------|-------------|------------------------|
| CNEFE line            | `#FF600B`   | orange-600 `#e47a00` (deeper = legible on light basemap) |
| hover/selected highlight | `#1d4ed8` | blue-500 `#0b4ad8`     |
| label text / halo     | `#1b1b1b` / white | `#252525` / white (unchanged intent) |
| swipe divider + handle | `#1d4ed8`  | blue-500 `#0b4ad8`     |
| search marker         | orange (data color) | blue-500 `#0b4ad8` (UI pin, distinct from data) |

Label `text-font` MUST stay `["Noto Sans Regular"]` (OpenFreeMap glyph endpoint
404s on other stacks → whole vector tile fails to parse → lines vanish). Geist
applies to the DOM UI only, not map glyphs.

## New layout — one card

```
┌─────────────────────────────┐
│ 🔍 Buscar logradouro…        │   search = hero, always visible
│   ⌄ results dropdown          │
├─────────────────────────────┤
│ ⇄ Comparar        ⓘ Sobre   │   thin footer row
└─────────────────────────────┘
```

- **Search** is the top, always-visible hero.
- **Footer row:** a labeled **Comparar** toggle (visible, no longer inside
  About) + an **ⓘ Sobre** trigger.
- **Sobre** opens a popover/modal with the full description (title, what CNEFE
  is, how to compare, click-to-copy hint, "projeto open-source independente",
  the accent/caixa caveat). Removed from the always-on surface.
- **Locate control** (manual): a persistent locate (⌖) button (MapLibre
  `GeolocateControl`) centers on the user's location on demand. No auto-prompt on
  load — geolocation only runs when the user clicks it.
- **Zoom warning** (fallback + street-level notice): one unobtrusive top-center
  pill, shown *only* when `zoom < layerMinzoom` (13) — text: "Aproxime para ver
  os logradouros do CNEFE." Auto-hides once streets render. The actual actions
  (locate, search) are the existing controls, so the warning carries no buttons.
- Zoom HUD + attribution kept, restyled to tokens (muted, hairline, Geist Mono
  for the HUD number). MapLibre's own controls softened to the token radius.

## Non-goals

- No dark mode (basemap is Positron/light).
- No change to data pipeline, PMTiles, search, copy logic, or compare mechanics —
  visual/layout only.
- Not importing OSM for Cities React components (it's Next/Tailwind/shadcn); we
  replicate the *tokens* in this app's plain CSS.

## Also fix (small, in-scope)

- Search results dropdown reopening after `pick()` (query refill re-triggers
  search). Guard so picking a result doesn't reopen the list.
- `aria-live` on toast; label on search input for a11y.

## Acceptance

- Panel is a single card: search hero + footer (Comparar + Sobre). About lives
  in a popover, closed on load.
- Geist renders across UI; no external font/network requests.
- Map line/highlight/divider/marker use Design Atlas hex values above; CNEFE
  lines + labels still render at z13/z15+ (font unchanged).
- Zoomed out below minzoom shows the contextual hint; it disappears when zoomed
  into street level.
- Picking a search result flies there without reopening the results list.
