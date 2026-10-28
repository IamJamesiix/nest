import { useEffect, useState } from "react";
import api, { errMsg } from "../../api/client";
import { Avatar, EmptyState, ErrorNote, PageTitle, Spinner } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { fmtDate } from "../../utils/format";
import PasswordInput from "../../components/PasswordInput";

const BLANK = { name: "", email: "", password: "" };

export default function AdminAdmins() {
  const { user } = useAuth();
  const toast = useToast();
  const [admins, setAdmins] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    api
      .get("/admin/users", { params: { role: "admin" } })
      .then((res) => setAdmins(res.data.users))
      .catch((err) => setError(errMsg(err)));

  useEffect(() => {
    load();
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // if the email already has an account, the backend promotes it
  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api.post("/admin/admins", form);
      toast(res.data.message || `${form.name} is now an admin`);
      setForm(BLANK);
      load();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const demote = async (a) => {
    if (!window.confirm(`Remove admin access from ${a.name}? They'll become a house finder.`)) return;
    try {
      await api.patch(`/admin/users/${a._id}/role`, { role: "student" });
      toast(`${a.name} is no longer an admin`);
      load();
    } catch (err) {
      toast(errMsg(err), "error"); // e.g. "There must be at least one admin"
    }
  };

  return (
    <>
      <PageTitle title="Admins & roles" text="Add people who can approve agents and handle reports. Change anyone's role from the Users page." />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section>
          <h2 className="mb-4 text-lg font-bold">Current admins</h2>
          {!admins ? (
            <Spinner label="Loading admins" />
          ) : admins.length === 0 ? (
            <EmptyState title="No admins found" />
          ) : (
            <div className="space-y-3">
              {admins.map((a) => (
                <div key={a._id} className="panel flex flex-wrap items-center gap-4 p-4">
                  <Avatar name={a.name} dark />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {a.name} {a._id === user._id && <span className="ml-1 rounded-full bg-sf2 px-2 py-0.5 text-xs font-semibold text-mut">You</span>}
                    </p>
                    <p className="truncate text-sm text-mut">
                      {a.email} · since {fmtDate(a.createdAt)}
                    </p>
                  </div>
                  {a._id !== user._id && (
                    <button onClick={() => demote(a)} className="btn btn-danger btn-sm">
                      Remove admin
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <form onSubmit={add} className="panel h-fit space-y-4 p-6">
          <div>
            <h2 className="text-lg font-bold">Add an admin</h2>
            <p className="mt-1 text-sm text-mut">If the email already has a Nest account, that account becomes an admin and keeps its password.</p>
          </div>
          <div>
            <label className="label" htmlFor="aname">
              Full name
            </label>
            <input id="aname" required className="input" value={form.name} onChange={set("name")} />
          </div>
          <div>
            <label className="label" htmlFor="aemail">
              Email
            </label>
            <input id="aemail" type="email" required className="input" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label className="label" htmlFor="apass">
              Password
            </label>
            <PasswordInput id="apass" minLength={6} value={form.password} onChange={set("password")} autoComplete="new-password" />
            <p className="mt-1 text-xs text-mut">Needed for a new account. Share it with them privately.</p>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <button className="btn btn-teal w-full" disabled={busy}>
            {busy ? "Adding..." : "Add admin"}
          </button>
        </form>
      </div>
    </>
  );
}
