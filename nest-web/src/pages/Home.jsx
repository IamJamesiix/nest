import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import CampusMap from "../components/CampusMap";
import ListingCard from "../components/ListingCard";
import { EmptyState, Icon, Spinner } from "../components/ui";
import { CAMPUS, naira, roomLabel } from "../utils/format";
import { LocationPanel } from "../components/LocationPanel";
import { useUserLocation } from "../context/LocationContext";
import Select from "../components/Select";

const FEATURES = [
  { icon: "shield", title: "Verified agents", text: "Every agent sends an ID and gets checked before they can post a house." },
  { icon: "receipt", title: "Full cost upfront", text: "Rent, agency, legal and caution fees, added up before you go." },
  { icon: "clock", title: "Always up to date", text: "Listings expire unless the agent reconfirms them every 30 days." },
  { icon: "calendar", title: "Book inspections", text: "Pick a date and time, and the agent confirms it in the app." },
];

export default function Home() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [area, setArea] = useState("");
  const [budget, setBudget] = useState("");
  const [roomType, setRoomType] = useState("");
  const [withMate, setWithMate] = useState(false);
  const [areas, setAreas] = useState([]);
  const { loc } = useUserLocation();
  const center = loc || { ...CAMPUS, source: "campus" };

  // houses near the user (or near OAU until they share their location)
  useEffect(() => {
    let live = true;
    setLoading(true);
    api
      .get("/listings", { params: { lat: center.lat, lng: center.lng, radiusKm: 10, limit: 12 } })
      .then((res) => live && setListings(res.data.listings))
      .catch(() => live && setListings([]))
      .finally(() => live && setLoading(false));
    api
      .get("/listings/areas/nearby", { params: { lat: center.lat, lng: center.lng, radiusKm: 10 } })
      .then((res) => live && setAreas(res.data.areas || []))
      .catch(() => live && setAreas([]));
    return () => {
      live = false;
    };
  }, [center.lat, center.lng]);

  const search = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (area) params.set("area", area);
    if (budget) params.set("maxBudget", budget.replace(/\D/g, ""));
    if (roomType) params.set("roomType", roomType);
    if (withMate) params.set("shared", "true");
    navigate(`/listings?${params}`);
  };

  const cheapest = listings.length ? Math.min(...listings.map((l) => l.totalCost)) : null;

  return (
    <>
      {/* hero */}
      <section className="mx-auto grid max-w-[1320px] items-center gap-12 px-6 pb-10 pt-14 lg:grid-cols-[1.05fr_1fr]">
        <div className="rise">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-sf px-3.5 py-2 text-[13px] font-semibold text-goldt">
            <span className="h-2 w-2 rounded-full bg-gold" />
            Off-campus housing around OAU, Ile-Ife
          </p>
          <h1 className="h-serif mt-6 text-[clamp(44px,6vw,80px)] leading-[1.03] tracking-[-0.02em]">
            A place near campus that feels like home.
          </h1>
          <p className="mt-6 max-w-[520px] text-lg leading-relaxed text-mut">
            Browse verified houses around school, see the full cost before you go, and book an inspection with the agent in a few taps.
          </p>

          <div className="mt-8 inline-flex gap-1 rounded-full border border-line bg-sf p-1">
            {[
              [false, "Looking alone"],
              [true, "With a roommate"],
            ].map(([val, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setWithMate(val)}
                aria-pressed={withMate === val}
                className={`h-10 rounded-full px-5 text-sm font-bold transition-colors ${withMate === val ? "bg-teal text-onteal" : "text-ink hover:bg-sf2"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {withMate && (
            <p className="mt-2.5 text-sm text-mut">
              We'll show houses you can share first. No roommate yet?{" "}
              <Link to="/roommates" className="font-bold text-goldt underline-offset-4 hover:underline">
                Find one
              </Link>
            </p>
          )}

          <form onSubmit={search} className="mt-4 flex flex-wrap gap-1.5 rounded-[28px] border border-glassline bg-glass p-2.5 shadow-soft backdrop-blur-xl">
            <div className="flex min-w-[150px] flex-[1.25] flex-col gap-1 rounded-2xl px-4 py-2 text-xs font-semibold text-mut">
              <span>Area</span>
              <Select
                variant="bare"
                label="Area"
                value={area}
                onChange={setArea}
                options={[{ value: "", label: areas.length ? "Any area" : "No areas yet" }, ...areas.map((a) => ({ value: a.area, label: `${a.area} · ${a.houses}` }))]}
              />
            </div>
            <label className="flex min-w-[120px] flex-1 flex-col gap-1 rounded-2xl border-line px-4 py-2 text-xs font-semibold text-mut sm:border-l">
              {withMate ? "Max total (whole house)" : "Max total budget"}
              <input
                inputMode="numeric"
                value={budget ? naira(budget.replace(/\D/g, "")) : ""}
                onChange={(e) => setBudget(e.target.value.replace(/\D/g, ""))}
                placeholder="₦300,000"
                className="bg-transparent text-[15px] font-semibold text-ink outline-none placeholder:text-mut/50"
              />
            </label>
            <div className="flex min-w-[120px] flex-1 flex-col gap-1 rounded-2xl border-line px-4 py-2 text-xs font-semibold text-mut sm:border-l">
              <span>Room type</span>
              <Select
                variant="bare"
                label="Room type"
                value={roomType}
                onChange={setRoomType}
                options={[
                  { value: "", label: "Any type" },
                  ...["self_contained", "single_room", "room_and_parlour", "mini_flat", "shared_apartment", "hostel"].map((t) => ({ value: t, label: roomLabel(t) })),
                ]}
              />
            </div>
            <button className="btn btn-gold h-14 w-full rounded-2xl px-6 sm:w-auto">
              <Icon name="search" /> Search
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/listings?electricity24=true"
              className="inline-flex items-center gap-1.5 rounded-full border border-pdline bg-pdb px-3.5 py-2 text-[13px] font-bold text-pdt hover:brightness-95"
            >
              <Icon name="bolt" size={14} fill="currentColor" />
              24hrs Electricity
            </Link>
            {[
              ["Self-contained", "/listings?roomType=self_contained"],
              ["Under ₦150k", "/listings?maxBudget=150000"],
              ["No agency fee", "/listings?noAgencyFee=true"],
            ].map(([label, to]) => (
              <Link key={label} to={to} className="rounded-full border border-line bg-sf px-3.5 py-2 text-[13px] font-medium hover:bg-sf2">
                {label}
              </Link>
            ))}
          </div>

          <LocationPanel className="mt-5" />
        </div>

        <div className="relative">
          <CampusMap listings={listings} center={center} className="aspect-[6/5] shadow-soft" />
          <div className="absolute left-5 top-5 hidden items-center gap-3 rounded-2xl sm:flex border border-glassline bg-glass px-4 py-3 backdrop-blur">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal text-gold">
              <Icon name="pin" />
            </span>
            <div>
              <p className="text-sm font-bold">{center.source === "campus" ? "Houses around OAU" : "Houses around you"}</p>
              <p className="text-xs text-mut">{loading ? "Finding houses…" : cheapest ? `From ${naira(cheapest)} all-in` : "No houses within 10 km yet"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* why nest */}
      <section className="mx-auto grid max-w-[1320px] gap-4 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex gap-4 rounded-3xl border border-line bg-sf p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-pdb text-goldt">
              <Icon name={f.icon} />
            </span>
            <div>
              <h3 className="font-bold">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-mut">{f.text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* featured */}
      <section className="mx-auto max-w-[1320px] px-6 pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div>
            <h2 className="h-serif text-[clamp(32px,4vw,48px)] leading-tight">{center.source === "campus" ? "Houses near OAU" : "Houses near you"}</h2>
            <p className="mt-2 text-mut">Nearest first, from verified agents.</p>
          </div>
          <Link to="/listings" className="btn btn-ghost">
            See all houses
          </Link>
        </div>
        <div className="mt-8">
          {loading ? (
            <Spinner label="Finding houses" />
          ) : listings.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.slice(0, 6).map((l) => (
                <ListingCard key={l._id} listing={l} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={center.source === "campus" ? "No houses near OAU yet" : "No houses near you yet"}
              text="Verified agents are adding houses. Check back soon, or try a wider search."
              action={
                <Link to="/listings?radiusKm=50" className="btn btn-gold">
                  Search further away
                </Link>
              }
            />
          )}
        </div>
      </section>

      {/* two ways in */}
      <section className="mx-auto grid max-w-[1320px] gap-5 px-6 pt-20 md:grid-cols-2">
        <div className="rounded-[32px] bg-teal p-8 text-onteal sm:p-10">
          <h2 className="h-serif text-[34px] leading-tight">Share a house, split the cost</h2>
          <p className="mt-3 max-w-md text-onteal/75">
            Make a roommate profile with your budget, areas and habits. Nest ranks students who fit, so you can split rent and fees.
          </p>
          <Link to="/roommates" className="btn btn-gold mt-7">
            Find a roommate
          </Link>
        </div>
        <div className="rounded-[32px] border border-line bg-sf2 p-8 sm:p-10">
          <h2 className="h-serif text-[34px] leading-tight">Are you an agent?</h2>
          <p className="mt-3 max-w-md text-mut">
            Get verified once with your ID, then list houses, keep them up to date, and handle inspection requests in one place.
          </p>
          <Link to="/register?role=agent" className="btn btn-teal mt-7">
            Register as an agent
          </Link>
        </div>
      </section>
    </>
  );
}
