import { useMemo } from "react";
import { Link } from "react-router-dom";
import { naira, nairaShort, walkText } from "../utils/format";

// OAU main campus, same point the backend measures distance from
const CAMPUS = { lat: 7.5186, lng: 4.5225 };

// rough direction of each area from campus, in degrees clockwise from north.
// used when a listing has no lat/lng; the distance always comes from the listing.
const BEARING = {
  fajuyi: 35,
  parakin: 95,
  damico: 145,
  lagere: 190,
  modomo: 220,
  mayfair: 255,
  asherifa: 305,
};

const W = 600;
const H = 500;
const C = { x: 300, y: 255 }; // campus on the chart
const R = 205; // radius of the outer ring in chart units
const SWEEP = 6; // seconds for one sweep

// small stable number from an id, so pins in the same area don't sit on top of each other
const jitter = (id = "") => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return (h / 997 - 0.5) * 26; // about ±13 degrees
};

// where a listing sits relative to campus: bearing (deg) and distance (km)
const locate = (l) => {
  if (l.lat != null && l.lng != null) {
    const north = (l.lat - CAMPUS.lat) * 110.57;
    const east = (l.lng - CAMPUS.lng) * 111.32 * Math.cos((CAMPUS.lat * Math.PI) / 180);
    const km = l.distanceFromCampusKm ?? Math.hypot(north, east);
    return { bearing: ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360, km };
  }
  const base = BEARING[(l.area || "").toLowerCase()] ?? (jitter(l.area) * 13 + 360) % 360;
  return { bearing: (base + jitter(l._id) + 360) % 360, km: l.distanceFromCampusKm ?? 2 };
};

