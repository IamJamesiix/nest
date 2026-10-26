import { useEffect, useState } from "react";
import api, { errMsg } from "../../api/client";
import { Avatar, EmptyState, ErrorNote, Modal, PageTitle, Spinner, StatusBadge } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { fmtDate, ID_TYPES } from "../../utils/format";

const TABS = [
  ["pending", "Waiting for review"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["", "All agents"],
];

const isPdf = (url = "") => url.toLowerCase().endsWith(".pdf");

export default function AdminAgents() {
  const toast = useToast();
  const [tab, setTab] = useState("pending");
  const [agents, setAgents] = useState(null);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");

  const load = () =>
    api
      .get("/admin/agents", { params: tab ? { status: tab } : {} })
      .then((res) => setAgents(res.data.agents))
      .catch((err) => setError(errMsg(err)));

  useEffect(() => {
    setAgents(null);
    load();
  }, [tab]);

  const verify = async (agent, approve) => {
    try {
      await api.patch(`/admin/agents/${agent._id}/verify`, approve ? { approve: true } : { approve: false, reason });
      toast(approve ? `${agent.name} is now verified` : `${agent.name} was rejected`);
      setViewing(null);
      setRejecting(null);
      setReason("");
      load();
    } catch (err) {
      toast(errMsg(err), "error");
    }
  };

  return (
    <>
      <PageTitle title="Agent verification" text="Check each ID before an agent can post houses." />
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === v ? "bg-teal text-onteal" : "border border-line bg-sf hover:bg-sf2"}`}>
            {l}
          </button>
        ))}
      </div>

      <ErrorNote>{error}</ErrorNote>
      {!agents ? (
        <Spinner label="Loading agents" />
      ) : agents.length === 0 ? (
        <EmptyState title={tab === "pending" ? "No agents waiting" : "No agents here"} text="New verification requests will show up here." />
      ) : (
        <div className="space-y-3">
          {agents.map((a) => {
            const info = a.agentInfo || {};
            return (
              <div key={a._id} className="panel flex flex-col gap-4 p-5 md:flex-row md:items-center">
                <Avatar name={info.businessName || a.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{info.businessName || a.name}</p>
                    <StatusBadge status={info.verificationStatus || "not_submitted"} />
                  </div>
                  <p className="text-sm text-mut">
                    {a.name} · {a.email} · {a.phone}
                  </p>
                  {info.idType && (
                    <p className="mt-1 text-sm">
                      {ID_TYPES[info.idType]}: <span className="font-semibold">{info.idNumber}</span>
                      {info.submittedAt && <span className="text-mut"> · sent {fmtDate(info.submittedAt)}</span>}
                    </p>
                  )}
                  {info.rejectionReason && <p className="mt-1 text-sm text-bad">Rejected: {info.rejectionReason}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {info.idDocumentUrl && (
                    <button onClick={() => setViewing(a)} className="btn btn-ghost btn-sm">
                      View ID
                    </button>
                  )}
                  {info.verificationStatus === "pending" && (
                    <>
                      <button onClick={() => verify(a, true)} className="btn btn-teal btn-sm">
                        Approve
                      </button>
                      <button onClick={() => setRejecting(a)} className="btn btn-danger btn-sm">
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`ID for ${viewing?.name}`} wide>
        {viewing && (
          <>
            {isPdf(viewing.agentInfo.idDocumentUrl) ? (
              <iframe src={viewing.agentInfo.idDocumentUrl} title="ID document" className="h-[60vh] w-full rounded-2xl border border-line" />
            ) : (
              <img src={viewing.agentInfo.idDocumentUrl} alt="ID document" className="w-full rounded-2xl border border-line" />
            )}
            <p className="mt-3 text-sm">
              {ID_TYPES[viewing.agentInfo.idType]}: <span className="font-semibold">{viewing.agentInfo.idNumber}</span>
            </p>
            <a href={viewing.agentInfo.idDocumentUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-tealt hover:underline">
              Open in a new tab
            </a>
            {viewing.agentInfo.verificationStatus === "pending" && (
              <div className="mt-5 flex gap-2">
                <button onClick={() => verify(viewing, true)} className="btn btn-teal flex-1">
                  Approve
                </button>
                <button
                  onClick={() => {
                    setRejecting(viewing);
                    setViewing(null);
                  }}
                  className="btn btn-danger flex-1"
                >
                  Reject
                </button>
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title={`Reject ${rejecting?.name}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verify(rejecting, false);
          }}
          className="space-y-4"
        >
          <div>
            <label className="label" htmlFor="reason">
              Reason (the agent will see this)
            </label>
            <textarea id="reason" required rows={3} className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="The ID photo is blurry. Upload a clearer one." />
          </div>
          <button className="btn btn-danger w-full">Reject agent</button>
        </form>
      </Modal>
    </>
  );
}
