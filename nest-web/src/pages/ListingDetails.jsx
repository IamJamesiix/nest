import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { useBookmark } from "../components/ListingCard";
import ReportModal from "../components/ReportModal";
import { Avatar, EmptyState, ErrorNote, Icon, LightBadge, Photo, Rating, Spinner, Stars, StatusBadge, VerifiedBadge } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useCompare } from "../context/CompareContext";
import { useToast } from "../context/ToastContext";
import { confirmedText, ELECTRICITY, fmtDate, has24Light, naira, RENT_PERIODS, roomLabel, walkText } from "../utils/format";
import useAmenities, { labelFrom } from "../utils/useAmenities";

const TIMES = ["9:00", "11:00", "13:00", "15:00", "16:30"];
const timeLabel = (t) => {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

// ---------- cost breakdown with split selector ----------
function CostCard({ listingId, initial }) {
  const [split, setSplit] = useState(1);
  const [cost, setCost] = useState(initial);

  useEffect(() => {
    if (split === 1) return setCost(initial);
    api.get(`/listings/${listingId}/cost`, { params: { split } }).then((res) => setCost(res.data));
  }, [split, listingId, initial]);

  return (
    <div className="rounded-[28px] bg-teal p-6 text-onteal">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-gold">Cost breakdown</h2>
        <label className="flex items-center gap-2 text-xs font-semibold text-onteal/75">
          Split with
          <select value={split} onChange={(e) => setSplit(Number(e.target.value))} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-onteal outline-none">
            <option value={1} className="text-ink">
              Just me
            </option>
            {[2, 3, 4].map((n) => (
              <option key={n} value={n} className="text-ink">
                {n} people
              </option>
            ))}
          </select>
        </label>
      </div>

      <table className="mt-5 w-full text-sm">
        <tbody>
          {cost.items.map((item) => (
            <tr key={item.name} className="border-b border-white/10">
              <td className="py-2.5 text-onteal/80">
                {item.name}
                {item.note && <span className="text-onteal/50"> ({item.note})</span>}
              </td>
              <td className="py-2.5 text-right font-bold">{naira(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5">
        <span className="text-sm text-onteal/80">Total to move in</span>
        <span className="h-serif text-[28px] text-gold">{naira(cost.total)}</span>
      </div>
      {split > 1 && (
        <p className="mt-3 rounded-2xl bg-gold px-4 py-3 text-sm font-bold text-[#1a1405]">
          {naira(cost.perPerson)} each when split between {split}
        </p>
      )}
      <p className="mt-3 text-xs text-onteal/55">Caution fee is usually refundable when you move out. Ask the agent to confirm.</p>
    </div>
  );
}

// ---------- inspection booking ----------
function BookInspection({ listing }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i + 1);
        return d;
      }),
    []
  );
  const [day, setDay] = useState(0);
  const [time, setTime] = useState("11:00");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const chosen = new Date(days[day]);
  const [h, m] = time.split(":").map(Number);
  chosen.setHours(h, m, 0, 0);

  const book = async () => {
    if (!user) return navigate(`/login?next=/listings/${listing._id}`);
    setSending(true);
    setError("");
    try {
      await api.post("/inspections", { listing: listing._id, date: chosen.toISOString(), note });
      toast("Inspection requested. The agent will confirm.");
      navigate("/me/inspections");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSending(false);
    }
  };

  if (user && user.role !== "student") {
    return (
      <div className="panel p-6 text-sm text-mut">
        <h2 className="h-serif mb-1 text-2xl text-ink">Book an inspection</h2>
        Only house finder accounts can book inspections.
      </div>
    );
  }

  if (listing.status !== "available") {
    return (
      <div className="panel p-6 text-sm text-mut">
        <h2 className="h-serif mb-1 text-2xl text-ink">Book an inspection</h2>
        This house is {listing.status}, so inspections are closed for now.
      </div>
    );
  }

  return (
    <div className="panel p-6">
      <h2 className="h-serif text-2xl">Book an inspection</h2>
      <p className="mt-1 text-sm text-mut">Pick a day and time. The agent will confirm or suggest another time.</p>

      <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-4 xl:grid-cols-7">
        {days.map((d, i) => (
          <button
            key={i}
            onClick={() => setDay(i)}
            aria-pressed={day === i}
            className={`rounded-2xl border py-2 text-center transition-colors ${day === i ? "border-teal bg-teal text-onteal" : "border-line bg-sf hover:bg-sf2"}`}
          >
            <span className="block text-[11px] font-semibold opacity-75">{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
            <span className="block text-lg font-bold">{d.getDate()}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {TIMES.map((t) => (
          <button
            key={t}
            onClick={() => setTime(t)}
            aria-pressed={time === t}
            className={`rounded-2xl border py-2.5 text-sm font-semibold ${time === t ? "border-teal bg-teal text-onteal" : "border-line bg-sf hover:bg-sf2"}`}
          >
            {timeLabel(t)}
          </button>
        ))}
      </div>

      <label className="label mt-4" htmlFor="note">
        Note to agent (optional)
      </label>
      <textarea id="note" rows={2} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="I'll come with my roommate" />

      <div className="mt-4">
        <ErrorNote>{error}</ErrorNote>
      </div>
      <button onClick={book} disabled={sending} className="btn btn-gold mt-3 h-12 w-full">
        {sending
          ? "Sending..."
          : user
            ? `Request ${chosen.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}, ${timeLabel(time)}`
            : "Sign in to book"}
      </button>
    </div>
  );
}

// ---------- reviews ----------
function Reviews({ listingId, onChange }) {
  const { user } = useAuth();
  const toast = useToast();
  const [reviews, setReviews] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const load = () => api.get(`/listings/${listingId}/reviews`).then((res) => setReviews(res.data.reviews));
  useEffect(() => {
    load();
  }, [listingId]);

  const mine = reviews?.find((r) => r.student?._id === user?._id);

  const startEdit = () => {
    setRating(mine.rating);
    setComment(mine.comment || "");
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (mine) await api.patch(`/listings/${listingId}/reviews`, { rating, comment });
      else await api.post(`/listings/${listingId}/reviews`, { rating, comment });
      toast(mine ? "Review updated" : "Thanks for your review");
      setEditing(false);
      setComment("");
      await load();
      onChange();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const remove = async () => {
    await api.delete(`/listings/${listingId}/reviews`);
    toast("Review deleted");
    await load();
    onChange();
  };

  if (!reviews) return <Spinner label="Loading reviews" />;
  const showForm = user?.role === "student" && (!mine || editing);

  return (
    <div>
      {showForm && (
        <form onSubmit={save} className="panel mb-5 p-5">
          <p className="text-sm font-bold">{mine ? "Edit your review" : "Lived here or inspected it? Leave a review"}</p>
          <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} stars`} className="text-gold">
                <Icon name="star" size={28} fill={n <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <textarea rows={3} className="input mt-3" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Water, light, security, the agent..." />
          <div className="mt-3">
            <ErrorNote>{error}</ErrorNote>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="btn btn-teal">{mine ? "Save review" : "Post review"}</button>
            {editing && (
              <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost">
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {reviews.length === 0 ? (
        <p className="panel p-6 text-sm text-mut">No reviews yet. Students who inspect or live here can rate it.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.map((r) => (
            <div key={r._id} className="rounded-3xl bg-sf2 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={r.student?.name} dark />
                  <div>
                    <p className="font-bold">{r.student?.name}</p>
                    <p className="text-xs text-mut">{fmtDate(r.createdAt)}</p>
                  </div>
                </div>
                <Stars value={r.rating} />
              </div>
              {r.comment && <p className="mt-3 text-[15px] leading-relaxed">{r.comment}</p>}
              {r._id === mine?._id && !editing && (
                <div className="mt-3 flex gap-3 text-sm font-semibold">
                  <button onClick={startEdit} className="text-tealt hover:underline">
                    Edit
                  </button>
                  <button onClick={remove} className="text-bad hover:underline">
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- page ----------
export default function ListingDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const compare = useCompare();
  const toast = useToast();
  const { saved, toggle, busy } = useBookmark(id);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState(0);
  const [reporting, setReporting] = useState(false);
  const amenityList = useAmenities();

  const load = () =>
    api
      .get(`/listings/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(errMsg(err)));

  useEffect(() => {
    setData(null);
    setPhoto(0);
    load();
  }, [id]);

  if (error)
    return (
      <div className="mx-auto max-w-xl px-6 py-24">
        <EmptyState title="We couldn't open this house" text={error} action={<Link to="/listings" className="btn btn-gold">Browse houses</Link>} />
      </div>
    );
  if (!data) return <Spinner label="Opening house" />;

  const { listing, costBreakdown } = data;
  const agent = listing.agent || {};
  const verified = agent.agentInfo?.verificationStatus === "approved";
  const photos = listing.photos?.length ? listing.photos : [null];

  const onCompare = () => {
    if (!compare.toggle(listing)) toast("You can compare up to 4 houses", "error");
  };

  return (
    <div className="mx-auto max-w-[1320px] px-6 pt-8">
      <Link to="/listings" className="text-sm font-semibold text-mut hover:text-ink">
        Back to houses
      </Link>

      {/* gallery */}
      <div className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr]">
        <Photo src={photos[photo]} alt={listing.title} className="aspect-[16/10] w-full rounded-[28px]" />
        {photos.length > 1 && (
          <div className="grid grid-cols-4 gap-3 md:grid-cols-2 md:content-start">
            {photos.map((p, i) => (
              <button
                key={i}
                onClick={() => setPhoto(i)}
                aria-label={`Photo ${i + 1}`}
                className={`overflow-hidden rounded-2xl ring-offset-2 ring-offset-bg ${photo === i ? "ring-2 ring-teal" : "opacity-80 hover:opacity-100"}`}
              >
                <Photo src={p} className="aspect-[4/3] w-full" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* title row */}
      <div className="mt-7 flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={listing.status} />
            {has24Light(listing) && <LightBadge />}
            <span className="rounded-full border border-line bg-sf px-3 py-1 text-xs font-semibold text-mut">{confirmedText(listing.lastConfirmedAt)} by the agent</span>
          </div>
          <h1 className="h-serif mt-3 text-[clamp(32px,4vw,50px)] leading-[1.08]">{listing.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-mut">
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" size={16} /> {listing.address ? `${listing.address}, ` : ""}
              {listing.area}
            </span>
            {listing.distanceFromCampusKm != null && (
              <span>
                {listing.distanceFromCampusKm} km to campus · {walkText(listing.distanceFromCampusKm)}
              </span>
            )}
            <Rating value={listing.avgRating} count={listing.reviewCount} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={toggle} disabled={busy} className={`btn btn-ghost ${saved ? "text-bad" : ""}`}>
            <Icon name="heart" fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save"}
          </button>
          <button onClick={onCompare} className="btn btn-ghost">
            <Icon name="compare" /> {compare.has(listing._id) ? "In compare" : "Add to compare"}
          </button>
          <button onClick={() => (user ? setReporting(true) : navigate("/login"))} className="btn btn-ghost text-mut">
            <Icon name="flag" /> Report
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-10">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Room type", roomLabel(listing.roomType)],
              ["Rooms", `${listing.bedrooms || 1} bed · ${listing.bathrooms || 1} bath`],
              ["Rent period", RENT_PERIODS[listing.rentPeriod]],
              ["Sharing", listing.isShared ? `Yes, ${listing.spacesForRoommates || 1} space${listing.spacesForRoommates > 1 ? "s" : ""}` : "No"],
            ].map(([k, v]) => (
              <div key={k} className="panel p-4">
                <p className="text-xs font-semibold text-mut">{k}</p>
                <p className="mt-1 font-bold">{v}</p>
              </div>
            ))}
          </div>

          <section>
            <h2 className="h-serif text-[28px]">About this house</h2>
            <p className="mt-3 max-w-[70ch] whitespace-pre-line text-[15px] leading-relaxed text-mut">{listing.description || "The agent hasn't added a description yet."}</p>
          </section>

          {listing.amenities?.length > 0 && (
            <section>
              <h2 className="h-serif text-[28px]">Facilities and amenities</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {listing.amenities.map((a) => (
                  <div
                    key={a}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${a === ELECTRICITY ? "bg-pdb text-pdt" : "bg-sf2"}`}
                  >
                    <span className={`grid h-7 w-7 place-items-center rounded-lg bg-sf ${a === ELECTRICITY ? "text-goldt" : "text-tealt"}`}>
                      <Icon name={a === ELECTRICITY ? "bolt" : "check"} size={16} />
                    </span>
                    {labelFrom(amenityList, a)}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="h-serif mb-4 text-[28px]">Reviews and ratings</h2>
            <Reviews listingId={listing._id} onChange={load} />
          </section>
        </div>

        <div className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <CostCard listingId={listing._id} initial={costBreakdown} />
          <BookInspection listing={listing} />

          <div className="panel p-5">
            <div className="flex items-center gap-3">
              <Avatar name={agent.agentInfo?.businessName || agent.name} size="h-12 w-12" />
              <div className="min-w-0">
                <Link to={`/agents/${agent._id}`} className="block truncate font-bold hover:text-tealt">
                  {agent.agentInfo?.businessName || agent.name}
                </Link>
                {verified ? <VerifiedBadge small /> : <span className="text-xs text-mut">Not verified</span>}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link to={`/agents/${agent._id}`} className="btn btn-ghost btn-sm">
                View profile
              </Link>
              {agent.phone ? (
                <a href={`tel:${agent.phone}`} className="btn btn-ghost btn-sm">
                  <Icon name="phone" size={15} /> Call
                </a>
              ) : (
                <span />
              )}
            </div>
          </div>
        </div>
      </div>

      <ReportModal open={reporting} onClose={() => setReporting(false)} listingId={listing._id} name="this listing" />
    </div>
  );
}
