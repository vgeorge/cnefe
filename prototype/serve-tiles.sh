#!/usr/bin/env bash
#
# serve-tiles.sh — CORS-enabled static server for ./public
#
# Serves the XYZ MVT tiles (public/tiles/{z}/{x}/{y}.pbf) so the OSM iD editor
# and the React preview app can fetch them cross-origin.
#
#   - Access-Control-Allow-Origin: * on every response.
#   - .pbf served as application/x-protobuf, NO content-encoding
#     (tiles are already uncompressed MVT — tippecanoe --no-tile-compression).
#
# Default port 8088 (8080 was occupied by an ssh tunnel during development).
# Override:  PORT=9090 ./serve-tiles.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-8088}"

echo ">> serving $HERE/public with CORS on http://localhost:$PORT"
echo ">> iD custom vector-tile URL:  http://localhost:$PORT/tiles/{z}/{x}/{y}.pbf"
exec /usr/bin/env node "$HERE/serve-tiles.mjs" "$PORT" "$HERE/public"
