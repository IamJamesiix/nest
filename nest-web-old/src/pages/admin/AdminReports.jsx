import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../../api/client";
import { EmptyState, ErrorNote, Icon, Modal, PageTitle, Spinner, StatusBadge } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { fmtDate, REPORT_REASONS } from "../../utils/format";

const TABS = [
  ["open", "Open"],
  ["resolved", "Resolved"],
  ["dismissed", "Dismissed"],
  ["", "All"],
];

export default function AdminReports() {
  const toast = useToast();
  const [status, setStatus] = useState("open");
  const [reports, setReports] = useState(null);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(null); // { report, status }
  const [note, setNote] = useState("");

  const load = () =>
    api
      .get("/admin/reports", { params: status ? { status } : {} })
      .then((res) => setReports(res.data.reports))
      .catch((err) => setError(errMsg(err)));

  useEffect(() => {
    setReports(null);
    load();
  }, [status]);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/admin/reports/${closing.report._id}`, { status: closing.status, adminNote: note });
      toast(closing.status === "resolved" ? "Report resolved" : "Report dismissed");
      setClosing(null);
      setNote("");
      load();
    } catch (err) {
      toast(errMsg(err), "error");
    }
  };

  const hideListing = async (r) => {
    if (!window.confirm(`Remove "${r.listing.title}" from Nest?`)) return;
    try {
      await api.delete(`/admin/listings/${r.listing._id}`);
      toast("Listing removed");
      setClosing({ report: r, status: "resolved" });
      setNote("Listing removed");
    } catch (err) {
      toast(errMsg(err), "error");
    }
  };

  return (
    <>
      <PageTitle title="Reports" text="Problems students and agents flagged." />
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(([v, l]) => (
          <button key={v} onClick={() => setStatus(v)} className={`rounded-full px-4 py-2 text-sm font-semibold ${status === v ? "bg-teal text-onteal" : "border border-line bg-sf hover:bg-sf2"}`}>
            {l}
          </button>
        ))}
      </div>

      <ErrorNote>{error}</ErrorNote>
      {!reports ? (
        <Spinner label="Loading reports" />
      ) : reports.length === 0 ? (
        <EmptyState title={status === "open" ? "No open reports" : "Nothing here"} text="When someone reports a listing or agent, it shows up here." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {reports.map((r) => (
            <div key={r._id} className="panel flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-badb text-bad">
                    <Icon name="flag" />
                  </span>
                  <div>
                    <p className="font-bold">{REPORT_REASONS[r.reason] || r.reason}</p>
                    <p className="text-xs text-mut">
                      By {r.reporter?.name || "someone"} · {fmtDate(r.createdAt)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>

              <div className="mt-4 rounded-2xl bg-sf2 p-4 text-sm">
                {r.listing && (
                  <p>
                    Listing:{" "}
                    <Link to={`/listings/${r.listing._id}`} className="font-bold text-tealt hover:underline">
                      {r.listing.title}
                    </Link>{" "}
                    <span className="text-mut">({r.listing.area})</span>
                  </p>
                )}
                {r.agent && (
                  <p>
                    Agent:{" "}
                    <Link to={`/agents/${r.agent._id}`} className="font-bold text-tealt hover:underline">
                      {r.agent.agentInfo?.businessName || r.agent.name}
                    </Link>
                  </p>
                )}
                {r.details && <p className="mt-2 text-mut">“{r.details}”</p>}
                {r.adminNote && <p className="mt-2 font-semibold">Admin note: {r.adminNote}</p>}
              </div>

              {r.status === "open" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {r.listing && (
                    <button onClick={() => hideListing(r)} className="btn btn-danger btn-sm">
                      Remove listing
                    </button>
                  )}
                  <button onClick={() => setClosing({ report: r, status: "resolved" })} className="btn btn-teal btn-sm">
                    Resolve
                  </button>
                  <button onClick={() => setClosing({ report: r, status: "dismissed" })} className="btn btn-ghost btn-sm">
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!closing} onClose={() => setClosing(null)} title={closing?.status === "resolved" ? "Resolve report" : "Dismiss report"}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label" htmlFor="note">
              Note (optional)
            </label>
            <textarea id="note" rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Spoke with the agent, fee removed" />
          </div>
          <button className="btn btn-teal w-full">{closing?.status === "resolved" ? "Resolve report" : "Dismiss report"}</button>
        </form>
      </Modal>
    </>
  );
}
