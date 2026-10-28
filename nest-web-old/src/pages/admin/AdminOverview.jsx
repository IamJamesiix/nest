import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../../api/client";
import { ErrorNote, PageTitle, Spinner } from "../../components/ui";

function Stat({ label, value, to, tone = "plain" }) {
  const styles = {
    teal: "bg-teal text-onteal",
    gold: "border border-pdline bg-pdb",
    plain: "border border-line bg-sf",
  };
  return (
    <Link to={to} className={`rounded-3xl p-5 transition-transform hover:-translate-y-0.5 ${styles[tone]}`}>
      <p className={`text-sm ${tone === "teal" ? "text-onteal/70" : "text-mut"}`}>{label}</p>
      <p className={`h-serif mt-1 text-[42px] leading-none ${tone === "teal" ? "text-gold" : ""}`}>{value}</p>
    </Link>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/stats")
      .then((res) => setStats(res.data))
      .catch((err) => setError(errMsg(err)));
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!stats) return <Spinner label="Loading stats" />;

  const { users, listings, inspections, openReports } = stats;

  return (
    <>
      <PageTitle title="Platform overview" text="What's happening on Nest right now." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="House finders" value={users.students} to="/admin/users" tone="teal" />
        <Stat label="Verified agents" value={users.verifiedAgents} to="/admin/users" />
        <Stat label="Live listings" value={listings.available} to="/admin/listings" />
        <Stat label="Agents waiting for review" value={users.pendingAgents} to="/admin/agents" tone={users.pendingAgents ? "gold" : "plain"} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="All listings" value={listings.total} to="/admin/listings" />
        <Stat label="Rented" value={listings.rented} to="/admin/listings" />
        <Stat label="Expired" value={listings.expired} to="/admin/listings" />
        <Stat label="Open reports" value={openReports} to="/admin/reports" tone={openReports ? "gold" : "plain"} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="panel p-6">
          <p className="text-sm text-mut">Inspections booked</p>
          <p className="h-serif mt-1 text-4xl">{inspections}</p>
          <p className="mt-2 text-sm text-mut">Across all agents, since launch.</p>
        </div>
        <div className="panel p-6">
          <p className="text-sm text-mut">All agents</p>
          <p className="h-serif mt-1 text-4xl">{users.agents}</p>
          <p className="mt-2 text-sm text-mut">
            {users.verifiedAgents} verified, {users.pendingAgents} waiting.{" "}
            <Link to="/admin/agents" className="font-bold text-tealt hover:underline">
              Review agents
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
