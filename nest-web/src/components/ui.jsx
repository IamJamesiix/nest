import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// ---------- logo ----------
// the Nest mark: a house outline shaped like a lowercase "n"
const MARK_PATH =
  "M4377 9555 c-195 -37 -366 -118 -517 -244 -413 -345 -3199 -2811 -3352 -2967 -251 -256 -444 -542 -492 -731 -26 -98 -19 -4544 7 -4646 98 -392 329 -685 668 -847 231 -110 321 -122 849 -118 l405 3 75 27 c177 65 313 201 378 379 l27 74 6 1950 c5 1946 5 1950 27 2062 184 952 971 1592 1922 1560 963 -32 1736 -774 1810 -1737 6 -86 10 -804 10 -1965 0 -1603 2 -1838 15 -1890 55 -216 228 -391 440 -445 105 -27 803 -30 951 -5 529 92 931 499 1009 1024 13 87 15 395 13 2393 l-3 2293 -23 108 c-55 260 -158 477 -321 679 -60 75 -2899 2705 -3047 2823 -122 98 -255 162 -423 206 -104 27 -327 34 -434 14z";

export function LogoMark({ size = 30, light = false }) {
  return (
    <svg
      width={Math.round(size * 0.9)}
      height={size}
      viewBox="0 0 863 957"
      className={light ? "text-gold" : "text-tealt"}
      fill="currentColor"
      aria-hidden="true"
    >
      <g transform="translate(0,957) scale(0.1,-0.1)">
        <path d={MARK_PATH} />
      </g>
    </svg>
  );
}

export function Logo({ light = false, to = "/" }) {
  return (
    <Link to={to} className={`flex items-center gap-2.5 text-lg font-bold ${light ? "text-onteal" : "text-ink"}`}>
      <LogoMark light={light} />
      Nest
    </Link>
  );
}

// ---------- icons ----------
const paths = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  check: <path d="m5 12 4.5 4.5L19 7" />,
  shield: <><path d="M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 4h12l-2 4 2 4H5" /></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  home: <><path d="M4 11 12 4l8 7" /><path d="M6 10v9h12v-9" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.8 2.7 2.5 3 5.2" /></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  logout: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="m10 16-4-4 4-4M6 12h10" /></>,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  phone: <path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z" />,
  refresh: <><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16" /><path d="M20 20v-4h-4" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M5 20h14" /></>,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  compare: <><rect x="3" y="5" width="7" height="14" rx="1.5" /><rect x="14" y="5" width="7" height="14" rx="1.5" /></>,
};

export function Icon({ name, size = 18, className = "", fill = "none" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

// ---------- badges ----------
const STATUS_STYLE = {
  available: "bg-okb text-okt",
  confirmed: "bg-okb text-okt",
  approved: "bg-okb text-okt",
  resolved: "bg-okb text-okt",
  completed: "bg-okb text-okt",
  pending: "bg-pdb text-pdt",
  rescheduled: "bg-pdb text-pdt",
  open: "bg-pdb text-pdt",
  rented: "bg-rnb text-rnt",
  cancelled: "bg-rnb text-rnt",
  dismissed: "bg-rnb text-rnt",
  not_submitted: "bg-rnb text-rnt",
  expired: "bg-badb text-bad",
  declined: "bg-badb text-bad",
  rejected: "bg-badb text-bad",
};

const STATUS_TEXT = { rescheduled: "New time proposed", not_submitted: "Not submitted" };

export function StatusBadge({ status, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[status] || "bg-rnb text-rnt"} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_TEXT[status] || status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}

// shown on houses that list 24hr electricity
export function LightBadge({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-[#1a1405] ${className}`}>
      <Icon name="bolt" size={13} fill="currentColor" />
      24hrs light
    </span>
  );
}

export function VerifiedBadge({ small = false }) {
  return (
    <span className={`inline-flex items-center gap-1 font-semibold text-okt ${small ? "text-xs" : "text-sm"}`}>
      <Icon name="shield" size={small ? 14 : 16} />
      Verified agent
    </span>
  );
}

export function Stars({ value = 0, size = 14 }) {
  return (
    <span className="inline-flex text-gold" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={size} fill={i <= Math.round(value) ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

export function Rating({ value, count }) {
  if (!count) return <span className="text-xs font-semibold text-mut">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-bold text-goldt">
      <Icon name="star" size={14} fill="currentColor" className="text-gold" />
      {Number(value).toFixed(1)} <span className="font-medium text-mut">({count})</span>
    </span>
  );
}

// ---------- photos ----------
// drawn house used when a listing has no photo or the image fails
export function HouseArt({ tone = "var(--art-sky)" }) {
  return (
    <svg viewBox="0 0 400 260" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="400" height="260" fill={tone} />
      <rect y="200" width="400" height="60" fill="var(--art-ground)" />
      <circle cx="70" cy="190" r="38" fill="var(--art-tree)" />
      <circle cx="335" cy="182" r="46" fill="var(--art-tree)" />
      <path d="M110 120 200 55l90 65z" fill="#0F4C5C" />
      <rect x="125" y="118" width="150" height="90" fill="#F8F7F4" />
      <rect x="145" y="140" width="30" height="26" fill="#E3B23C" />
      <rect x="225" y="140" width="30" height="26" fill="#E3B23C" />
      <rect x="187" y="160" width="26" height="48" fill="#0F4C5C" />
    </svg>
  );
}

export function Photo({ src, alt = "", className = "", tone }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return (
      <div className={`overflow-hidden ${className}`}>
        <HouseArt tone={tone} />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

// ---------- states ----------
export function Spinner({ label = "Loading" }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm font-semibold text-mut" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-teal" />
      {label}
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-sf2 text-tealt">
        <Icon name="home" size={26} />
      </div>
      <h3 className="h-serif text-2xl">{title}</h3>
      {text && <p className="mt-2 max-w-md text-[15px] leading-relaxed text-mut">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return <p className="rounded-2xl bg-badb px-4 py-3 text-sm font-semibold text-bad">{children}</p>;
}

// ---------- modal ----------
export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night/50 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`rise max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-bg p-6 shadow-soft sm:rounded-3xl ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="h-serif text-2xl">{title}</h2>
          <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-sf2" aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- avatar ----------
export function Avatar({ name, size = "h-10 w-10", dark = false }) {
  const letters = (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <span className={`grid shrink-0 place-items-center rounded-full text-sm font-bold ${size} ${dark ? "bg-teal text-gold" : "bg-sf2 text-tealt"}`}>
      {letters}
    </span>
  );
}

// a page heading used across dashboards
export function PageTitle({ title, text, action }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="h-serif text-[34px] leading-tight sm:text-[40px]">{title}</h1>
        {text && <p className="mt-1.5 text-[15px] text-mut">{text}</p>}
      </div>
      {action}
    </div>
  );
}
