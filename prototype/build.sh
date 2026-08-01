#!/usr/bin/env bash
#
# build.sh — IBGE CNEFE 2022 logradouros (Aracaju / 2800308) -> XYZ MVT tiles
#
# Reproducible from scratch:
#   1. download the Sergipe faces-de-logradouros zip (cached)
#   2. extract only the Aracaju file
#   3. ogr2ogr -> GeoJSONSeq with a computed `name` field (3 props kept)
#   4. tippecanoe -> public/tiles/{z}/{x}/{y}.pbf  (uncompressed MVT)
#
# One command per line (no && / ; chaining). Pipes are fine.
set -euo pipefail

# --- config -----------------------------------------------------------------
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CACHE="$HERE/.cache"
TILES="$HERE/public/tiles"

MUNI="2800308"
UF="SE"
ZIP_URL="https://geoftp.ibge.gov.br/recortes_para_fins_estatisticos/malha_de_setores_censitarios/censo_2022/base_de_faces_de_logradouros_versao_2022_censo_demografico/json/SE_faces_de_logradouros_2022_json.zip"

ZIP="$CACHE/SE_faces_de_logradouros_2022_json.zip"
SRC="$CACHE/${UF}/${MUNI}_faces_de_logradouros_2022.json"
SEQ="$CACHE/${MUNI}_logradouros.geojsonl"

WGET="/opt/homebrew/bin/wget"
OGR2OGR="/opt/homebrew/bin/ogr2ogr"
TIPPECANOE="/opt/homebrew/bin/tippecanoe"

mkdir -p "$CACHE"
mkdir -p "$TILES"

# --- 1. download (cached; geoftp is flaky) ---------------------------------
if [ ! -f "$SRC" ]; then
  if [ ! -f "$ZIP" ]; then
    echo ">> downloading SE faces zip (geoftp is flaky, retrying)..."
    "$WGET" -T 60 -t 8 --waitretry=10 -c -O "$ZIP" "$ZIP_URL"
  fi
  echo ">> extracting only ${UF}/${MUNI}_faces_de_logradouros_2022.json"
  unzip -o "$ZIP" "${UF}/${MUNI}_faces_de_logradouros_2022.json" -d "$CACHE"
fi

# --- 2. ogr2ogr -> GeoJSONSeq with computed `name` --------------------------
# name = trim( NM_TIP_LOG + ' ' + NM_TIT_LOG + ' ' + NM_LOG ), spaces collapsed.
# NM_TIT_LOG is frequently null -> coalesce + double-space collapse.
echo ">> ogr2ogr -> GeoJSONSeq (computing name, keeping 3 props)"
rm -f "$SEQ"
"$OGR2OGR" \
  -f GeoJSONSeq \
  -dialect SQLITE \
  -sql "SELECT
          GEOMETRY,
          trim(
            replace(replace(
              coalesce(NM_TIP_LOG,'') || ' ' || coalesce(NM_TIT_LOG,'') || ' ' || coalesce(NM_LOG,''),
            '  ',' '), '  ',' ')
          ) AS name,
          NM_LOG,
          TOT_GERAL
        FROM \"${MUNI}_faces_de_logradouros_2022\"" \
  "$SEQ" \
  "$SRC"

echo ">> sample name values:"
head -3 "$SEQ" | /usr/bin/python3 -c "import sys,json;[print(' ',json.loads(l)['properties']['name']) for l in sys.stdin]"

# --- 3. tippecanoe -> XYZ MVT ----------------------------------------------
echo ">> tippecanoe -> $TILES"
rm -rf "$TILES"
mkdir -p "$TILES"
"$TIPPECANOE" \
  -Z12 -z16 \
  --no-tile-compression \
  --no-tile-size-limit \
  -l logradouros \
  -e "$TILES" \
  "$SEQ"

echo ">> done. tiles at $TILES"
