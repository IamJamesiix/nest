import { useEffect, useState } from "react";
import api, { errMsg } from "../../api/client";
import { Avatar, EmptyState, ErrorNote, Modal, PageTitle, Spinner, StatusBadge } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { fmtDateTime, toLocalInput } from "../../utils/format";

const TABS = [
  ["", "All"],
  ["pending", "New requests"],
  ["confirmed", "Confirmed"],
  ["rescheduled", "Waiting on student"],
  ["completed", "Completed"],
];

export default function AgentInspections() {
  const toast = useToast();
  const [tab, setTab] = useState("");
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [proposing, setProposing] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [agentNote, setAgentNote] = useState("");

  const load = () =>
    api
      .get("/inspections/agent", { params: tab ? { status: tab } : {} })
      .then((res) => setItems(res.data.inspections))
      .catch((err) => setError(errMsg(err)));

  useEffect(() => {
    setItems(null);
    load();
  }, [tab]);

  const respond = async (id, action, extra = {}) => {
    try {
      await api.patch(`/inspections/${id}/respond`, { action, ...extra });
      const done = { confirm: "Inspection confirmed", decline: "Request declined", complete: "Marked as completed", propose: "New time sent to the student" };
      toast(done[action]);
      load();
      return true;
    } catch (err) {
      toast(errMsg(err), "error");
      return false;
    }
  };

  const openPropose = (item) => {
    const d = new Date(item.requestedDate);
    d.setDate(d.getDate() + 1);
    setNewDate(toLocalInput(d));
    setAgentNote("");
    setProposing(item);
  };

  const sendProposal = async (e) => {
    e.preventDefault();
    const ok = await respond(proposing._id, "propose", { proposedDate: new Date(newDate).toISOString(), agentNote });
    if (ok) setProposing(null);
  };

  const cancel = async (id) => {
    if (!window.confirm("Cancel this inspection?")) return;
    try {
      await api.patch(`/inspections/${id}/cancel`);
      toast("Inspection cancelled");
      load();
    } catch (err) {
      toast(errMsg(err), "error");
    }
  };

  return (
    <>
      <PageTitle title="Inspection requests" text="Confirm, suggest another time, or decline. Students see your answer straight away." />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === v ? "bg-teal text-onteal" : "border border-line bg-sf hover:bg-sf2"}`}>
            {l}
          </button>
        ))}
      </div>

      <ErrorNote>{error}</ErrorNote>
      {!items ? (
        <Spinner label="Loading requests" />
      ) : items.length === 0 ? (
        <EmptyState title="Nothing here" text="When students book inspections on your houses, they'll show up here." />
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i._id} className="panel flex flex-col gap-4 p-5 md:flex-row md:items-center">
              <Avatar name={i.student?.name} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{i.student?.name}</p>
                  <StatusBadge status={i.status} />
                </div>
                <p className="mt-0.5 text-sm text-mut">
                  {i.listing?.title} · {i.listing?.area || i.listing?.landmark || "Near OAU"}
                </p>
                <p className="mt-1 text-sm">
                  Asked for <span className="font-semibold">{fmtDateTime(i.requestedDate)}</span>
                  {i.status === "rescheduled" && i.proposedDate && (
                    <span className="text-pdt">
                      {" "}
                      · you proposed <span className="font-semibold">{fmtDateTime(i.proposedDate)}</span>
                    </span>
                  )}
                </p>
                {i.note && <p className="mt-2 rounded-xl bg-sf2 px-3 py-2 text-sm">Student: “{i.note}”</p>}
                {i.student?.phone && (
                  <a href={`tel:${i.student.phone}`} className="mt-1 inline-block text-sm font-semibold text-tealt hover:underline">
                    {i.student.phone}
                  </a>
                )}
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                {i.status === "pending" && (
                  <>
                    <button onClick={() => respond(i._id, "confirm")} className="btn btn-teal btn-sm">
                      Confirm
                    </button>
                    <button onClick={() => openPropose(i)} className="btn btn-ghost btn-sm">
                      Propose new time
                    </button>
                    <button onClick={() => respond(i._id, "decline")} className="btn btn-danger btn-sm">
                      Decline
                    </button>
                  </>
                )}
                {i.status === "confirmed" && (
                  <>
                    <button onClick={() => respond(i._id, "complete")} className="btn btn-teal btn-sm">
                      Mark completed
                    </button>
                    <button onClick={() => openPropose(i)} className="btn btn-ghost btn-sm">
                      Change time
                    </button>
                  </>
                )}
                {["pending", "confirmed", "rescheduled"].includes(i.status) && (
                  <button onClick={() => cancel(i._id)} className="btn btn-sm text-mut hover:text-bad">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!proposing} onClose={() => setProposing(null)} title="Propose a new time">
        <form onSubmit={sendProposal} className="space-y-4">
          <p className="text-sm text-mut">
            {proposing?.student?.name} asked for {proposing && fmtDateTime(proposing.requestedDate)}. They'll be asked to accept your time.
          </p>
          <div>
            <label className="label" htmlFor="newDate">
              New date and time
            </label>
            <input id="newDate" type="datetime-local" required className="input" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="anote">
              Note (optional)
            </label>
            <textarea id="anote" rows={2} className="input" value={agentNote} onChange={(e) => setAgentNote(e.target.value)} placeholder="I'm showing another house that morning" />
          </div>
          <button className="btn btn-teal w-full">Send new time</button>
        </form>
      </Modal>
    </>
  );
}
