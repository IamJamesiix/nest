// standard amenities students search for most. frontend shows these as checkboxes.
// "key" is what gets saved and searched, "label" is what users see.
export const AMENITIES = [
  { key: "24hr electricity", label: "24hrs Electricity" },
  { key: "prepaid meter", label: "Prepaid meter" },
  { key: "water", label: "Running water / Borehole" },
  { key: "generator", label: "Generator" },
  { key: "solar", label: "Solar / Inverter" },
  { key: "wifi", label: "Wi-Fi" },
  { key: "security", label: "Security / Gateman" },
  { key: "fenced", label: "Fenced / Gated" },
  { key: "tiled", label: "Tiled floor" },
  { key: "kitchen", label: "Kitchen" },
  { key: "wardrobe", label: "Wardrobe" },
  { key: "parking", label: "Parking space" },
  { key: "pop ceiling", label: "POP ceiling" },
  { key: "shared toilet", label: "Shared toilet" },
];

// turn the many ways people write things into one standard word
// e.g. "24/7 Light", "24 hours electricity", "constant power" -> "24hr electricity"
export const normalizeAmenity = (text) => {
  const a = String(text).toLowerCase().replace(/\s+/g, " ").trim();
  if (!a) return a;

  const isPower = /(electric|light|power|nepa|phcn)/.test(a);
  if (isPower && /(24|constant|uninterrupted|steady|always)/.test(a)) return "24hr electricity";
  if (/(borehole|running water|tap water|water supply|^water$)/.test(a)) return "water";
  if (/(wi-?fi|internet)/.test(a)) return "wifi";
  if (/(inverter|solar)/.test(a)) return "solar";
  if (/(prepaid|pre-paid)/.test(a)) return "prepaid meter";
  if (/(gen\b|generator)/.test(a)) return "generator";
  if (/(gate ?man|security|guard)/.test(a)) return "security";
  if (/(fence|gated)/.test(a)) return "fenced";
  return a;
};

// "24/7 light, Borehole" or ["Wifi"] -> ["24hr electricity", "water", "wifi"] (no duplicates)
export const normalizeAmenities = (value) => {
  if (!value) return [];
  const list = Array.isArray(value) ? value : String(value).split(",");
  return [...new Set(list.map(normalizeAmenity).filter(Boolean))];
};
