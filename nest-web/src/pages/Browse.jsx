import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, { errMsg } from "../api/client";
import ListingCard from "../components/ListingCard";
import { EmptyState, ErrorNote, Icon, Spinner } from "../components/ui";
import { AMENITIES, AREAS, cap, ROOM_TYPES } from "../utils/format";

const SORTS = {
  newest: "Newest",
  price_asc: "Cheapest first",
  price_desc: "Most expensive first",
  distance: "Closest to campus",
  rating: "Best rated",
};

// read a comma list from the url
const listParam = (params, key) => (params.get(key) ? params.get(key).split(",").filter(Boolean) : []);

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
  const [data, setData] = useState({ listings: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [q, setQ] = useState(params.get("q") || "");

  // fetch whenever the url filters change
  useEffect(() => {
    setLoading(true);
    setError("");
    const query = Object.fromEntries(params.entries());
    api
      .get("/listings", { params: query })
      .then((res) => setData(res.data))
      .catch((err) => setError(errMsg(err)))
      .finally(() => setLoading(false));
  }, [params]);

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === "" || value == null || value === false) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const toggleIn = (key, value) => {
    const list = listParam(params, key);
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    set(key, next.join(","));
  };

  const clearAll = () => {
    setQ("");
    setParams(new URLSearchParams());
  };

  const page = Number(params.get("page") || 1);
  const activeCount = [...params.keys()].filter((k) => !["page", "sort"].includes(k)).length;

  const filters = (
    <div>
      <Group title="Max total budget">
        <div className="grid grid-cols-2 gap-2">
          <input className="input" inputMode="numeric" placeholder="Min ₦" value={params.get("minBudget") || ""} onChange={(e) => set("minBudget", e.target.value.replace(/\D/g, ""))} />
          <input className="input" inputMode="numeric" placeholder="Max ₦" value={params.get("maxBudget") || ""} onChange={(e) => set("maxBudget", e.target.value.replace(/\D/g, ""))} />
        </div>
        <p className="mt-2 text-xs text-mut">This is the total to move in, with all fees.</p>
      </Group>

      <Group title="Area">
        <div className="flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <Chip key={a} active={listParam(params, "area").includes(a)} onClick={() => toggleIn("area", a)}>
              {a}
            </Chip>
          ))}
        </div>
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
          {AMENITIES.map((a) => (
            <Chip key={a} active={listParam(params, "amenities").includes(a)} onClick={() => toggleIn("amenities", a)}>
              {cap(a)}
            </Chip>
          ))}
        </div>
      </Group>

      <Group title="Agency fee">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-4 w-4 accent-teal" checked={params.get("noAgencyFee") === "true"} onChange={(e) => set("noAgencyFee", e.target.checked ? "true" : "")} />
          No agency fee
        </label>
        <input
          className="input mt-3"
          inputMode="numeric"
          placeholder="Max agency fee ₦"
          value={params.get("maxAgencyFee") || ""}
          onChange={(e) => set("maxAgencyFee", e.target.value.replace(/\D/g, ""))}
        />
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

  return (
    <div className="mx-auto max-w-[1320px] px-6 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-serif text-[clamp(34px,4vw,48px)] leading-tight">Find a house near OAU</h1>
          <p className="mt-1.5 text-mut">{loading ? "Searching..." : `${data.total} ${data.total === 1 ? "house" : "houses"} match`}</p>
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
            <input className="input pl-11" placeholder="Search by title, street or area" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn btn-teal">Search</button>
        </form>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[290px_1fr]">
        <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
          <div className="panel p-5 lg:sticky lg:top-28">
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
            <label className="ml-auto flex items-center gap-2 text-sm font-semibold text-mut">
              <span className="hidden sm:inline">Sort by</span>
              <select className="input h-10 w-auto py-0" value={params.get("sort") || "newest"} onChange={(e) => set("sort", e.target.value === "newest" ? "" : e.target.value)}>
                {Object.entries(SORTS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <ErrorNote>{error}</ErrorNote>

          {loading && !data.listings.length ? (
            <Spinner label="Finding houses" />
          ) : data.listings.length === 0 ? (
            <EmptyState
              title="No houses match these filters"
              text="Try a higher budget, a different area, or fewer amenities."
              action={
                <button onClick={clearAll} className="btn btn-gold">
                  Clear filters
                </button>
              }
            />
          ) : (
            <>
              <div className={`grid gap-6 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${loading ? "opacity-50" : ""}`}>
                {data.listings.map((l) => (
                  <ListingCard key={l._id} listing={l} />
                ))}
              </div>

              {data.pages > 1 && (
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
