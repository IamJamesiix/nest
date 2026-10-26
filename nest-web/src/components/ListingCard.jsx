import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCompare } from "../context/CompareContext";
import { useToast } from "../context/ToastContext";
import { confirmedText, naira, PERIOD_SHORT, roomLabel, walkText } from "../utils/format";
import { Icon, Photo, Rating, StatusBadge, VerifiedBadge } from "./ui";

// bookmark state + toggle, shared by cards and the details page
export function useBookmark(listingId) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const saved = !!user?.bookmarks?.includes(listingId);

  const toggle = async () => {
    if (!user) return navigate("/login");
    if (user.role !== "student") return toast("Only house finders can save houses", "error");
    setBusy(true);
    try {
      const res = saved ? await api.delete(`/bookmarks/${listingId}`) : await api.post(`/bookmarks/${listingId}`);
      setUser({ ...user, bookmarks: res.data.bookmarks.map(String) });
      toast(saved ? "Removed from favourites" : "Saved to favourites");
    } catch (err) {
      toast(errMsg(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return { saved, toggle, busy };
}

export default function ListingCard({ listing, showCompare = true }) {
  const { saved, toggle, busy } = useBookmark(listing._id);
  const compare = useCompare();
  const toast = useToast();
  const verified = listing.agent?.agentInfo?.verificationStatus === "approved";
  const inCompare = compare.has(listing._id);

  const onCompare = () => {
    const ok = compare.toggle(listing);
    if (!ok) toast("You can compare up to 4 houses", "error");
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-sf transition-shadow hover:shadow-soft">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Link to={`/listings/${listing._id}`} tabIndex={-1}>
          <Photo src={listing.photos?.[0]} alt={listing.title} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]" />
        </Link>
        <StatusBadge status={listing.status} className="absolute left-3 top-3 shadow-sm" />
        <button
          onClick={toggle}
          disabled={busy}
          aria-label={saved ? "Remove from favourites" : "Save to favourites"}
          aria-pressed={saved}
          className={`absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-glass backdrop-blur transition-colors ${saved ? "text-bad" : "text-ink hover:text-bad"}`}
        >
          <Icon name="heart" fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2 text-[13px] text-mut">
          <span className="font-semibold">
            {roomLabel(listing.roomType)} in {listing.area}
          </span>
          <Rating value={listing.avgRating} count={listing.reviewCount} />
        </div>

        <Link to={`/listings/${listing._id}`} className="mt-1.5">
          <h3 className="h-serif text-[21px] leading-snug group-hover:text-tealt">{listing.title}</h3>
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-mut">
          {listing.distanceFromCampusKm != null && (
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" size={14} /> {listing.distanceFromCampusKm} km · {walkText(listing.distanceFromCampusKm)}
            </span>
          )}
          {listing.isShared && <span className="font-semibold text-tealt">Shareable</span>}
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-3 border-t border-line pt-4">
            <div>
              <p className="text-xs text-mut">Total to move in</p>
              <p className="text-xl font-bold text-ink">{naira(listing.totalCost)}</p>
              <p className="text-xs text-mut">
                Rent {naira(listing.rent)} {PERIOD_SHORT[listing.rentPeriod]}
              </p>
            </div>
            <div className="text-right text-xs text-mut">
              {verified && <VerifiedBadge small />}
              <p className="mt-1">{confirmedText(listing.lastConfirmedAt)}</p>
            </div>
          </div>

          {showCompare && (
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-mut">
              <input type="checkbox" checked={inCompare} onChange={onCompare} className="h-4 w-4 accent-teal" />
              Add to compare
            </label>
          )}
        </div>
      </div>
    </article>
  );
}
