import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../../api/client";
import { EmptyState, ErrorNote, Icon, PageTitle, Photo, Spinner, StatusBadge } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { fmtDateTime, naira } from "../../utils/format";

const ACTIVE = ["pending", "confirmed", "rescheduled"];

// the time that matters: the proposed one if the agent moved it
const whenOf = (i) => new Date(i.status === "rescheduled" && i.proposedDate ? i.proposedDate : i.requestedDate);

function InspectionRow({ item, onAction }) {
  const listing = item.listing || {};
  const canCancel = ACTIVE.includes(item.status);

  return (
    <div className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <Photo src={listing.photos?.[0]} className="aspect-[4/3] w-full shrink-0 rounded-2xl sm:w-36" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={item.status} />
          {listing.totalCost != null && <span className="text-xs font-semibold text-mut">{naira(listing.totalCost)} total</span>}
        </div>
        <Link to={`/listings/${listing._id}`} className="h-serif mt-1.5 block text-xl hover:text-tealt">
          {listing.title || "Listing removed"}
        </Link>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-mut">
          <Icon name="calendar" size={15} />
          {item.status === "rescheduled" ? (
            <>
              <span className="line-through">{fmtDateTime(item.requestedDate)}</span>
              <span className="font-bold text-pdt">New time: {fmtDateTime(item.proposedDate)}</span>
            </>
          ) : (
            fmtDateTime(item.requestedDate)
          )}
        </p>
        <p className="mt-1 text-sm text-mut">
          Agent: <span className="font-semibold text-ink">{item.agent?.agentInfo?.businessName || item.agent?.name}</span>
          {item.agent?.phone && (
            <a href={`tel:${item.agent.phone}`} className="ml-2 font-semibold text-tealt hover:underline">
              {item.agent.phone}
            </a>
          )}
        </p>
        {item.agentNote && <p className="mt-2 rounded-xl bg-sf2 px-3 py-2 text-sm">“{item.agentNote}”</p>}
      </div>
      <div className="flex shrink-0 gap-2 sm:flex-col">
        {item.status === "rescheduled" && (
          <button onClick={() => onAction(item._id, "accept")} className="btn btn-gold btn-sm">
            Accept new time
          </button>
        )}
        {canCancel && (
          <button onClick={() => onAction(item._id, "cancel")} className="btn btn-ghost btn-sm">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default function MyInspections() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/inspections/mine")
      .then((res) => setItems(res.data.inspections))
      .catch((err) => setError(errMsg(err)));

  useEffect(() => {
    load();
  }, []);

  const onAction = async (id, action) => {
    if (action === "cancel" && !window.confirm("Cancel this inspection?")) return;
    try {
      await api.patch(`/inspections/${id}/${action}`);
      toast(action === "accept" ? "New time accepted. See you there." : "Inspection cancelled");
      load();
    } catch (err) {
      toast(errMsg(err), "error");
    }
  };

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!items) return <Spinner label="Loading inspections" />;

  const now = Date.now();
  const upcoming = items.filter((i) => ACTIVE.includes(i.status) && whenOf(i) >= now).sort((a, b) => whenOf(a) - whenOf(b));
  const past = items.filter((i) => !upcoming.includes(i));

  return (
    <>
      <PageTitle title="My inspections" text="Houses you've asked to see, and what the agents said." />
      {items.length === 0 ? (
        <EmptyState
          title="No inspections yet"
          text="Open any house and pick a day and time to see it in person."
          action={
            <Link to="/listings" className="btn btn-gold">
              Find a house
            </Link>
          }
        />
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-lg font-bold">Upcoming ({upcoming.length})</h2>
            {upcoming.length ? (
              <div className="space-y-3">
                {upcoming.map((i) => (
                  <InspectionRow key={i._id} item={i} onAction={onAction} />
                ))}
              </div>
            ) : (
              <p className="panel p-5 text-sm text-mut">Nothing coming up.</p>
            )}
          </section>
          {past.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-bold">Past and closed ({past.length})</h2>
              <div className="space-y-3 opacity-90">
                {past.map((i) => (
                  <InspectionRow key={i._id} item={i} onAction={onAction} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
