import { Link } from "react-router-dom";
import { nairaShort } from "../utils/format";

// rough spots for each area around the OAU campus (percent of the map box)
const SPOTS = {
  asherifa: { x: 14, y: 22 },
  fajuyi: { x: 80, y: 20 },
  mayfair: { x: 16, y: 58 },
  lagere: { x: 42, y: 74 },
  parakin: { x: 86, y: 52 },
  modomo: { x: 22, y: 86 },
  damico: { x: 70, y: 82 },
};

const spotFor = (area = "", i) => {
  const s = SPOTS[area.toLowerCase()];
  if (s) return s;
  return { x: 30 + ((i * 17) % 50), y: 30 + ((i * 23) % 45) };
};

// illustrated map of the houses around campus, with price pins
export default function CampusMap({ listings = [], className = "" }) {
  // nudge pins in the same area so they don't sit on each other
  const used = {};
  const pins = listings.slice(0, 7).map((l, i) => {
    const base = spotFor(l.area, i);
    const n = (used[l.area] = (used[l.area] || 0) + 1) - 1;
    return { l, x: base.x + n * 6, y: base.y - n * 7 };
  });

  return (
    <div className={`relative overflow-hidden rounded-[32px] border border-glassline bg-[var(--map)] ${className}`}>
      <svg viewBox="0 0 600 460" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="600" height="460" fill="var(--map)" />
        {[
          [40, 40, 120, 70],
          [440, 30, 120, 60],
          [30, 300, 110, 80],
          [470, 330, 100, 90],
          [180, 380, 120, 60],
        ].map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="14" fill="var(--blk)" />
        ))}
        <path d="M250 70c90-30 200 10 230 90s-20 170-120 190-200-20-230-100 30-160 120-180z" fill="var(--park)" />
        <path d="M0 250C160 235 300 240 600 205" stroke="var(--road)" strokeWidth="18" fill="none" />
        <path d="M120 0c10 150 20 300 0 460" stroke="var(--road)" strokeWidth="14" fill="none" />
        <path d="M600 120C470 135 400 120 330 0" stroke="var(--road)" strokeWidth="10" fill="none" />
        <text x="360" y="200" textAnchor="middle" fontSize="15" fontWeight="700" letterSpacing="3" fill="var(--maptext)" opacity=".6">
          OAU CAMPUS
        </text>
      </svg>

      {/* "you are here" pulse on campus */}
      <span className="absolute left-[60%] top-[46%] h-4 w-4 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#3b82f6]/40 motion-reduce:hidden" />
        <span className="absolute inset-0 rounded-full border-[3px] border-white bg-[#3b82f6]" />
      </span>

      {pins.map(({ l, x, y }) => (
        <Link
          key={l._id}
          to={`/listings/${l._id}`}
          title={l.title}
          style={{ left: `${x}%`, top: `${y}%` }}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-teal px-3 py-1.5 text-xs font-bold text-onteal shadow-soft transition-transform hover:z-10 hover:scale-110"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          {nairaShort(l.totalCost)}
        </Link>
      ))}

      {Object.entries(SPOTS).map(([name, s]) => (
        <span
          key={name}
          style={{ left: `${s.x}%`, top: `${s.y + 7}%` }}
          className="pointer-events-none absolute -translate-x-1/2 text-[11px] font-semibold capitalize text-mut"
        >
          {name}
        </span>
      ))}
    </div>
  );
}
