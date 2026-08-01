# Prototype spec — Aracaju logradouros for iD

Throwaway prototype. **Primary goal: make CNEFE 2022 logradouros loadable as a reference
overlay in the OSM iD editor.** Secondary: a React/Vite preview app. Validate on one município
(Aracaju) before scaling to Sergipe → Brazil.

## Success test
1. **iD (primary):** In iD, Map Data → Custom → `{z}/{x}/{y}` template pointing at our local
   tiles renders Aracaju street-face lines over live OSM; street names usable for comparison.
2. **Preview app (secondary):** React/Vite page shows the same tiles over a Carto-style basemap
   with a Nominatim search box that flies to a picked Aracaju place.

## Non-goals
Address points; hosting/deploy; production polish. Other municípios come via the parallel
data pull but the prototype only tiles Aracaju.

## Delivery format — XYZ MVT (PMTiles dropped)
iD cannot read `.pmtiles`. iD custom data = `{z}/{x}/{y}` **MVT** template or GeoJSON.
So produce **XYZ MVT** (`{z}/{x}/{y}.pbf`) via tippecanoe `--output-to-directory`.
Same source feeds the React app (MapLibre reads XYZ vector directly). No PMTiles.
- **`--no-tile-compression`** (uncompressed pbf) so a plain static host / iD needs no gzip header.
- Serve with **CORS** (`Access-Control-Allow-Origin: *`) or iD's cross-origin fetch fails.

## Data
- Confirmed base: `geoftp.ibge.gov.br/recortes_para_fins_estatisticos/malha_de_setores_censitarios/censo_2022/base_de_faces_de_logradouros_versao_2022_censo_demografico/json/`
- Aracaju = `2800308` → `SE/2800308_faces_de_logradouros_2022.json` (downloaded/extracted in scratchpad).
- LineString, EPSG:4326 (no reprojection), 28,847 features. Extent ≈ lon -37.16..-37.03, lat -11.13..-10.86.
- Fields `CD_SETOR CD_QUADRA CD_FACE NM_TIP_LOG NM_TIT_LOG NM_LOG TOT_RES TOT_GERAL`.
- Derive `name` = trim/join `NM_TIP_LOG`+`NM_TIT_LOG`+`NM_LOG`. Keep `name`, `NM_LOG`, `TOT_GERAL`.

## Pipeline (Aracaju)
1. `ogr2ogr` GeoJSON → GeoJSONL, add computed `name`, keep 3 props.
2. `tippecanoe -Z12 -z16 --no-tile-compression --output-to-directory public/tiles/ -l logradouros`
   (keep all lines; `--no-tile-size-limit` if needed). Emits `{z}/{x}/{y}.pbf` + `metadata.json`.
3. Reproducible `build.sh` (download → unzip Aracaju → convert → tile).

## Preview app — React + Vite (static)
- `maplibre-gl`. Basemap **OpenFreeMap Positron** (`https://tiles.openfreemap.org/styles/positron`).
- Source: vector, `tiles: ["http://localhost:PORT/tiles/{z}/{x}/{y}.pbf"]`, `minzoom 12 maxzoom 16`.
- Layers: line (orange `#FF600B`, width ramp) + symbol `text-field=["get","name"]`, placement `line`, from ~z14.
- Nominatim search (top-left): `nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=br&bounded=1&viewbox=<aracaju bbox>&q=…`, debounced ≥3 chars, custom UA, ≤1 req/s, results dropdown → `flyTo` + marker.
- Attribution: "IBGE CNEFE 2022 · OpenFreeMap/OSM · Nominatim".

## iD integration doc
`README.md` with the exact steps + the local `{z}/{x}/{y}` URL to paste into iD Custom Map Data,
and a note on the CORS + uncompressed-tile requirements. This is the primary deliverable to verify.

## Layout (`cnefe/prototype/`)
```
build.sh                 # data → public/tiles/{z}/{x}/{y}.pbf
serve-tiles.sh           # CORS-enabled static server for public/tiles (for iD)
app/                     # React + Vite (its own package.json, node_modules gitignored)
public/tiles/…           # XYZ MVT output (gitignored via data? no — small; see note)
README.md                # build + run + how-to-add-to-iD
```

## Execution — agents
- **Parallel (background): data-pull agent** — download ALL 27 UF faces-de-logradouros GeoJSON
  zips to `cnefe/data/faces2022/json/` (gitignored), robust retries, verify each, report sizes.
- **Build agent** — Aracaju tiles (`build.sh`) → React/Vite app + Nominatim + `serve-tiles.sh` +
  iD README; verify tiles are valid MVT and render in the app; document/verify the iD load.

## Tooling present: GDAL, tippecanoe, tile-join, node/npx. No installs expected.
