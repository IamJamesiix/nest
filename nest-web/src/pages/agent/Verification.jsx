import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../../api/client";
import { ErrorNote, Icon, PageTitle, StatusBadge } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { fmtDate, ID_TYPES } from "../../utils/format";

const STEPS = ["Send your ID", "Admin reviews it", "Start listing houses"];

export default function Verification() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const info = user.agentInfo || {};
  const status = info.verificationStatus || "not_submitted";
  const [form, setForm] = useState({
    idType: info.idType || "nin",
    idNumber: info.idNumber || "",
    cacNumber: info.cacNumber || "",
    businessName: info.businessName || "",
    officeAddress: info.officeAddress || "",
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const step = { not_submitted: 0, rejected: 0, pending: 1, approved: 2 }[status];
  const canSubmit = status === "not_submitted" || status === "rejected";

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      if (file) fd.append("idDocument", file);
      await api.post("/agents/verification", fd);
      await refresh();
      toast("Verification sent. An admin will review it.");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle title="Agent verification" text="Students only see a Verified badge on houses from agents an admin has checked." />

      <ol className="mb-8 grid gap-3 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 rounded-3xl border p-4 ${i <= step ? "border-teal bg-teal text-onteal" : "border-line bg-sf"}`}>
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${i <= step ? "bg-gold text-[#1a1405]" : "bg-sf2 text-mut"}`}>
              {i < step || status === "approved" ? <Icon name="check" size={16} /> : i + 1}
            </span>
            <span className="font-semibold">{s}</span>
          </li>
        ))}
      </ol>

      <div className="panel mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-mut">Current status</p>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={status} />
            {info.submittedAt && <span className="text-sm text-mut">Sent {fmtDate(info.submittedAt)}</span>}
          </div>
          {status === "rejected" && info.rejectionReason && <p className="mt-2 text-sm font-semibold text-bad">Reason: {info.rejectionReason}</p>}
          {status === "approved" && <p className="mt-2 text-sm text-okt">You're verified. Your houses show the Verified agent badge.</p>}
          {status === "pending" && <p className="mt-2 text-sm text-mut">We'll update this page once an admin reviews your ID.</p>}
        </div>
        {status === "approved" && (
          <Link to="/agent/listings/new" className="btn btn-gold">
            Create a listing
          </Link>
        )}
        {info.idDocumentUrl && (
          <a href={info.idDocumentUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
            View the document I sent
          </a>
        )}
      </div>

      {canSubmit && (
        <form onSubmit={submit} className="panel max-w-3xl space-y-4 p-6">
          <h2 className="text-lg font-bold">{status === "rejected" ? "Send your details again" : "Send your details"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="idType">
                ID type
              </label>
              <select id="idType" className="input" value={form.idType} onChange={set("idType")}>
                {Object.entries(ID_TYPES).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="idNumber">
                ID number
              </label>
              <input id="idNumber" required className="input" value={form.idNumber} onChange={set("idNumber")} />
            </div>
            <div>
              <label className="label" htmlFor="biz">
                Business name
              </label>
              <input id="biz" className="input" value={form.businessName} onChange={set("businessName")} />
            </div>
            <div>
              <label className="label" htmlFor="cac">
                CAC number (if registered)
              </label>
              <input id="cac" className="input" value={form.cacNumber} onChange={set("cacNumber")} placeholder="RC..." />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="office">
              Office address
            </label>
            <input id="office" className="input" value={form.officeAddress} onChange={set("officeAddress")} />
          </div>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-line bg-bg px-6 py-8 text-center hover:bg-sf2">
            <Icon name="upload" size={24} className="text-tealt" />
            <span className="mt-2 font-semibold">{file ? file.name : "Upload a photo or scan of your ID"}</span>
            <span className="text-xs text-mut">JPG, PNG, WEBP or PDF, up to 5MB</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files[0] || null)} />
          </label>
          <ErrorNote>{error}</ErrorNote>
          <button className="btn btn-teal h-12 w-full sm:w-auto" disabled={busy}>
            {busy ? "Sending..." : "Send for review"}
          </button>
        </form>
      )}
    </>
  );
}
