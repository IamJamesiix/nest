import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CAMPUS, fmtKm, naira, nairaShort, placeOf } from "../utils/format";

const TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// html markers so we don't depend on leaflet's image files
const priceIcon = (text) =>
  L.divIcon({
    className: "",
    html: `<span class="nest-map-pin">${text}</span>`,
    iconSize: null,
    iconAnchor: [28, 14],
  });
const youIcon = L.divIcon({ className: "", html: '<span class="nest-map-you"></span>', iconSize: [18, 18], iconAnchor: [9, 9] });
const campusIcon = L.divIcon({ className: "", html: '<span class="nest-map-campus">OAU</span>', iconSize: null, iconAnchor: [20, 12] });
const houseIcon = L.divIcon({ className: "", html: '<span class="nest-map-house"></span>', iconSize: [28, 36], iconAnchor: [14, 34] });

// zoom to fit everything that's on the map
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 15);
    else map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
  }, [map, JSON.stringify(points)]);
  return null;
}

// results map: a pin per house, plus "you" and the campus
export function ResultsMap({ listings = [], you, className = "" }) {
  const placed = listings.filter((l) => l.lat != null && l.lng != null);
  const points = useMemo(() => {
    const pts = placed.map((l) => [l.lat, l.lng]);
    if (you) pts.push([you.lat, you.lng]);
    return pts;
  }, [placed, you]);

  return (
    <div className={`nest-map overflow-hidden rounded-[28px] border border-line ${className}`}>
      <MapContainer center={[CAMPUS.lat, CAMPUS.lng]} zoom={14} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer url={TILES} attribution={ATTRIBUTION} />
        <FitBounds points={points} />
        <Marker position={[CAMPUS.lat, CAMPUS.lng]} icon={campusIcon} />
        {you && you.source !== "campus" && <Marker position={[you.lat, you.lng]} icon={youIcon} />}
        {placed.map((l) => (
          <Marker key={l._id} position={[l.lat, l.lng]} icon={priceIcon(nairaShort(l.totalCost))}>
            <Popup>
              <Link to={`/listings/${l._id}`} className="block font-bold">
                {l.title}
              </Link>
              <span className="block text-xs">
                {placeOf(l)}
                {l.distanceFromYouKm != null && ` · ${fmtKm(l.distanceFromYouKm)} from you`}
              </span>
              <span className="mt-1 block font-bold">{naira(l.totalCost)} all-in</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

// tap the map to set the pin
function ClickToPin({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ at }) {
  const map = useMap();
  useEffect(() => {
    if (at) map.setView([at.lat, at.lng], Math.max(map.getZoom(), 16));
  }, [at?.lat, at?.lng]);
  return null;
}

// pin picker: drag the pin (or tap the map) to the exact spot
export function PinPicker({ value, onChange, className = "" }) {
  const start = value || CAMPUS;
  return (
    <div className={`nest-map overflow-hidden rounded-[24px] border border-line ${className}`}>
      <MapContainer center={[start.lat, start.lng]} zoom={value ? 16 : 14} scrollWheelZoom className="h-full w-full">
        <TileLayer url={TILES} attribution={ATTRIBUTION} />
        <ClickToPin onPick={onChange} />
        <Recenter at={value} />
        {value && (
          <Marker
            position={[value.lat, value.lng]}
            icon={houseIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const p = e.target.getLatLng();
                onChange(p.lat, p.lng);
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
