import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { toOsmCase } from "./lib/osmCase.js";

// Register the pmtiles:// protocol once, at module load.
maplibregl.addProtocol("pmtiles", new Protocol().tile);

// PMTiles source: national archive (todo o Brasil) on Cloudflare R2.
// NOTE: pub-*.r2.dev is rate-limited / dev-only — swap for a custom domain in
// production. Override the default with VITE_PMTILES_URL.
const PMTILES_URL =
  import.meta.env.VITE_PMTILES_URL ||
  "https://pub-573949e7139941dc902afe5ba844ba35.r2.dev/national.pmtiles";

// National view: Brazil bounding box [W, S, E, N].
const BRAZIL_BBOX = [-73.99, -33.75, -34.79, 5.27];

const POSITRON_STYLE = "https://tiles.openfreemap.org/styles/positron";

// Design Atlas colors.
const DATA_COLOR = "#e47a00"; // orange-600 — CNEFE line
const ACCENT = "#0b4ad8"; // blue-500 — highlight / marker / divider
const HIT_LAYER_ID = "logradouros-hit";
const LAYER_MINZOOM = 13; // logradouros only render at/above this zoom

export default function App() {
  const baseContainer = useRef(null);
  const overlayContainer = useRef(null);
  const overlayEl = useRef(null); // the DOM node we clip
  const baseMapRef = useRef(null);
  const overlayMapRef = useRef(null);
  const markerRef = useRef(null);

  // Divider: keep a fraction (0..1) as source of truth, mirror to px for styling.
  const fractionRef = useRef(0.7);
  const draggingRef = useRef(false);
  const [dividerX, setDividerX] = useState(null);

  // Compare mode is opt-in, default OFF. compareModeRef mirrors it for use in
  // the map-init closure / drag handlers that live outside React render.
  const [compareMode, setCompareMode] = useState(false);
  const compareModeRef = useRef(false);

  const [aboutOpen, setAboutOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("");
  const [zoom, setZoom] = useState(null);
  const skipSearch = useRef(false); // suppress the search that a pick() would retrigger

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2500);
  };

  // ---- map init -------------------------------------------------------------
  useEffect(() => {
    if (overlayMapRef.current || !baseContainer.current || !overlayContainer.current)
      return;

    const bounds = new maplibregl.LngLatBounds(
      [BRAZIL_BBOX[0], BRAZIL_BBOX[1]],
      [BRAZIL_BBOX[2], BRAZIL_BBOX[3]]
    );
    const fitBoundsOptions = { padding: 20 };

    // Bottom map: Positron only. Interactive so wheel/drag over the base-only
    // (right of divider, where the overlay is clipped out) still work; the
    // reentrancy-guarded sync() keeps both cameras aligned.
    const baseMap = new maplibregl.Map({
      container: baseContainer.current,
      style: POSITRON_STYLE,
      bounds,
      fitBoundsOptions,
      attributionControl: false,
    });
    baseMapRef.current = baseMap;

    // Top map: Positron + CNEFE layers. All interaction lives here.
    const overlayMap = new maplibregl.Map({
      container: overlayContainer.current,
      style: POSITRON_STYLE,
      bounds,
      fitBoundsOptions,
    });
    overlayMapRef.current = overlayMap;

    overlayMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    // Locate control — a manual "locate me" button (no auto-prompt on load).
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true, timeout: 8000 },
      trackUserLocation: false,
      showAccuracyCircle: false,
      fitBoundsOptions: { maxZoom: 16 },
    });
    overlayMap.addControl(geolocate, "top-right");

    overlayMap.on("zoom", () => setZoom(overlayMap.getZoom()));

    // ---- keep the two maps camera-synced (reentrancy-guarded) ----
    let syncing = false;
    function sync(from, to) {
      if (syncing) return;
      syncing = true;
      to.jumpTo({
        center: from.getCenter(),
        zoom: from.getZoom(),
        bearing: from.getBearing(),
        pitch: from.getPitch(),
      });
      syncing = false;
    }
    overlayMap.on("move", () => sync(overlayMap, baseMap));
    baseMap.on("move", () => sync(baseMap, overlayMap));

    overlayMap.on("load", () => {
      setZoom(overlayMap.getZoom());

      overlayMap.addSource("logradouros", {
        type: "vector",
        url: `pmtiles://${PMTILES_URL}`,
      });

      // Empty highlight source for hover feedback.
      overlayMap.addSource("highlight", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      overlayMap.addLayer({
        id: "logradouros-line",
        type: "line",
        source: "logradouros",
        "source-layer": "logradouros",
        minzoom: LAYER_MINZOOM,
        paint: {
          "line-color": DATA_COLOR,
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0.55, 16, 0.9, 19, 0.75],
          "line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.6, 16, 1.8, 19, 3],
        },
      });

      // Bright hover highlight, drawn above the base line.
      overlayMap.addLayer({
        id: "logradouros-highlight",
        type: "line",
        source: "highlight",
        paint: {
          "line-color": ACCENT,
          "line-width": 4,
          "line-opacity": 0.9,
        },
      });

      // Invisible wide hit line so thin streets are easy to click/hover.
      overlayMap.addLayer({
        id: HIT_LAYER_ID,
        type: "line",
        source: "logradouros",
        "source-layer": "logradouros",
        minzoom: LAYER_MINZOOM,
        paint: { "line-color": "#000", "line-opacity": 0, "line-width": 12 },
      });

      overlayMap.addLayer({
        id: "logradouros-label",
        type: "symbol",
        source: "logradouros",
        "source-layer": "logradouros",
        minzoom: 15,
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          // MUST stay "Noto Sans Regular": the OpenFreeMap glyph endpoint 404s on
          // other stacks (e.g. Bold), and a failed glyph dependency makes the whole
          // vector tile fail to parse — the lines disappear too. (Geist is used for
          // the DOM UI only, never for map glyphs.)
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 14, 11, 16, 13, 19, 16],
          "symbol-spacing": 300,
          "text-padding": 2,
          "text-max-angle": 30,
        },
        paint: {
          "text-color": "#252525",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
          "text-halo-blur": 0.4,
        },
      });

      const clearHighlight = () => {
        const src = overlayMap.getSource("highlight");
        if (src) src.setData({ type: "FeatureCollection", features: [] });
      };

      // ---- hover highlight ----
      overlayMap.on("mousemove", (e) => {
        const feats = overlayMap.queryRenderedFeatures(e.point, { layers: [HIT_LAYER_ID] });
        const canvas = overlayMap.getCanvas();
        if (feats.length) {
          const f = feats[0];
          const src = overlayMap.getSource("highlight");
          if (src) src.setData({ type: "Feature", properties: {}, geometry: f.geometry });
          canvas.style.cursor = "pointer";
        } else {
          clearHighlight();
          canvas.style.cursor = "";
        }
      });

      // ---- click to copy OSM-style name ----
      overlayMap.on("click", async (e) => {
        const feats = overlayMap.queryRenderedFeatures(e.point, { layers: [HIT_LAYER_ID] });
        if (!feats.length) return;
        const name = feats[0].properties && feats[0].properties.name;
        if (typeof name !== "string" || !name.trim()) {
          showToast("sem nome");
          return;
        }
        const osm = toOsmCase(name);
        try {
          await navigator.clipboard.writeText(osm);
          showToast(`<span class="ok">✓</span>copiado · ${osm}`);
        } catch (err) {
          showToast(`falha ao copiar — ${osm}`);
        }
      });
    });

    // ---- divider: initial position + resize handling ----
    const applyDivider = (px) => {
      setDividerX(px);
      if (overlayEl.current) {
        overlayEl.current.style.clipPath = compareModeRef.current
          ? `inset(0 calc(100% - ${px}px) 0 0)`
          : "none";
      }
    };

    const initWidth = overlayContainer.current.clientWidth || window.innerWidth;
    applyDivider(fractionRef.current * initWidth);

    const onResize = () => {
      const w = overlayContainer.current
        ? overlayContainer.current.clientWidth
        : window.innerWidth;
      applyDivider(fractionRef.current * w);
      overlayMap.resize();
      baseMap.resize();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      overlayMap.remove();
      baseMap.remove();
      overlayMapRef.current = null;
      baseMapRef.current = null;
    };
  }, []);

  // ---- close the Sobre modal on Escape --------------------------------------
  useEffect(() => {
    if (!aboutOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setAboutOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aboutOpen]);

  // ---- compare mode toggle --------------------------------------------------
  useEffect(() => {
    compareModeRef.current = compareMode;
    const el = overlayEl.current;
    if (el) {
      if (compareMode) {
        const w = overlayContainer.current
          ? overlayContainer.current.clientWidth
          : window.innerWidth;
        const px = fractionRef.current * w;
        setDividerX(px);
        el.style.clipPath = `inset(0 calc(100% - ${px}px) 0 0)`;
      } else {
        el.style.clipPath = "none";
      }
    }
    // Keep both canvases the same size/position so they align on toggle.
    if (overlayMapRef.current) overlayMapRef.current.resize();
    if (baseMapRef.current) baseMapRef.current.resize();
  }, [compareMode]);

  // ---- divider drag ---------------------------------------------------------
  const onHandleDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;

    const move = (ev) => {
      if (!draggingRef.current || !overlayContainer.current) return;
      const rect = overlayContainer.current.getBoundingClientRect();
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      let px = clientX - rect.left;
      px = Math.max(0, Math.min(rect.width, px));
      fractionRef.current = rect.width ? px / rect.width : 0.5;
      setDividerX(px);
      if (overlayEl.current) {
        overlayEl.current.style.clipPath = `inset(0 calc(100% - ${px}px) 0 0)`;
      }
    };
    const up = () => {
      draggingRef.current = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
  };

  // ---- Nominatim search (debounced, >=3 chars, <=1 req/s) -------------------
  useEffect(() => {
    // A pick() sets the query to the chosen name; don't re-search (and reopen) it.
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setStatus("");
      return;
    }
    setStatus("buscando...");
    const handle = setTimeout(async () => {
      try {
        // Bias (not restrict) results to the current map view, nationwide.
        const b = overlayMapRef.current && overlayMapRef.current.getBounds();
        const viewbox = b
          ? `${b.getWest()},${b.getNorth()},${b.getEast()},${b.getSouth()}`
          : "";
        const url =
          "https://nominatim.openstreetmap.org/search?format=jsonv2" +
          "&countrycodes=br&limit=6" +
          (viewbox ? "&viewbox=" + viewbox : "") +
          "&q=" +
          encodeURIComponent(q);
        const res = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
        const data = await res.json();
        setResults(data);
        setStatus(data.length ? "" : "nenhum resultado");
      } catch (e) {
        setStatus("erro na busca");
      }
    }, 1100); // >= 1s between requests (Nominatim usage policy)

    return () => clearTimeout(handle);
  }, [query]);

  const pick = (r) => {
    const lon = Number(r.lon);
    const lat = Number(r.lat);
    const map = overlayMapRef.current;
    if (!map) return;
    map.flyTo({ center: [lon, lat], zoom: 16 });
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = new maplibregl.Marker({ color: ACCENT })
      .setLngLat([lon, lat])
      .setPopup(new maplibregl.Popup().setText(r.display_name))
      .addTo(map);
    skipSearch.current = true;
    setResults([]);
    setStatus("");
    setQuery(r.display_name.split(",")[0]);
  };

  const showZoomNote = zoom != null && zoom < LAYER_MINZOOM;

  return (
    <>
      <div className="map-stack">
        <div id="base-map" ref={baseContainer} />
        <div id="overlay-map" className="overlay-map" ref={overlayEl}>
          <div className="overlay-map-inner" ref={overlayContainer} />
        </div>
      </div>

      {compareMode && dividerX != null && (
        <>
          <div className="side-tag cnefe" style={{ right: `calc(100% - ${dividerX - 10}px)` }}>
            CNEFE · IBGE
          </div>
          <div className="side-tag osm" style={{ left: `${dividerX + 10}px` }}>
            Mapa base · OSM
          </div>
        </>
      )}

      {compareMode && dividerX != null && (
        <div className="swipe-divider" style={{ left: `${dividerX}px` }}>
          <div
            className="swipe-handle"
            title="Arraste para comparar · esquerda: CNEFE (IBGE) · direita: mapa base (OSM)"
            onPointerDown={onHandleDown}
            onTouchStart={onHandleDown}
          />
        </div>
      )}

      {showZoomNote && (
        <div className="zoomnote" role="status">
          <span className="dot" />
          Aproxime para ver os logradouros do CNEFE.
        </div>
      )}

      {zoom != null && <div className="zoom-hud">z {zoom.toFixed(2)}</div>}

      <div className="left-panel">
        <div className="card">
          <div className="search">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              aria-label="Buscar logradouro no Brasil"
              placeholder="Buscar logradouro no Brasil…"
              value={query}
              autoComplete="off"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {status && <div className="search-hint">{status}</div>}
          {results.length > 0 && (
            <ul className="results">
              {results.map((r) => (
                <li key={r.place_id} onClick={() => pick(r)}>
                  {r.display_name}
                </li>
              ))}
            </ul>
          )}
          <div className="footer">
            <label className="switch">
              <input
                type="checkbox"
                checked={compareMode}
                onChange={(e) => setCompareMode(e.target.checked)}
              />
              <span className="track" />
              <span className="lbl">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <path
                    d="M7.5 1v13M4 4L1 7.5 4 11M11 4l3 3.5-3 3.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Comparar
              </span>
            </label>
            <button
              type="button"
              className="about-btn"
              aria-haspopup="dialog"
              onClick={() => setAboutOpen(true)}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                <circle cx="7.5" cy="7.5" r="6.2" stroke="currentColor" strokeWidth="1.3" />
                <path d="M7.5 6.6v4M7.5 4.4v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Sobre
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="toast" role="status" aria-live="polite" dangerouslySetInnerHTML={{ __html: toast }} />
      )}

      <div className="attribution">IBGE CNEFE 2022 · OpenFreeMap/OSM · Nominatim</div>

      {aboutOpen && (
        <div
          className="scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="aboutTitle"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAboutOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="eyebrow">CNEFE 2022</div>
                <h2 id="aboutTitle">Logradouros do Brasil</h2>
              </div>
              <button type="button" className="x" aria-label="Fechar" onClick={() => setAboutOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Faces de logradouro do IBGE (Censo 2022) para comparar nomes de ruas com o
                OpenStreetMap, ao lado do seu editor.
              </p>
              <p>
                Clique numa rua para copiar o nome. Ative <b>Comparar</b> para ver CNEFE × OSM
                lado a lado.
              </p>
              <p className="foot">
                Confira acentos e caixa antes de colar — o nome é um palpite, não um dado
                autoritativo. Projeto open-source independente.
              </p>
              <p className="foot">
                Dados do IBGE são de domínio público e podem ser usados no OSM, citando a
                fonte —{" "}
                <a
                  href="https://wiki.openstreetmap.org/wiki/CNEFE_data,_IBGE,_Brasil_import"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  wiki do OSM
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
