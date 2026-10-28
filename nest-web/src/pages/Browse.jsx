import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, { errMsg } from "../api/client";
import ListingCard from "../components/ListingCard";
import { LocationPanel, NearbyAreas } from "../components/LocationPanel";
import { ResultsMap } from "../components/MapView";
import Select from "../components/Select";
import { EmptyState, ErrorNote, Icon, Spinner } from "../components/ui";
import { useUserLocation } from "../context/LocationContext";
import { cap, ELECTRICITY, naira, ROOM_TYPES } from "../utils/format";
import useAmenities from "../utils/useAmenities";

const SORTS = {
  nearest: "Nearest to me",
  price_asc: "Cheapest first",
  price_desc: "Most expensive first",
  newest: "Newest",
  distance: "Closest to campus",
  rating: "Best rated",
};
const RADII = [1, 3, 5, 10, 20, 50];

// read a comma list from the url
const listParam = (params, key) => (params.get(key) ? params.get(key).split(",").filter(Boolean) : []);
const digits = (v) => String(v || "").replace(/\D/g, "");
const money = (v) => (v ? naira(v) : "");

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
        active ? "border-teal bg-teal text-onteal" : "border-line bg-sf hover:bg-sf2"
      }`}
    >
      {children}
    </button>
  );
}

// featured gold chips: 24hrs electricity and video tours
function FeatureChip({ active, onClick, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
        active ? "border-gold bg-gold text-[#1a1405]" : "border-pdline bg-pdb text-pdt hover:brightness-95"
      }`}
    >
      {icon}
      {children}
      {active && <Icon name="x" size={14} />}
    </button>
  );
}

