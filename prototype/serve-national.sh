#!/usr/bin/env bash
# Serve the national CNEFE logradouros PMTiles archive with CORS + HTTP Range,
# so the preview app (or any MapLibre client) can read it via the pmtiles:// protocol.
#
# Usage: ./serve-national.sh [port]   (default 8091)
# Then point the app at it:
#   echo "VITE_PMTILES_URL=http://localhost:8091/national.pmtiles" > app/.env.local
#   (restart `npm run dev`)
set -euo pipefail

DATA_DIR="/Users/vgeorge/dev/osm-projects/cnefe/data/faces2022"
PORT="${1:-8091}"

if [ ! -f "$DATA_DIR/national.pmtiles" ]; then
  echo "national.pmtiles not found in $DATA_DIR — run the national build first." >&2
  exit 1
fi

echo "Serving $DATA_DIR/national.pmtiles on http://localhost:$PORT/national.pmtiles (CORS + range)"
exec npx --yes http-server "$DATA_DIR" -p "$PORT" --cors -a 127.0.0.1 -s
