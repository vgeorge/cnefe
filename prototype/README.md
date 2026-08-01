# CNEFE 2022 logradouros — national reference map + iD overlay

Throwaway prototype. Turns IBGE **CNEFE 2022** street-face lines (`faces de
logradouros`) into a street-name reference layer for comparison against OSM.

Two tracks, both validated:

- **National preview map** (React/Vite + MapLibre) — **all of Brazil** in a single
  **PMTiles** archive read via the `pmtiles://` protocol. See **National archive** below.
- **iD editor overlay** — per-município **XYZ MVT** tiles (iD can't read PMTiles).
  Demonstrated on **Aracaju** (`2800308`). See Parts A–B.

See `SPEC.md` for the full rationale.

---

## National archive (whole Brazil) — the main result

- **`../data/faces2022/national.pmtiles`** — **1.44 GB**, **13,854,932** street-face
  lines, all 27 UFs, layer `logradouros`, single `name` field, zoom **12–16**
  (overzoom in the client for z17+). Gitignored (lives under `cnefe/data/`).
- Built by streaming every UF zip through `jq` (computing `name` =
  `NM_TIP_LOG NM_TIT_LOG NM_LOG`) into `tippecanoe -Z12 -z16
  --drop-densest-as-needed -o national.pmtiles -l logradouros`. ~45 min end-to-end.
- **Scale finding:** one PMTiles file (~1.4 GB) sidesteps the ~0.3–1M loose-tile
  file-count wall. For iD nationwide, front it with a Worker that translates
  `{z}/{x}/{y}` → range reads. For the map app, MapLibre reads it directly.

### Run the national map

```
./serve-national.sh                 # serves national.pmtiles on :8091 (CORS + range)
cd app
echo "VITE_PMTILES_URL=http://localhost:8091/national.pmtiles" > .env.local
npm install
npm run dev                         # http://localhost:5173
```

Opens Brazil-wide (layer appears from z13); the search box is nationwide. Without
`.env.local` the app falls back to a bundled Aracaju archive (`/aracaju.pmtiles`).

**Readability sweet spot (found by inspection):** street names become legible at
**z16**; z14 is an unreadable mesh. So labels show from z15, lines from z13, and the
client overzooms z16 tiles for z17–20 — crisp, no deeper tiles needed. Verified
across São Paulo, Rio, Manaus, and Caetité-BA (`verify/national-*.png`).

```
build.sh            data -> public/tiles/{z}/{x}/{y}.pbf   (reproducible)
serve-tiles.sh      CORS static server for ./public        (port 8088)
serve-tiles.mjs     the node server it runs
public/tiles/       XYZ MVT output (655 tiles, ~6.9 MB, z12-16, uncompressed)
app/                React + Vite + maplibre-gl preview     (own package.json)
verify/             verification screenshots
.cache/             download / intermediate files (gitignored)
```

---

## Part A — build the tiles

```
./build.sh
```

What it does (all reproducible from scratch, no chained shell ops):

1. Downloads the Sergipe zip (cached in `.cache/`, geoftp is flaky so it uses
   `wget -T 60 -t 8 --waitretry=10 -c`) and extracts **only**
   `SE/2800308_faces_de_logradouros_2022.json`.
2. `ogr2ogr` (Homebrew GDAL, **not** Postgres.app's — that build lacks the SQLite
   dialect) converts GeoJSON -> GeoJSONSeq, computing a `name` field =
   trimmed/space-collapsed `NM_TIP_LOG + NM_TIT_LOG + NM_LOG`, keeping only
   `name`, `NM_LOG`, `TOT_GERAL`.
3. `tippecanoe -Z12 -z16 --no-tile-compression --no-tile-size-limit
   -l logradouros -e public/tiles/` emits `{z}/{x}/{y}.pbf` (**uncompressed** MVT)
   + `metadata.json`.

Source: 28,847 LineStrings, EPSG:4326 (no reprojection). 24,923 have a street
name; 3,924 are unnamed faces (`name` empty). Sample `name` values:

```
AVENIDA COELHO E CAMPOS
RUA PROFESSOR FLORENTINO MENEZES
RUA SANTA ROSA
RUA ANTONIO JOSE DA CONCEICAO
```

Verify a tile (Aracaju centre, z14):

```
tippecanoe-decode public/tiles/14/6504/8691.pbf 14 6504 8691
```
-> layer `logradouros`, `"compressed": false`, features carry `name`.

---

## Part B — load into the iD editor  (PRIMARY DELIVERABLE)

### 1. Serve the tiles (CORS)

```
./serve-tiles.sh
```
Serves `./public` on **http://localhost:8088** with `Access-Control-Allow-Origin: *`
on every response, `.pbf` as `application/x-protobuf`, **no** `Content-Encoding`
(tiles are already uncompressed). Override the port with `PORT=9090 ./serve-tiles.sh`.

> Port note: 8080 (the spec's default) was occupied by an ssh tunnel on this
> machine, so the default is **8088**. If you change it, also change the URL in
> `app/src/App.jsx` (`TILE_URL`).

### 2. Add the layer in iD

The tile URL template to paste into iD is:

```
http://localhost:8088/tiles/{z}/{x}/{y}.pbf
```

Steps:

1. Open iD (`https://www.openstreetmap.org/edit`, or a local iD build).
2. Open the **Map Data** panel (right toolbar, the layers icon — shortcut `F`).
3. Under **Data Layers → Custom Map Data**, click the **…** (options) button.
4. In *Custom Map Data Settings*, paste the template into
   **"Enter a data file URL or vector tile URL template"** and click **OK**.
   iD recognises `{z}/{x}/{y}` and treats it as a vector-tile source.
5. Tick the **Custom Map Data** checkbox to show the layer.
6. **Zoom in** — the tiles have **minzoom 12**, so nothing shows when zoomed out.
   Aracaju centre ≈ lon -37.07, lat -10.91.

### Requirements (all handled by `serve-tiles.sh`, except transport scheme)

- **Uncompressed MVT** — `tippecanoe --no-tile-compression`, so no gzip header
  needed. ✅
- **CORS** — `Access-Control-Allow-Origin: *`. ✅
- **Same transport scheme as iD** — ⚠️ see below.

### ⚠️ Transport-scheme gotcha (important)

The **public HTTPS iD** (`openstreetmap.org/edit`, `ideditor.netlify.app`) sends a
`Content-Security-Policy: upgrade-insecure-requests`. That silently rewrites
`http://localhost:8088/...` to **`https://localhost:8088/...`**, which our plain-HTTP
tile server can't answer — the request hangs and no lines appear. (osm.org/edit
additionally requires you to be logged in.)

To actually load these tiles in iD you must match schemes, either:

- **Run iD locally over HTTP** (`http://127.0.0.1:...`). Then
  `http://localhost:8088/...` is same-scheme and loads — this is the mode the
  React preview app uses successfully (see Part C). ← recommended, matches how a
  mapper would run a local iD for an import review; **or**
- Serve the tiles over **HTTPS** (put `serve-tiles.mjs` behind a TLS reverse proxy
  / tunnel) so the upgraded `https://` request succeeds.

### What was verified for iD

- ✅ iD's real **Custom Map Data** UI accepts the `{z}/{x}/{y}.pbf` vector-tile
  template (see `verify/id-custom-data-url.png` — the dialog literally says
  "vector tile URL template … {z}, {x}, {y}"). Driven in iD 2.42.0-dev over
  Aracaju with live OSM data loaded.
- ✅ The tiles are valid, uncompressed, CORS-enabled MVT and **render from the
  identical URL** in an HTTP MapLibre app — 5,929 features drawn at z15 with
  correct `name` values (see `verify/app-z15-aracaju.png`).
- ❌ **Not** observed: the lines rendering *inside the public HTTPS iD*, because of
  the `upgrade-insecure-requests` scheme mismatch above (confirmed: a fetch of the
  tile from the `ideditor.netlify.app` origin hangs, while the same fetch from the
  HTTP React app and from `curl` returns 200 instantly). Use a local HTTP iD to
  observe it end-to-end.

---

## Part C — React/Vite preview app  (SECONDARY)

```
cd app
npm install
npm run dev      # http://localhost:5173
npm run build    # production build (verified: succeeds)
```

(The tile server from Part B must be running on 8088.)

- Basemap: **OpenFreeMap Positron** (`https://tiles.openfreemap.org/styles/positron`).
- Vector source: `http://localhost:8088/tiles/{z}/{x}/{y}.pbf`, minzoom 12, maxzoom 16.
- Layers: orange (`#FF600B`) line layer with a zoom width ramp + a `symbol` layer
  (`text-field: ["get","name"]`, `symbol-placement: "line"`) from z14.
- Initial view: fitBounds to Aracaju (lon -37.16..-37.03, lat -11.13..-10.86).
- Top-left **Nominatim** search box (debounced, ≥3 chars, ≤1 req/s, bounded to the
  Aracaju viewbox) → results dropdown → `flyTo` + marker.
- Attribution: *IBGE CNEFE 2022 · OpenFreeMap/OSM · Nominatim*.

Verified in-browser: Positron basemap + orange CNEFE lines + street-name labels at
z14+ (`verify/app-z15-aracaju.png`), and a Nominatim search for
*"Rua Laranjeiras Aracaju"* flew to the street and dropped a marker
(`verify/app-nominatim-laranjeiras.png`).

---

## Scaling beyond Aracaju

`build.sh` is parameterised by `MUNI`/`UF` at the top — point it at another código +
UF zip to tile a different município. Same pipeline feeds both iD and the app.
