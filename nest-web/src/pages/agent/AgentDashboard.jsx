import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../../api/client";
import { EmptyState, ErrorNote, Icon, PageTitle, Photo, Spinner, StatusBadge } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { daysAgo, naira, roomLabel } from "../../utils/format";

// shows where the agent is with verification
export function VerificationBanner({ info }) {
  const status = info?.verificationStatus || "not_submitted";
  if (status === "approved") return null;

  const copy = {
    not_submitted: ["Get verified to start listing", "Send your ID so an admin can check you. Students only see houses from verified agents.", "Verify my account"],
    pending: ["Your ID is being reviewed", "An admin will approve you soon. You can post houses once you're approved.", "View submission"],
    rejected: ["Your verification was not approved", info?.rejectionReason ? `Reason: ${info.rejectionReason}. Fix it and send again.` : "Fix the details and send again.", "Send again"],
  }[status];

  const tone = status === "rejected" ? "border-badline bg-badb" : "border-pdline bg-pdb";

  return (
    <div className={`mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border p-5 ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sf text-goldt">
          <Icon name="shield" />
        </span>
        <div>
          <p className="font-bold">{copy[0]}</p>
          <p className="mt-0.5 text-sm text-mut">{copy[1]}</p>
        </div>
      </div>
      <Link to="/agent/verification" className="btn btn-teal btn-sm">
        {copy[2]}
      </Link>
    </div>
  );
}

export default function AgentDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [listings, setListings] = useState(null);
  const [pendingReq, setPendingReq] = useState(0);
  const [error, setError] = useState("");
  const verified = user.agentInfo?.verificationStatus === "approved";

  const load = () =>
    api
      .get("/listings/agent/mine")
      .then((res) => setListings(res.data.listings))
      .catch((err) => setError(errMsg(err)));

  useEffect(() => {
    load();
    api
      .get("/inspections/agent", { params: { status: "pending" } })
      .then((res) => setPendingReq(res.data.count))
      .catch(() => {});
  }, []);

  const changeStatus = async (id, status) => {
    try {
      await api.patch(`/listings/${id}/status`, { status });
      toast(`Marked as ${status}`);
      load();
    } catch (err) {
      toast(errMsg(err), "error");
    }
  };

  const reconfirm = async (id) => {
    try {
      await api.patch(`/listings/${id}/reconfirm`);
      toast("Listing reconfirmed. Students will see it as up to date.");
      load();
    } catch (err) {
      toast(errMsg(err), "error");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this listing? This can't be undone.")) return;
    try {
      await api.delete(`/listings/${id}`);
      toast("Listing deleted");
      load();
    } catch (err) {
      toast(errMsg(err), "error");
    }
  };

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!listings) return <Spinner label="Loading your listings" />;

  const attention = listings.filter((l) => l.needsReconfirm || l.status === "expired");
  const live = listings.filter((l) => l.status === "available").length;

  return (
    <>
      <PageTitle
        title={`Hello, ${user.name.split(" ")[0]}`}
        text="Keep your houses up to date so students trust what they see."
        action={
          verified && (
            <Link to="/agent/listings/new" className="btn btn-gold">
              <Icon name="plus" /> Create listing
            </Link>
          )
        }
      />

      <VerificationBanner info={user.agentInfo} />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-teal p-5 text-onteal">
          <p className="text-sm text-onteal/70">Live houses</p>
          <p className="h-serif mt-1 text-4xl text-gold">{live}</p>
        </div>
        <Link to="/agent/inspections" className="panel p-5 hover:bg-sf2">
          <p className="text-sm text-mut">Inspection requests waiting</p>
          <p className="h-serif mt-1 text-4xl">{pendingReq}</p>
        </Link>
        <div className={`rounded-3xl border p-5 ${attention.length ? "border-pdline bg-pdb" : "border-line bg-sf"}`}>
          <p className="text-sm text-mut">Need reconfirming</p>
          <p className="h-serif mt-1 text-4xl">{attention.length}</p>
        </div>
      </div>

      {attention.length > 0 && (
        <div className="mb-8 rounded-[28px] border border-pdline bg-sf p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pdb text-pdt">
              <Icon name="clock" />
            </span>
            <div>
              <p className="font-bold">These listings expire unless you reconfirm them</p>
              <p className="text-sm text-mut">Listings not reconfirmed in 30 days are hidden from students.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {attention.map((l) => (
              <div key={l._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sf2 px-4 py-3">
                <div>
                  <p className="font-semibold">{l.title}</p>
                  <p className="text-xs text-mut">
                    {l.status === "expired" ? "Expired" : "Last confirmed"} {daysAgo(l.lastConfirmedAt)} days ago
                  </p>
                </div>
                <button onClick={() => reconfirm(l._id)} className="btn btn-teal btn-sm">
                  <Icon name="refresh" size={15} /> Still accurate, reconfirm
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="h-serif mb-4 text-[28px]">My listings</h2>
      {listings.length === 0 ? (
        <EmptyState
          title="No listings yet"
          text={verified ? "Add your first house with photos and the full cost." : "Once you're verified, you can add houses here."}
          action={
            verified && (
              <Link to="/agent/listings/new" className="btn btn-gold">
                Create listing
              </Link>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-[28px] border border-line bg-sf">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs text-mut">
              <tr>
                <th className="p-4 font-semibold">House</th>
                <th className="p-4 font-semibold">Total</th>
                <th className="p-4 font-semibold">Last confirmed</th>
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
                          {roomLabel(l.roomType)} · {l.area}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-bold">{naira(l.totalCost)}</td>
                  <td className="p-4">
                    <span className={l.needsReconfirm ? "font-semibold text-pdt" : "text-mut"}>
                      {daysAgo(l.lastConfirmedAt) === 0 ? "Today" : `${daysAgo(l.lastConfirmedAt)} days ago`}
                    </span>
                  </td>
                  <td className="p-4">
                    {l.status === "expired" ? (
                      <StatusBadge status="expired" />
                    ) : (
                      <select value={l.status} onChange={(e) => changeStatus(l._id, e.target.value)} className="input h-9 w-auto py-0 text-sm font-semibold" aria-label="Change status">
                        <option value="available">Available</option>
                        <option value="pending">Pending</option>
                        <option value="rented">Rented</option>
                      </select>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => reconfirm(l._id)} className="btn btn-ghost btn-sm" title="Reconfirm">
                        <Icon name="refresh" size={15} />
                      </button>
                      <Link to={`/agent/listings/${l._id}/edit`} className="btn btn-ghost btn-sm">
                        Edit
                      </Link>
                      <button onClick={() => remove(l._id)} className="btn btn-danger btn-sm">
                        Delete
                      </button>
                    </div>
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
