// Minimal CORS static file server for the prototype tiles.
// Usage: node serve-tiles.mjs <port> <rootDir>
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, extname } from "node:path";

const port = Number(process.argv[2] || 8080);
const root = process.argv[3] || join(process.cwd(), "public");

const TYPES = {
  ".pbf": "application/x-protobuf",
  ".json": "application/json",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
};

const server = createServer(async (req, res) => {
  // CORS on everything (incl. preflight).
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  // Prevent path traversal.
  const rel = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, rel);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }

  try {
    const s = await stat(filePath);
    if (s.isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const body = await readFile(filePath);
    const type = TYPES[extname(filePath)] || "application/octet-stream";
    res.setHeader("Content-Type", type);
    // Tiles are uncompressed MVT — do NOT set Content-Encoding.
    res.writeHead(200);
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

server.listen(port, () => {
  console.log(`serving ${root} on http://localhost:${port} (CORS: *)`);
});
