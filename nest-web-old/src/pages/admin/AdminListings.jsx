import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../../api/client";
import { EmptyState, ErrorNote, PageTitle, Photo, Spinner, StatusBadge } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { confirmedText, naira, roomLabel } from "../../utils/format";

const TABS = [
  ["", "All"],
  ["available", "Available"],
  ["pending", "Pending"],
  ["rented", "Rented"],
  ["expired", "Expired"],
];

export default function AdminListings() {
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [listings, setListings] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/admin/listings", { params: status ? { status } : {} })
      .then((res) => setListings(res.data.listings))
      .catch((err) => setError(errMsg(err)));

  useEffect(() => {
    setListings(null);
    load();
  }, [status]);

  const remove = async (l) => {
    if (!window.confirm(`Remove "${l.title}" from Nest?`)) return;
    try {
      await api.delete(`/admin/listings/${l._id}`);
      toast("Listing removed");
      load();
    } catch (err) {
      toast(errMsg(err), "error");
    }
  };

  return (
    <>
      <PageTitle title="All listings" text="Remove fake or broken listings." />
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(([v, l]) => (
          <button key={v} onClick={() => setStatus(v)} className={`rounded-full px-4 py-2 text-sm font-semibold ${status === v ? "bg-teal text-onteal" : "border border-line bg-sf hover:bg-sf2"}`}>
            {l}
          </button>
        ))}
      </div>

      <ErrorNote>{error}</ErrorNote>
      {!listings ? (
        <Spinner label="Loading listings" />
      ) : listings.length === 0 ? (
        <EmptyState title="No listings here" />
      ) : (
        <div className="overflow-x-auto rounded-[28px] border border-line bg-sf">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs text-mut">
              <tr>
                <th className="p-4 font-semibold">House</th>
                <th className="p-4 font-semibold">Agent</th>
                <th className="p-4 font-semibold">Total</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l._id} className="border-t border-line">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Photo src={l.photos?.[0]} className="h-12 w-16 shrink-0 rounded-xl" />
                      <div>
                        <Link to={`/listings/${l._id}`} className="font-bold hover:text-tealt">
                          {l.title}
                        </Link>
                        <p className="text-xs text-mut">
                          {roomLabel(l.roomType)} · {l.area} · {confirmedText(l.lastConfirmedAt)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-mut">{l.agent?.agentInfo?.businessName || l.agent?.name || "Unknown"}</td>
                  <td className="p-4 font-bold">{naira(l.totalCost)}</td>
                  <td className="p-4">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => remove(l)} className="btn btn-danger btn-sm">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
