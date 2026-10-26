import { useState } from "react";
import api, { errMsg } from "../api/client";
import { useToast } from "../context/ToastContext";
import { REPORT_REASONS } from "../utils/format";
import { ErrorNote, Modal } from "./ui";

// report a listing or an agent. pass either listingId or agentId
export default function ReportModal({ open, onClose, listingId, agentId, name }) {
  const toast = useToast();
  const [reason, setReason] = useState("fake_listing");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const body = { reason, details };
      if (listingId) body.listing = listingId;
      if (agentId) body.agent = agentId;
      await api.post("/reports", body);
      toast("Report sent. An admin will look into it.");
      setDetails("");
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Report ${name || "this listing"}`}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <span className="label">What's wrong?</span>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(REPORT_REASONS).map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => setReason(value)}
                className={`rounded-2xl border px-3 py-2.5 text-left text-sm font-semibold ${
                  reason === value ? "border-teal bg-teal text-onteal" : "border-line bg-sf hover:bg-sf2"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="details">
            Details (optional)
          </label>
          <textarea id="details" rows={3} className="input" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Tell the admin what happened" />
        </div>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn btn-teal w-full" disabled={sending}>
          {sending ? "Sending..." : "Send report"}
        </button>
      </form>
    </Modal>
  );
}
