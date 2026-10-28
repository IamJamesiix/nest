import { useEffect, useState } from "react";
import api from "../api/client";
import { useUserLocation } from "../context/LocationContext";
import { CAMPUS, fmtKm, naira } from "../utils/format";
import { PinPicker } from "./MapView";
import { Icon, Modal } from "./ui";

// "Use my location" card with accuracy, retry, campus fallback and drop-a-pin
export function LocationPanel({ className = "" }) {
  const { loc, status, locate, setPin } = useUserLocation();
  const [pinOpen, setPinOpen] = useState(false);
  const [draft, setDraft] = useState(null);

  const openPin = () => {
    setDraft(loc && loc.source !== "campus" ? { lat: loc.lat, lng: loc.lng } : null);
    setPinOpen(true);
  };

  let title, text, tone;
  if (status === "locating") {
    title = "Finding you…";
    text = "Allow location when your browser asks. Outdoors works best.";
    tone = "plain";
  } else if (loc?.source === "gps") {
    const rough = loc.accuracy > 100;
    title = `Located within ${fmtKm(loc.accuracy / 1000)}`;
    text = rough ? "That's a rough fix. GPS gets better after a few seconds, especially outdoors." : "Showing houses near you, nearest first.";
    tone = rough ? "warn" : "ok";
  } else if (loc?.source === "pin") {
    title = "Using the pin you dropped";
    text = "Showing houses near that spot, nearest first.";
    tone = "ok";
  } else if (status === "denied" || status === "unavailable") {
    title = "Showing houses near OAU";
    text = status === "denied" ? "Turn on location for houses near you, or drop a pin on the map." : "We couldn't get your location. Try again, or drop a pin on the map.";
    tone = "warn";
  } else {
    title = "See houses near you";
    text = "We use your location only to sort houses by distance. It isn't saved or shared.";
    tone = "plain";
  }

  const toneCls = { ok: "border-[color:var(--color-okt)]/30 bg-okb", warn: "border-pdline bg-pdb", plain: "border-line bg-sf" }[tone];
  const showLocate = loc?.source !== "gps" || loc.accuracy > 100;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-3xl border p-4 ${toneCls} ${className}`} aria-live="polite">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sf text-tealt ${status === "locating" ? "animate-pulse" : ""}`}>
          <Icon name="pin" />
        </span>
        <div className="min-w-0">
          <p className="font-bold">{title}</p>
          <p className="text-sm text-mut">{text}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {showLocate && (
          <button onClick={locate} disabled={status === "locating"} className="btn btn-teal btn-sm">
            <Icon name="pin" size={15} />
            {loc?.source === "gps" || status === "denied" || status === "unavailable" ? "Try again" : "Use my location"}
          </button>
        )}
        <button onClick={openPin} className="btn btn-ghost btn-sm">
          {loc?.source === "pin" ? "Move pin" : "Drop a pin"}
        </button>
      </div>

      <Modal open={pinOpen} onClose={() => setPinOpen(false)} title="Drop a pin" wide>
        <p className="mb-3 text-sm text-mut">Tap the map where you want to search from, then drag the pin to adjust.</p>
        <PinPicker value={draft} onChange={(lat, lng) => setDraft({ lat, lng })} className="h-[55vh] min-h-[320px]" />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-mut">{draft ? `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}` : "No pin yet"}</span>
          <button
            disabled={!draft}
            onClick={() => {
              setPin(draft.lat, draft.lng);
              setPinOpen(false);
            }}
            className="btn btn-teal"
          >
            Search from here
          </button>
        </div>
      </Modal>
    </div>
  );
}

// "Mayfair · 0.8 km · 3 houses · from ₦220,000" chips, nearest first
export function NearbyAreas({ radiusKm = 10, selected = [], onPick, limit, className = "" }) {
  const { loc } = useUserLocation();
  const [areas, setAreas] = useState(null);
  const at = loc || { ...CAMPUS, source: "campus" };

  useEffect(() => {
    let live = true;
    setAreas(null);
    api
      .get("/listings/areas/nearby", { params: { lat: at.lat, lng: at.lng, radiusKm } })
      .then((res) => live && setAreas(res.data.areas || []))
      .catch(() => live && setAreas([]));
    return () => {
      live = false;
    };
  }, [at.lat, at.lng, radiusKm]);

  if (!areas) return <p className={`text-sm text-mut ${className}`}>Finding areas near {at.source === "campus" ? "OAU" : "you"}…</p>;
  if (!areas.length)
    return <p className={`text-sm text-mut ${className}`}>No houses within {radiusKm} km of {at.source === "campus" ? "OAU" : "you"} yet.</p>;

  const shown = limit ? areas.slice(0, limit) : areas;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {shown.map((a) => {
        const on = selected.includes(a.area);
        return (
          <button
            key={a.area}
            type="button"
            onClick={() => onPick(a.area)}
            aria-pressed={on}
            className={`rounded-full border px-3.5 py-2 text-left text-[13px] transition-colors ${on ? "border-teal bg-teal text-onteal" : "border-line bg-sf hover:bg-sf2"}`}
          >
            <span className="font-bold">{a.area}</span>
            <span className={on ? "text-onteal/80" : "text-mut"}>
              {" "}
              · {fmtKm(a.nearestKm)} · {a.houses} {a.houses === 1 ? "house" : "houses"}
              {a.cheapestTotal != null && ` · from ${naira(a.cheapestTotal)}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
