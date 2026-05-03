import { useState, useEffect } from "react";
import axios from "axios";
import {
  MapContainer, TileLayer, Marker,
  Polyline, Popup, useMapEvents, useMap
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const API = "http://localhost:8000/api";

const ALGO_COLORS = {
  "Dijkstra":      "#e74c3c",
  "A*":            "#3498db",
  "Lazy Dijkstra": "#2ecc71",
  "Bidirectional": "#f39c12",
};

const ALGO_DESC = {
  "Dijkstra":      "Classic priority queue",
  "A*":            "Haversine GPS heuristic",
  "Lazy Dijkstra": "Reduced sort operations",
  "Bidirectional": "Dual-ended search",
};

const VEHICLES = {
  normal:    { icon: "🚗", label: "Normal",    color: "#3498db", desc: "Standard routing" },
  ambulance: { icon: "🚑", label: "Ambulance", color: "#e74c3c", desc: "Shortest distance" },
  police:    { icon: "🚔", label: "Police",    color: "#3498db", desc: "Speed priority" },
  fire:      { icon: "🚒", label: "Fire",      color: "#e67e22", desc: "Shortest distance" },
};

const MAP_THEMES = {
  dark:      { label: "Dark",      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" },
  light:     { label: "Light",     url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" },
  satellite: { label: "Satellite", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" },
};

const CITY_LOCATIONS = {
  shimla: [
    { name: "Mall Road",              lat: 31.1048, lng: 77.1734 },
    { name: "Railway Station",        lat: 31.0986, lng: 77.1734 },
    { name: "Jakhu Temple",           lat: 31.1072, lng: 77.1863 },
    { name: "IGMC Hospital",          lat: 31.1041, lng: 77.1661 },
    { name: "Bus Stand",              lat: 31.1028, lng: 77.1695 },
    { name: "Sanjauli",               lat: 31.0922, lng: 77.1800 },
    { name: "Chhota Shimla",          lat: 31.0922, lng: 77.1590 },
  ],
  delhi: [
    { name: "Connaught Place",        lat: 28.6289, lng: 77.2065 },
    { name: "India Gate",             lat: 28.6129, lng: 77.2295 },
    { name: "Red Fort",               lat: 28.6562, lng: 77.2410 },
    { name: "AIIMS Delhi",            lat: 28.5672, lng: 77.2100 },
    { name: "IGI Airport",            lat: 28.5562, lng: 77.1000 },
    { name: "Chandni Chowk",          lat: 28.6506, lng: 77.2334 },
  ],
  mumbai: [
    { name: "Gateway of India",       lat: 18.9220, lng: 72.8347 },
    { name: "Bandra Station",         lat: 19.0596, lng: 72.8295 },
    { name: "CST Terminal",           lat: 18.9402, lng: 72.8356 },
    { name: "Juhu Beach",             lat: 19.0990, lng: 72.8267 },
    { name: "BKC",                    lat: 19.0647, lng: 72.8652 },
    { name: "Dharavi",                lat: 19.0422, lng: 72.8530 },
  ],
  chandigarh: [
    { name: "Sector 17",              lat: 30.7414, lng: 76.7682 },
    { name: "Rock Garden",            lat: 30.7521, lng: 76.8089 },
    { name: "Sukhna Lake",            lat: 30.7427, lng: 76.8183 },
    { name: "PGI Hospital",           lat: 30.7641, lng: 76.7775 },
    { name: "Sector 22",              lat: 30.7333, lng: 76.7794 },
    { name: "Airport",                lat: 30.6735, lng: 76.7885 },
  ],
};

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [center, zoom]);
  return null;
}

function MapClickHandler({ mode, onSource, onTarget }) {
  useMapEvents({
    click(e) {
      const pt = { name: "Custom", lat: e.latlng.lat, lng: e.latlng.lng };
      mode === "source" ? onSource(pt) : onTarget(pt);
    },
  });
  return null;
}

export default function App() {
  const [cities, setCities]         = useState([]);
  const [city, setCity]             = useState("shimla");
  const [graphInfo, setGraphInfo]   = useState(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [mapCenter, setMapCenter]   = useState([31.1048, 77.1734]);
  const [mapZoom, setMapZoom]       = useState(14);
  const [source, setSource]         = useState(CITY_LOCATIONS.shimla[0]);
  const [target, setTarget]         = useState(CITY_LOCATIONS.shimla[1]);
  const [vehicle, setVehicle]       = useState("normal");
  const [results, setResults]       = useState([]);
  const [activeAlgo, setActiveAlgo] = useState("Lazy Dijkstra");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [clickMode, setClickMode]   = useState("source");
  const [theme, setTheme]           = useState("dark");
  const [showDirs, setShowDirs]     = useState(true);

  useEffect(() => {
    axios.get(`${API}/cities/`).then(r => setCities(r.data));
  }, []);

  useEffect(() => {
    setLoadingGraph(true);
    setResults([]);
    setGraphInfo(null);
    const locs = CITY_LOCATIONS[city];
    setSource(locs[0]);
    setTarget(locs[1]);
    axios.get(`${API}/graph/?city=${city}`)
      .then(r => {
        setGraphInfo(r.data);
        setMapCenter([r.data.center.lat, r.data.center.lng]);
        setMapZoom(r.data.zoom);
        setLoadingGraph(false);
      })
      .catch(() => setLoadingGraph(false));
  }, [city]);

  const findRoute = async () => {
    setError(""); setLoading(true); setResults([]);
    try {
      const r = await axios.post(`${API}/route/`, {
        source_lat: source.lat, source_lng: source.lng,
        target_lat: target.lat, target_lng: target.lng,
        city, vehicle_type: vehicle,
      });
      setResults(r.data.results);
      setActiveAlgo("Lazy Dijkstra");
    } catch (e) {
      setError(e.response?.data?.error || "Backend error. Is the server running?");
    }
    setLoading(false);
  };

  const current    = results.find(r => r.algorithm === activeAlgo);
  const activePath = current?.coordinates?.map(c => [c.lat, c.lng]) || [];
  const fastest    = results.length ? [...results].sort((a, b) => a.time_ms - b.time_ms)[0] : null;
  const locations  = CITY_LOCATIONS[city] || [];
  const vConfig    = VEHICLES[vehicle];

  return (
    <div style={css.root}>

      {/* ── SIDEBAR ── */}
      <aside style={css.sidebar}>

        {/* Logo */}
        <div style={css.logo}>
          <div style={css.logoDot} />
          <div>
            <div style={css.logoTitle}>SmartPath AI</div>
            <div style={css.logoSub}>Navigation Engine</div>
          </div>
        </div>

        <div style={css.divider} />

        {/* Cities */}
        <div style={css.sectionLabel}>City</div>
        {cities.map(c => (
          <button key={c.key} onClick={() => setCity(c.key)}
            style={{ ...css.sideBtn, ...(city === c.key ? css.sideBtnActive : {}) }}>
            <span style={css.sideBtnDot(city === c.key)} />
            {c.name.split(",")[0]}
          </button>
        ))}

        <div style={css.divider} />

        {/* Vehicle */}
        <div style={css.sectionLabel}>Vehicle Mode</div>
        <div style={css.vehicleGrid}>
          {Object.entries(VEHICLES).map(([k, v]) => (
            <button key={k} onClick={() => setVehicle(k)}
              style={{ ...css.vehicleBtn, borderColor: vehicle === k ? v.color : "#30363d",
                background: vehicle === k ? v.color + "22" : "transparent" }}>
              <span style={{ fontSize: 20 }}>{v.icon}</span>
              <span style={{ fontSize: 10, color: vehicle === k ? v.color : "#8b949e" }}>{v.label}</span>
            </button>
          ))}
        </div>
        {vehicle !== "normal" && (
          <div style={{ ...css.infoBadge, borderColor: vConfig.color, color: vConfig.color }}>
            {vConfig.icon} {vConfig.desc}
          </div>
        )}

        <div style={css.divider} />

        {/* Algorithms */}
        <div style={css.sectionLabel}>Algorithm</div>
        {Object.entries(ALGO_COLORS).map(([algo, color]) => (
          <button key={algo} onClick={() => setActiveAlgo(algo)}
            style={{ ...css.algoBtn,
              borderColor: activeAlgo === algo ? color : "transparent",
              background: activeAlgo === algo ? color + "15" : "transparent" }}>
            <span style={{ ...css.algoDot, background: color }} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, color: "#e6edf3" }}>{algo}</div>
              <div style={{ fontSize: 10, color: "#8b949e" }}>{ALGO_DESC[algo]}</div>
            </div>
            {fastest?.algorithm === algo && results.length > 0 && (
              <span style={css.fastBadge}>BEST</span>
            )}
          </button>
        ))}

        <div style={css.divider} />

        {/* Graph info */}
        {graphInfo && (
          <div style={css.graphInfo}>
            <div style={css.graphInfoRow}>
              <span style={{ color: "#8b949e" }}>Intersections</span>
              <span style={{ color: "#2ecc71", fontWeight: 500 }}>
                {graphInfo.nodes.toLocaleString()}
              </span>
            </div>
            <div style={css.graphInfoRow}>
              <span style={{ color: "#8b949e" }}>Roads</span>
              <span style={{ color: "#2ecc71", fontWeight: 500 }}>
                {graphInfo.edges.toLocaleString()}
              </span>
            </div>
          </div>
        )}
        {loadingGraph && (
          <div style={{ fontSize: 12, color: "#f39c12", padding: "8px 0" }}>
            ⏳ Loading road network...
          </div>
        )}
      </aside>

      {/* ── MAIN ── */}
      <main style={css.main}>

        {/* Top bar */}
        <div style={css.topbar}>
          <div style={css.topbarLeft}>

            {/* Source */}
            <div style={css.inputGroup}>
              <div style={{ ...css.inputLabel, color: "#2ecc71" }}>SOURCE</div>
              <select value={source.name}
                onChange={e => setSource(locations.find(l => l.name === e.target.value))}
                style={css.select}>
                {locations.map(l => <option key={l.name}>{l.name}</option>)}
              </select>
            </div>

            <div style={css.swapArrow}>⇄</div>

            {/* Target */}
            <div style={css.inputGroup}>
              <div style={{ ...css.inputLabel, color: "#e74c3c" }}>TARGET</div>
              <select value={target.name}
                onChange={e => setTarget(locations.find(l => l.name === e.target.value))}
                style={css.select}>
                {locations.map(l => <option key={l.name}>{l.name}</option>)}
              </select>
            </div>

            {/* Click mode */}
            <div style={css.inputGroup}>
              <div style={css.inputLabel}>CLICK MAP</div>
              <div style={{ display: "flex", gap: 4 }}>
                {["source", "target"].map(m => (
                  <button key={m} onClick={() => setClickMode(m)}
                    style={{ ...css.modeBtn,
                      background: clickMode === m
                        ? (m === "source" ? "#2ecc7133" : "#e74c3c33")
                        : "transparent",
                      borderColor: clickMode === m
                        ? (m === "source" ? "#2ecc71" : "#e74c3c")
                        : "#30363d",
                      color: clickMode === m
                        ? (m === "source" ? "#2ecc71" : "#e74c3c")
                        : "#8b949e",
                    }}>
                    {m === "source" ? "📍" : "🎯"} {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Find Route button */}
          <button onClick={findRoute} disabled={loading || loadingGraph}
            style={{ ...css.routeBtn,
              opacity: loading || loadingGraph ? 0.6 : 1 }}>
            {loading ? "⏳ Routing..." : "⚡ Find Route"}
          </button>

          {/* Map themes */}
          <div style={css.themeGroup}>
            {Object.entries(MAP_THEMES).map(([k, v]) => (
              <button key={k} onClick={() => setTheme(k)}
                style={{ ...css.themeBtn,
                  background: theme === k ? "#21262d" : "transparent",
                  color: theme === k ? "#e6edf3" : "#8b949e" }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div style={css.error}>⚠️ {error}</div>}

        {/* Map + Stats row */}
        <div style={css.mapRow}>

          {/* Map */}
          <div style={css.mapWrapper}>
            <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "100%", width: "100%" }}>
              <TileLayer url={MAP_THEMES[theme].url} />
              <MapController center={mapCenter} zoom={mapZoom} />
              <MapClickHandler mode={clickMode} onSource={setSource} onTarget={setTarget} />

              <Marker position={[source.lat, source.lng]}>
                <Popup>📍 {source.name}</Popup>
              </Marker>
              <Marker position={[target.lat, target.lng]}>
                <Popup>🎯 {target.name}</Popup>
              </Marker>

              {/* Dimmed routes */}
              {results.map(r => r.algorithm !== activeAlgo && r.coordinates?.length > 0 && (
                <Polyline key={r.algorithm}
                  positions={r.coordinates.map(c => [c.lat, c.lng])}
                  color={ALGO_COLORS[r.algorithm]} weight={2} opacity={0.2} />
              ))}

              {/* Active route */}
              {activePath.length > 0 && (
                <Polyline positions={activePath}
                  color={ALGO_COLORS[activeAlgo]} weight={5} opacity={0.9} />
              )}
            </MapContainer>
          </div>

          {/* Stats panel */}
          {results.length > 0 && (
            <div style={css.statsPanel}>
              <div style={css.statsPanelTitle}>
                <span style={{ color: ALGO_COLORS[activeAlgo] }}>{activeAlgo}</span>
              </div>

              {[
                ["Travel Time", `${(current?.distance / 60).toFixed(1)} min`, "#2ecc71"],
                ["Nodes Visited", current?.nodes_visited?.toLocaleString(), "#3498db"],
                ["Sort Operations", current?.sort_operations?.toLocaleString(), "#f39c12"],
                ["Compute Time", `${current?.time_ms} ms`, "#e6edf3"],
              ].map(([label, value, color]) => (
                <div key={label} style={css.statCard}>
                  <div style={css.statLabel}>{label}</div>
                  <div style={{ ...css.statValue, color }}>{value}</div>
                </div>
              ))}

              <div style={css.divider} />

              {/* All algo comparison mini */}
              <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 8 }}>
                COMPARISON
              </div>
              {results.map(r => (
                <div key={r.algorithm}
                  onClick={() => setActiveAlgo(r.algorithm)}
                  style={{ ...css.miniAlgo,
                    borderColor: activeAlgo === r.algorithm
                      ? ALGO_COLORS[r.algorithm] : "transparent",
                    cursor: "pointer" }}>
                  <span style={{ ...css.algoDot, background: ALGO_COLORS[r.algorithm], flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#e6edf3", flex: 1 }}>{r.algorithm}</span>
                  <span style={{ fontSize: 11, color: fastest?.algorithm === r.algorithm ? "#2ecc71" : "#8b949e" }}>
                    {r.time_ms}ms
                    {fastest?.algorithm === r.algorithm ? " 🏆" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Directions panel */}
        {current?.directions?.length > 0 && (
          <div style={css.dirsPanel}>
            <div style={css.dirsHeader} onClick={() => setShowDirs(!showDirs)}>
              <span style={{ color: "#e6edf3", fontWeight: 500 }}>
                Turn-by-turn · {current.directions.length} steps ·{" "}
                <span style={{ color: ALGO_COLORS[activeAlgo] }}>{activeAlgo}</span>
              </span>
              <span style={{ color: "#8b949e" }}>{showDirs ? "▲" : "▼"}</span>
            </div>
            {showDirs && (
              <div style={css.dirsList}>
                {current.directions.map((d, i) => (
                  <div key={i} style={css.dirStep}>
                    <div style={{ ...css.dirNum, background: ALGO_COLORS[activeAlgo] }}>
                      {d.step}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "#e6edf3" }}>{d.road}</div>
                      <div style={{ fontSize: 11, color: "#8b949e" }}>
                        {d.distance_m}m
                        {d.speed_kph ? ` · ${d.speed_kph} km/h` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const css = {
  root: {
    display: "flex", height: "100vh", overflow: "hidden",
    background: "#0d1117", color: "#e6edf3",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },

  // Sidebar
  sidebar: {
    width: 220, minWidth: 220, height: "100vh",
    background: "#161b22", borderRight: "1px solid #21262d",
    padding: "16px 12px", overflowY: "auto", display: "flex",
    flexDirection: "column", gap: 6,
  },
  logo: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 4px 12px",
  },
  logoDot: {
    width: 28, height: 28, borderRadius: "50%",
    background: "#1D9E75", flexShrink: 0,
  },
  logoTitle: { fontSize: 14, fontWeight: 500, color: "#e6edf3" },
  logoSub:   { fontSize: 10, color: "#8b949e" },
  divider:   { borderTop: "1px solid #21262d", margin: "8px 0" },
  sectionLabel: {
    fontSize: 10, color: "#8b949e", letterSpacing: 1,
    textTransform: "uppercase", padding: "4px 4px 6px",
  },
  sideBtn: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 10px", borderRadius: 6, border: "1px solid transparent",
    background: "transparent", color: "#8b949e", cursor: "pointer",
    fontSize: 13, width: "100%", textAlign: "left", transition: "all 0.15s",
  },
  sideBtnActive: {
    background: "#1D9E7522", border: "1px solid #1D9E75", color: "#e6edf3",
  },
  sideBtnDot: (active) => ({
    width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
    background: active ? "#1D9E75" : "#30363d",
  }),
  vehicleGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
  },
  vehicleBtn: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 4, padding: "8px 4px", borderRadius: 6, border: "1px solid",
    background: "transparent", cursor: "pointer", transition: "all 0.15s",
  },
  infoBadge: {
    fontSize: 11, padding: "5px 10px", borderRadius: 6,
    border: "1px solid", marginTop: 4, textAlign: "center",
  },
  algoBtn: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 10px", borderRadius: 6, border: "1px solid",
    background: "transparent", cursor: "pointer",
    width: "100%", transition: "all 0.15s",
  },
  algoDot: {
    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
  },
  fastBadge: {
    fontSize: 9, padding: "2px 6px", borderRadius: 4,
    background: "#2ecc7133", color: "#2ecc71",
    border: "1px solid #2ecc7155", marginLeft: "auto",
  },
  graphInfo: {
    background: "#0d1117", borderRadius: 8,
    padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6,
  },
  graphInfoRow: {
    display: "flex", justifyContent: "space-between", fontSize: 12,
  },

  // Main
  main: {
    flex: 1, display: "flex", flexDirection: "column",
    overflow: "hidden", minWidth: 0,
  },
  topbar: {
    display: "flex", alignItems: "flex-end", gap: 12,
    padding: "12px 16px", background: "#161b22",
    borderBottom: "1px solid #21262d", flexWrap: "wrap",
  },
  topbarLeft: { display: "flex", alignItems: "flex-end", gap: 12, flex: 1, flexWrap: "wrap" },
  inputGroup: { display: "flex", flexDirection: "column", gap: 4 },
  inputLabel: { fontSize: 10, color: "#8b949e", letterSpacing: 1 },
  select: {
    padding: "7px 12px", borderRadius: 6,
    border: "1px solid #30363d", background: "#21262d",
    color: "#e6edf3", fontSize: 13, cursor: "pointer", minWidth: 160,
  },
  swapArrow: { fontSize: 18, color: "#8b949e", paddingBottom: 6 },
  modeBtn: {
    padding: "6px 10px", borderRadius: 6, border: "1px solid",
    cursor: "pointer", fontSize: 12, transition: "all 0.15s",
  },
  routeBtn: {
    padding: "10px 24px", borderRadius: 8, border: "none",
    background: "linear-gradient(135deg, #1D9E75, #16a085)",
    color: "#fff", fontSize: 14, fontWeight: 600,
    cursor: "pointer", whiteSpace: "nowrap",
  },
  themeGroup: {
    display: "flex", gap: 2, background: "#21262d",
    borderRadius: 6, padding: 2,
  },
  themeBtn: {
    padding: "5px 10px", borderRadius: 5, border: "none",
    cursor: "pointer", fontSize: 12, transition: "all 0.15s",
  },
  error: {
    padding: "8px 16px", background: "#e74c3c22",
    color: "#e74c3c", fontSize: 13, borderBottom: "1px solid #e74c3c44",
  },

  // Map row
  mapRow: { display: "flex", flex: 1, overflow: "hidden", minHeight: 0 },
  mapWrapper: { flex: 1, minWidth: 0 },

  // Stats panel
  statsPanel: {
    width: 200, minWidth: 200, background: "#161b22",
    borderLeft: "1px solid #21262d", padding: "14px 12px",
    overflowY: "auto", display: "flex", flexDirection: "column", gap: 8,
  },
  statsPanelTitle: { fontSize: 14, fontWeight: 500, marginBottom: 4 },
  statCard: {
    background: "#0d1117", borderRadius: 8, padding: "10px 12px",
  },
  statLabel: { fontSize: 10, color: "#8b949e", marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 500 },
  miniAlgo: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "6px 8px", borderRadius: 6,
    border: "1px solid", transition: "all 0.15s",
  },

  // Directions
  dirsPanel: {
    background: "#161b22", borderTop: "1px solid #21262d",
    maxHeight: 220, display: "flex", flexDirection: "column",
  },
  dirsHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", padding: "10px 16px",
    cursor: "pointer", borderBottom: "1px solid #21262d",
  },
  dirsList: { overflowY: "auto", padding: "8px 16px", display: "flex", flexDirection: "column", gap: 4 },
  dirStep: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "6px 0", borderBottom: "1px solid #21262d22",
  },
  dirNum: {
    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 10, fontWeight: 600, color: "#fff",
  },
};