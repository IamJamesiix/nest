import { useEffect, useState } from "react";
import api, { errMsg } from "../../api/client";
import { EmptyState, ErrorNote, Icon, PageTitle, Spinner } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { fmtDate } from "../../utils/format";

const ROLES = [
  ["", "Everyone"],
  ["student", "House finders"],
  ["agent", "Agents"],
  ["admin", "Admins"],
];

export default function AdminUsers() {
  const toast = useToast();
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    const params = {};
    if (role) params.role = role;
    if (search) params.q = search;
    return api
      .get("/admin/users", { params })
      .then((res) => setUsers(res.data.users))
      .catch((err) => setError(errMsg(err)));
  };

  useEffect(() => {
    load();
  }, [role, search]);

  const toggleBan = async (u) => {
    if (!u.isBanned && !window.confirm(`Ban ${u.name}? They won't be able to use Nest.`)) return;
    try {
      await api.patch(`/admin/users/${u._id}/ban`, { banned: !u.isBanned });
      toast(u.isBanned ? `${u.name} can use Nest again` : `${u.name} is banned`);
      load();
    } catch (err) {
      toast(errMsg(err), "error");
    }
  };

  return (
    <>
      <PageTitle title="Users" text="Search people on Nest and ban accounts that break the rules." />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {ROLES.map(([v, l]) => (
            <button key={v} onClick={() => setRole(v)} className={`rounded-full px-4 py-2 text-sm font-semibold ${role === v ? "bg-teal text-onteal" : "border border-line bg-sf hover:bg-sf2"}`}>
              {l}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q.trim());
          }}
          className="relative ml-auto w-full max-w-xs"
        >
          <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-mut" />
          <input className="input pl-11" placeholder="Name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
      </div>

      <ErrorNote>{error}</ErrorNote>
      {!users ? (
        <Spinner label="Loading users" />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" text="Try a different name or role." />
      ) : (
        <div className="overflow-x-auto rounded-[28px] border border-line bg-sf">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-mut">
              <tr>
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Joined</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t border-line">
                  <td className="p-4 font-bold">{u.name}</td>
                  <td className="p-4 text-mut">{u.email}</td>
                  <td className="p-4">
                    {u.role === "student" ? "House finder" : u.role === "agent" ? "Agent" : "Admin"}
                    {u.role === "agent" && u.agentInfo?.verificationStatus === "approved" && <span className="ml-1.5 text-xs font-semibold text-okt">verified</span>}
                  </td>
                  <td className="p-4 text-mut">{fmtDate(u.createdAt)}</td>
                  <td className="p-4">{u.isBanned ? <span className="rounded-full bg-badb px-2.5 py-1 text-xs font-bold text-bad">Banned</span> : <span className="text-xs font-bold text-okt">Active</span>}</td>
                  <td className="p-4 text-right">
                    {u.role !== "admin" && (
                      <button onClick={() => toggleBan(u)} className={`btn btn-sm ${u.isBanned ? "btn-ghost" : "btn-danger"}`}>
                        {u.isBanned ? "Unban" : "Ban"}
                      </button>
                    )}
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