export default function CampusMap({ listings = [], className = "" }) {
  const { pins, rings, maxKm } = useMemo(() => {
    const placed = listings.map((l) => ({ l, ...locate(l) }));
    const far = Math.max(3, ...placed.map((p) => p.km));
    const maxKm = Math.ceil(far + 0.4);
    const step = maxKm > 6 ? 2 : 1;
    const rings = [];
    for (let k = step; k <= maxKm; k += step) rings.push(k);

    const pins = placed.map((p, i) => {
      const rad = (p.bearing * Math.PI) / 180;
      const r = Math.max(34, (p.km / maxKm) * R); // keep pins clear of the campus dot
      return { ...p, i, x: C.x + Math.sin(rad) * r, y: C.y - Math.cos(rad) * r };
    });
    return { pins, rings, maxKm };
  }, [listings]);

  // one label per area, under its first pin, or above it if another pin is in the way
  const clash = (x, y, self) =>
    pins.some((q) => q !== self && Math.abs(q.x - x) < 62 && Math.abs(q.y - y) < 22) || (Math.abs(x - C.x) < 70 && Math.abs(y - (C.y - 26)) < 14);
  const areaLabels = [];
  const seen = new Set();
  for (const p of pins) {
    const key = (p.l.area || "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const y = !clash(p.x, p.y + 28, p) ? p.y + 22 : !clash(p.x, p.y - 28, p) ? p.y - 38 : null;
    if (y != null) areaLabels.push({ name: p.l.area, x: p.x, y });
  }

  const pct = (x, y) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });

  return (
    <div className={`live-map relative overflow-hidden rounded-[32px] border border-glassline bg-[var(--map)] ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="campusGlow">
            <stop offset="0%" stopColor="var(--park)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--park)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sweepFade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--sweep)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--sweep)" stopOpacity="0.32" />
          </linearGradient>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="var(--ring)" strokeWidth="1" opacity="0.45" />
          </pattern>
        </defs>

        {/* map paper */}
        <rect width={W} height={H} fill="url(#grid)" />
        <path d="M0 290C150 270 320 285 600 238" stroke="var(--road)" strokeWidth="16" fill="none" />
        <path d="M150 0c14 160 22 330 4 500" stroke="var(--road)" strokeWidth="12" fill="none" />
        <path d="M600 110C470 130 410 110 350 0" stroke="var(--road)" strokeWidth="9" fill="none" />

        {/* campus */}
        <circle cx={C.x} cy={C.y} r={R * 0.42} fill="url(#campusGlow)" />

        {/* distance rings */}
        {rings.map((k) => {
          const r = (k / maxKm) * R;
          return (
            <g key={k}>
              <circle cx={C.x} cy={C.y} r={r} fill="none" stroke="var(--ring)" strokeWidth="1.5" strokeDasharray="4 6" />
              <text x={C.x + r * 0.707 + 4} y={C.y - r * 0.707 - 4} fontSize="12" fontWeight="700" fill="var(--maptext)" opacity="0.75">
                {k} km
              </text>
            </g>
          );
        })}

        {/* compass */}
        <g transform={`translate(${W - 34} 34)`} opacity="0.8">
          <circle r="15" fill="var(--color-sf)" stroke="var(--ring)" />
          <path d="M0 -9 4 3 0 0 -4 3z" fill="var(--maptext)" />
          <text y="13" textAnchor="middle" fontSize="7" fontWeight="800" fill="var(--maptext)">
            N
          </text>
        </g>

        {/* route lines from campus to each house */}
        {pins.map((p) => (
          <line
            key={p.l._id}
            x1={C.x}
            y1={C.y}
            x2={p.x}
            y2={p.y}
            stroke="var(--maptext)"
            strokeOpacity="0.35"
            strokeWidth="1.5"
            strokeDasharray="3 6"
            className="map-route"
          />
        ))}

        {/* radar sweep */}
        <g className="map-sweep" style={{ transformOrigin: `${C.x}px ${C.y}px`, animationDuration: `${SWEEP}s` }}>
          <path d={`M${C.x} ${C.y} L${C.x - R * Math.sin(Math.PI / 4)} ${C.y - R * Math.cos(Math.PI / 4)} A${R} ${R} 0 0 1 ${C.x} ${C.y - R} Z`} fill="url(#sweepFade)" />
          <line x1={C.x} y1={C.y} x2={C.x} y2={C.y - R} stroke="var(--sweep)" strokeOpacity="0.7" strokeWidth="2" />
        </g>

        <text x={C.x} y={C.y - 20} textAnchor="middle" fontSize="13" fontWeight="800" letterSpacing="3" fill="var(--maptext)" opacity="0.7">
          OAU CAMPUS
        </text>
      </svg>

      {/* you are here */}
      <span className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2" style={pct(C.x, C.y)}>
        <span className="map-ping absolute inset-0 rounded-full bg-[#3b82f6]/45" style={{ animationDuration: "2s" }} />
        <span className="absolute inset-0 rounded-full border-[3px] border-white bg-[#3b82f6] shadow" />
      </span>

      {areaLabels.map((a) => (
        <span key={a.name} className="pointer-events-none absolute hidden -translate-x-1/2 text-[11px] font-semibold capitalize text-mut sm:block" style={pct(a.x, a.y)}>
          {a.name}
        </span>
      ))}

      {/* houses */}
      {pins.map((p) => {
        const below = p.y < 120; // show the detail card under pins near the top
        const side = p.x > W * 0.72 ? "right-0" : p.x < W * 0.28 ? "left-0" : "left-1/2 -translate-x-1/2";
        return (
          <Link
            key={p.l._id}
            to={`/listings/${p.l._id}`}
            style={{ ...pct(p.x, p.y), animationDelay: `${p.i * 90}ms` }}
            className="map-pin group absolute z-10 -translate-x-1/2 -translate-y-1/2 hover:z-20 focus-visible:z-20"
            aria-label={`${p.l.title}, ${naira(p.l.totalCost)}, ${p.km} km from campus`}
          >
            {/* pulse when the sweep passes this pin */}
            <span
              className="map-ping absolute left-1/2 top-1/2 -ml-3 -mt-3 h-6 w-6 rounded-full border-2 border-gold"
              style={{ animationDuration: `${SWEEP}s`, animationDelay: `${(p.bearing / 360) * SWEEP - SWEEP}s` }}
            />
            <span className="relative flex items-center gap-1 rounded-full bg-teal px-2 py-1 text-[11px] font-bold sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs text-onteal shadow-soft transition-transform group-hover:scale-110 group-focus-visible:scale-110">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              {nairaShort(p.l.totalCost)}
            </span>

            <span
              className={`pointer-events-none absolute ${side} w-56 rounded-2xl border border-line bg-sf p-3 text-left opacity-0 shadow-soft transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${
                below ? "top-full mt-2" : "bottom-full mb-2"
              }`}
            >
              <span className="block truncate text-sm font-bold text-ink">{p.l.title}</span>
              <span className="mt-0.5 block text-xs text-mut">
                {p.l.area} · {p.km} km · {walkText(p.km)}
              </span>
              <span className="mt-1.5 block text-sm font-bold text-tealt">{naira(p.l.totalCost)} all-in</span>
            </span>
          </Link>
        );
      })}

      {/* legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 sm:bottom-4 sm:left-4 rounded-full border border-glassline bg-glass px-3 py-1.5 text-xs font-semibold text-ink backdrop-blur">
        <span className="relative flex h-2 w-2">
          <span className="map-ping absolute inset-0 rounded-full bg-okt" style={{ animationDuration: "1.6s" }} />
          <span className="relative h-2 w-2 rounded-full bg-okt" />
        </span>
        Live · {pins.length} {pins.length === 1 ? "house" : "houses"}
      </div>
      <div className="absolute bottom-4 right-4 hidden rounded-full sm:block border border-glassline bg-glass px-3 py-1.5 text-xs font-semibold text-mut backdrop-blur">
        Rings = km from campus
      </div>
    </div>
  );
}
