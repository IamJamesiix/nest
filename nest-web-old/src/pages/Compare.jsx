import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { EmptyState, ErrorNote, Icon, Photo, Spinner, StatusBadge } from "../components/ui";
import { useCompare } from "../context/CompareContext";
import { amenityLabel, confirmedText, ELECTRICITY, naira, RENT_PERIODS, roomLabel } from "../utils/format";

const TAGS = {
  cheapest: { label: "Cheapest", cls: "bg-okb text-okt" },
  closest: { label: "Closest", cls: "bg-tealb text-tealt" },
  bestRated: { label: "Best rated", cls: "bg-pdb text-pdt" },
};

export default function Compare() {
  const { items, remove, clear } = useCompare();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const ids = items.map((i) => i._id).join(",");

  useEffect(() => {
    if (items.length < 2) return setData(null);
    setError("");
    api
      .get("/listings/compare", { params: { ids } })
      .then((res) => setData(res.data))
      .catch((err) => setError(errMsg(err)));
  }, [ids]);

  if (items.length < 2) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20">
        <EmptyState
          title={items.length ? "Pick one more house" : "Compare houses side by side"}
          text="Tick “Add to compare” on 2 to 4 houses to see their cost, distance and ratings next to each other."
          action={
            <Link to="/listings" className="btn btn-gold">
              Browse houses
            </Link>
          }
        />
      </div>
    );
  }

  if (error)
    return (
      <div className="mx-auto max-w-xl px-6 py-20">
        <ErrorNote>{error}</ErrorNote>
      </div>
    );
  if (!data) return <Spinner label="Comparing" />;

  const { listings, highlights } = data;
  const tagsFor = (id) => Object.keys(TAGS).filter((k) => highlights[k] && String(highlights[k]) === String(id));
  const allAmenities = [...new Set(listings.flatMap((l) => l.amenities))];

  const rows = [
    ["Total to move in", (l) => <span className="text-lg font-bold">{naira(l.totalCost)}</span>, "cheapest"],
    ["Rent", (l) => `${naira(l.rent)} (${RENT_PERIODS[l.rentPeriod]?.toLowerCase()})`],
    ["24hrs light", (l) => (l.amenities.includes(ELECTRICITY) ? <span className="font-bold text-goldt">⚡ Yes</span> : "No")],
    ["Agency fee", (l) => (l.agencyFee ? naira(l.agencyFee) : "None")],
    ["Distance to campus", (l) => (l.distanceFromCampusKm != null ? `${l.distanceFromCampusKm} km` : "Not given"), "closest"],
    ["Rating", (l) => (l.reviewCount ? `${l.avgRating.toFixed(1)} ★ (${l.reviewCount})` : "No reviews"), "bestRated"],
    ["Room type", (l) => roomLabel(l.roomType)],
    ["Bedrooms", (l) => l.bedrooms || 1],
    ["Can share", (l) => (l.isShared ? "Yes" : "No")],
    ["Area", (l) => l.area],
    ["Status", (l) => <StatusBadge status={l.status} />],
    ["Agent", (l) => (l.agentVerified ? <span className="font-semibold text-okt">Verified</span> : "Not verified")],
    ["Last confirmed", (l) => confirmedText(l.lastConfirmedAt)],
  ];

  return (
    <div className="mx-auto max-w-[1320px] px-6 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-serif text-[clamp(34px,4vw,48px)] leading-tight">Compare houses</h1>
          <p className="mt-1.5 text-mut">The best value in each row is marked so you can decide faster.</p>
        </div>
        <button onClick={clear} className="btn btn-ghost">
          Clear compare
        </button>
      </div>

      <div className="mt-8 overflow-x-auto rounded-[28px] border border-line bg-sf">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr>
              <th className="w-48 p-5" />
              {listings.map((l) => (
                <th key={l.id} className="p-5 align-top font-normal">
                  <Photo src={l.photo} className="aspect-[4/3] w-full rounded-2xl" />
                  <Link to={`/listings/${l.id}`} className="h-serif mt-3 block text-lg leading-snug hover:text-tealt">
                    {l.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tagsFor(l.id).map((t) => (
                      <span key={t} className={`rounded-full px-2.5 py-1 text-xs font-bold ${TAGS[t].cls}`}>
                        {TAGS[t].label}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => remove(l.id)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-mut hover:text-bad">
                    <Icon name="x" size={13} /> Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, render, hl]) => (
              <tr key={label} className="border-t border-line">
                <th className="p-5 text-[13px] font-semibold text-mut">{label}</th>
                {listings.map((l) => {
                  const best = hl && String(highlights[hl]) === String(l.id);
                  return (
                    <td key={l.id} className={`p-5 ${best ? "bg-okb/70 font-semibold text-okt" : ""}`}>
                      {render(l)}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-line">
              <th className="p-5 align-top text-[13px] font-semibold text-mut">Amenities</th>
              {listings.map((l) => (
                <td key={l.id} className="p-5 align-top">
                  <ul className="space-y-1.5">
                    {allAmenities.map((a) => (
                      <li key={a} className={`flex items-center gap-2 ${l.amenities.includes(a) ? "" : "text-mut/50 line-through"}`}>
                        <Icon name={l.amenities.includes(a) ? "check" : "x"} size={14} className={l.amenities.includes(a) ? "text-okt" : ""} />
                        {amenityLabel(a)}
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