function Group({ title, children }) {
  return (
    <div className="border-b border-line py-5 first:pt-0 last:border-0">
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      {children}
    </div>
  );
}

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const { loc } = useUserLocation();
  const [data, setData] = useState({ listings: [], total: 0, pages: 1, budget: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState("grid");
  const [q, setQ] = useState(params.get("q") || "");
  const [minB, setMinB] = useState(params.get("minBudget") || "");
  const [maxB, setMaxB] = useState(params.get("maxBudget") || "");
  const amenityList = useAmenities().filter((a) => a.key !== ELECTRICITY); // electricity has its own chip
  const lastRequest = useRef(0);

  const radiusKm = Number(params.get("radiusKm") || 5);
  const defaultSort = loc ? "nearest" : "newest";
  // show the order the backend actually used when the user hasn't picked one
  const sort = params.get("sort") || data.sort || defaultSort;

  // fetch when the filters or the location change. older responses are ignored,
  // so a slow request can never overwrite newer results
  useEffect(() => {
    const id = ++lastRequest.current;
    setLoading(true);
    setError("");
    const query = Object.fromEntries(params.entries());
    if (loc) {
      query.lat = loc.lat;
      query.lng = loc.lng;
      query.radiusKm = radiusKm;
    }
    if (!loc && query.sort === "nearest") delete query.sort;
    api
      .get("/listings", { params: query })
      .then((res) => id === lastRequest.current && setData(res.data))
      .catch((err) => id === lastRequest.current && setError(errMsg(err)))
      .finally(() => id === lastRequest.current && setLoading(false));
  }, [params, loc?.lat, loc?.lng]);

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === "" || value == null || value === false) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page"); // any filter change goes back to page 1
    setParams(next);
  };

  const toggleIn = (key, value) => {
    const list = listParam(params, key);
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    set(key, next.join(","));
  };

  // budget: apply after 600 ms without typing, or straight away with the Apply button
  const applyBudget = () => {
    const next = new URLSearchParams(params);
    minB ? next.set("minBudget", digits(minB)) : next.delete("minBudget");
    maxB ? next.set("maxBudget", digits(maxB)) : next.delete("maxBudget");
    next.delete("page");
    if (next.toString() !== params.toString()) setParams(next);
  };
  useEffect(() => {
    const t = setTimeout(applyBudget, 600);
    return () => clearTimeout(t);
  }, [minB, maxB]);

  const clearAll = () => {
    setQ("");
    setMinB("");
    setMaxB("");
    setParams(new URLSearchParams());
  };

  const page = Number(params.get("page") || 1);
  const activeCount = [...params.keys()].filter((k) => !["page", "sort", "radiusKm"].includes(k)).length;
  const light24 = params.get("electricity24") === "true";
  const video = params.get("hasVideo") === "true";
  const budgetOn = params.get("budgetOn") || "total";
  const b = data.budget;
  const placeName = loc?.source === "campus" ? "OAU" : "you";

  const filters = (
    <div>
      <Group title="Must have">
        <div className="flex flex-wrap gap-2">
          <FeatureChip active={light24} onClick={() => set("electricity24", light24 ? "" : "true")} icon={<Icon name="bolt" size={15} fill="currentColor" />}>
            24hrs Electricity
          </FeatureChip>
          <FeatureChip active={video} onClick={() => set("hasVideo", video ? "" : "true")} icon={<span aria-hidden="true">🎥</span>}>
            Has video tour
          </FeatureChip>
        </div>
      </Group>

      <Group title="Budget">
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-full border border-line bg-sf2 p-1 text-xs font-bold">
          {[
            ["total", "Total move-in"],
            ["rent", "Rent only"],
          ].map(([v, l]) => (
            <button
              key={v}
              type="button"
              aria-pressed={budgetOn === v}
              onClick={() => set("budgetOn", v === "total" ? "" : v)}
              className={`h-8 rounded-full ${budgetOn === v ? "bg-teal text-onteal" : "text-mut hover:text-ink"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyBudget();
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-mut">
              Min
              <input className="input mt-1" inputMode="numeric" placeholder="₦0" value={money(minB)} onChange={(e) => setMinB(digits(e.target.value))} />
            </label>
            <label className="text-xs font-semibold text-mut">
              Max
              <input className="input mt-1" inputMode="numeric" placeholder="Any" value={money(maxB)} onChange={(e) => setMaxB(digits(e.target.value))} />
            </label>
          </div>
          <button className="btn btn-ghost btn-sm mt-3 w-full">Apply budget</button>
        </form>
      </Group>

      {loc && (
        <Group title={`Distance from ${placeName}`}>
          <div className="flex flex-wrap gap-2">
            {RADII.map((km) => (
              <Chip key={km} active={radiusKm === km} onClick={() => set("radiusKm", km === 5 ? "" : km)}>
                {km} km
              </Chip>
            ))}
          </div>
        </Group>
      )}

      <Group title={`Areas near ${loc ? placeName : "OAU"}`}>
        <NearbyAreas radiusKm={loc ? Math.max(radiusKm, 10) : 10} selected={listParam(params, "area")} onPick={(a) => toggleIn("area", a)} />
      </Group>

      <Group title="Distance from campus">
        <div className="flex flex-wrap gap-2">
          {["1", "2", "3", "5"].map((km) => (
            <Chip key={km} active={params.get("maxDistance") === km} onClick={() => set("maxDistance", params.get("maxDistance") === km ? "" : km)}>
              Within {km} km
            </Chip>
          ))}
        </div>
      </Group>

      <Group title="Room type">
        <div className="flex flex-wrap gap-2">
          {Object.entries(ROOM_TYPES).map(([value, label]) => (
            <Chip key={value} active={listParam(params, "roomType").includes(value)} onClick={() => toggleIn("roomType", value)}>
              {label}
            </Chip>
          ))}
        </div>
      </Group>

      <Group title="Bedrooms">
        <div className="flex flex-wrap gap-2">
          {["1", "2", "3"].map((n) => (
            <Chip key={n} active={params.get("minBedrooms") === n} onClick={() => set("minBedrooms", params.get("minBedrooms") === n ? "" : n)}>
              {n}+
            </Chip>
          ))}
        </div>
      </Group>

      <Group title="Amenities">
        <div className="flex flex-wrap gap-2">
          {amenityList.map((a) => (
            <Chip key={a.key} active={listParam(params, "amenities").includes(a.key)} onClick={() => toggleIn("amenities", a.key)}>
              {a.label}
            </Chip>
          ))}
        </div>
      </Group>

      <Group title="Agency fee">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-4 w-4 accent-teal" checked={params.get("noAgencyFee") === "true"} onChange={(e) => set("noAgencyFee", e.target.checked ? "true" : "")} />
          No agency fee
        </label>
      </Group>

      <Group title="Sharing">
        <div className="flex flex-wrap gap-2">
          <Chip active={params.get("shared") === "true"} onClick={() => set("shared", params.get("shared") === "true" ? "" : "true")}>
            Can share
          </Chip>
          <Chip active={params.get("shared") === "false"} onClick={() => set("shared", params.get("shared") === "false" ? "" : "false")}>
            Just me
          </Chip>
        </div>
      </Group>

      <Group title="Rent period">
        <div className="flex flex-wrap gap-2">
          {["yearly", "semester", "monthly"].map((p) => (
            <Chip key={p} active={params.get("rentPeriod") === p} onClick={() => set("rentPeriod", params.get("rentPeriod") === p ? "" : p)}>
              {cap(p)}
            </Chip>
          ))}
        </div>
      </Group>
    </div>
  );

  const sortOptions = Object.entries(SORTS)
    .filter(([v]) => v !== "nearest" || loc)
    .map(([value, label]) => ({ value, label }));

  let summary = loading ? "Searching..." : `${data.total} ${data.total === 1 ? "house" : "houses"}`;
  if (!loading && b && (b.min != null || b.max != null)) {
    summary += b.min != null && b.max != null ? ` from ${naira(b.min)} to ${naira(b.max)}` : b.min != null ? ` from ${naira(b.min)} up` : ` up to ${naira(b.max)}`;
    if (b.on === "rent") summary += " (rent only)";
  }
  if (!loading && loc) summary += ` within ${radiusKm} km of ${placeName}`;

  return (
    <div className="mx-auto max-w-[1320px] px-6 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-serif text-[clamp(34px,4vw,48px)] leading-tight">Find a house near you</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <FeatureChip active={light24} onClick={() => set("electricity24", light24 ? "" : "true")} icon={<Icon name="bolt" size={15} fill="currentColor" />}>
              24hrs Electricity
            </FeatureChip>
            <FeatureChip active={video} onClick={() => set("hasVideo", video ? "" : "true")} icon={<span aria-hidden="true">🎥</span>}>
              Video tour
            </FeatureChip>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            set("q", q.trim());
          }}
          className="flex w-full max-w-md gap-2"
        >
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-mut" />
            <input className="input pl-11" placeholder="Search by title, street or landmark" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn btn-teal">Search</button>
        </form>
      </div>

      <LocationPanel className="mt-6" />

      <div className="mt-6 grid gap-8 lg:grid-cols-[300px_1fr]">
        <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
          <div className="panel p-5 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-bold">Filters</h2>
              {activeCount > 0 && (
                <button onClick={clearAll} className="text-sm font-semibold text-goldt hover:underline">
                  Clear all
                </button>
              )}
            </div>
            {filters}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <button onClick={() => setShowFilters(!showFilters)} className="btn btn-ghost lg:hidden">
              <Icon name="filter" /> Filters {activeCount > 0 && `(${activeCount})`}
            </button>
            <p className="text-sm font-semibold text-mut" aria-live="polite">
              Showing {summary}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex rounded-full border border-line bg-sf p-1 text-xs font-bold">
                {[
                  ["grid", "List"],
                  ["map", "Map"],
                ].map(([v, l]) => (
                  <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={`h-7 rounded-full px-3 ${view === v ? "bg-teal text-onteal" : "text-mut"}`}>
                    {l}
                  </button>
                ))}
              </div>
              <Select
                variant="pill"
                label="Sort by"
                className="w-[190px]"
                value={sort}
                onChange={(v) => set("sort", v)}
                options={sortOptions}
              />
            </div>
          </div>

          <ErrorNote>{error}</ErrorNote>

          {loading && !data.listings.length ? (
            <Spinner label="Finding houses" />
          ) : data.listings.length === 0 ? (
            <EmptyState
              title={loc ? `No houses within ${radiusKm} km of ${placeName} yet` : "No houses match these filters yet"}
              text={loc ? "Try a bigger distance, a wider budget, or fewer filters." : "Try a wider budget or fewer filters. New houses are added by verified agents."}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {loc && radiusKm < 50 && (
                    <button onClick={() => set("radiusKm", RADII.find((r) => r > radiusKm))} className="btn btn-gold">
                      Search {RADII.find((r) => r > radiusKm)} km
                    </button>
                  )}
                  {activeCount > 0 && (
                    <button onClick={clearAll} className="btn btn-ghost">
                      Clear filters
                    </button>
                  )}
                </div>
              }
            />
          ) : view === "map" ? (
            <ResultsMap listings={data.listings} you={loc} className="h-[70vh] min-h-[420px]" />
          ) : (
            <div className={`grid gap-6 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${loading ? "opacity-50" : ""}`}>
              {data.listings.map((l) => (
                <ListingCard key={l._id} listing={l} />
              ))}
            </div>
          )}

          {data.pages > 1 && data.listings.length > 0 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <button className="btn btn-ghost" disabled={page <= 1} onClick={() => set("page", page - 1)}>
                Previous
              </button>
              <span className="px-3 text-sm font-semibold text-mut">
                Page {page} of {data.pages}
              </span>
              <button className="btn btn-ghost" disabled={page >= data.pages} onClick={() => set("page", page + 1)}>
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
