export const naira = (n) => `₦${Math.round(Number(n) || 0).toLocaleString("en-NG")}`;

// ₦180k style for tight spaces
export const nairaShort = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)}m`;
  if (v >= 1000) return `₦${Math.round(v / 1000)}k`;
  return naira(v);
};

export const ROOM_TYPES = {
  self_contained: "Self-contained",
  single_room: "Single room",
  room_and_parlour: "Room and parlour",
  mini_flat: "Mini flat",
  flat: "Flat",
  shared_apartment: "Shared apartment",
  hostel: "Hostel",
};

export const RENT_PERIODS = { yearly: "Yearly", semester: "Per semester", monthly: "Monthly" };
export const PERIOD_SHORT = { yearly: "a year", semester: "a semester", monthly: "a month" };

export const AREAS = ["Mayfair", "Lagere", "Asherifa", "Modomo", "Damico", "Parakin", "Fajuyi"];

// standard amenity keys from the backend. GET /listings/amenities is the source of truth;
// this list is only used if that request fails
export const ELECTRICITY = "24hr electricity";
export const AMENITIES = [
  ELECTRICITY,
  "prepaid meter",
  "water",
  "generator",
  "solar",
  "wifi",
  "security",
  "fenced",
  "tiled",
  "kitchen",
  "wardrobe",
  "parking",
  "pop ceiling",
  "shared toilet",
];

const AMENITY_LABELS = { [ELECTRICITY]: "24hrs electricity", "pop ceiling": "POP ceiling" };
export const amenityLabel = (key = "") => AMENITY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);

export const has24Light = (listing) => !!listing?.amenities?.includes(ELECTRICITY);

export const ID_TYPES = {
  nin: "National ID (NIN)",
  drivers_license: "Driver's licence",
  voters_card: "Voter's card",
  passport: "International passport",
  cac: "CAC business registration",
};

export const REPORT_REASONS = {
  fake_listing: "Fake listing",
  wrong_price: "Wrong price",
  already_rented: "Already rented",
  scam: "Scam",
  rude_agent: "Rude agent",
  other: "Something else",
};

export const roomLabel = (t) => ROOM_TYPES[t] || t;
export const cap = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);

export const daysAgo = (date) => {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
};

export const confirmedText = (date) => {
  const d = daysAgo(date);
  if (d === null) return "Not confirmed yet";
  if (d <= 0) return "Confirmed today";
  if (d === 1) return "Confirmed yesterday";
  return `Confirmed ${d} days ago`;
};

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const fmtDateTime = (d) =>
  new Date(d).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

// walking time, roughly 12 minutes per km
export const walkText = (km) => (km == null ? null : `${Math.max(1, Math.round(km * 12))} min walk`);

export const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

// value for <input type="datetime-local"> from a Date
export const toLocalInput = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
