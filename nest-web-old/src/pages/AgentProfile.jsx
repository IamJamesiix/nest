import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { errMsg } from "../api/client";
import ListingCard from "../components/ListingCard";
import ReportModal from "../components/ReportModal";
import { Avatar, EmptyState, Icon, Spinner, VerifiedBadge } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { fmtDate } from "../utils/format";

export default function AgentProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    api
      .get(`/agents/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(errMsg(err)));
  }, [id]);

  if (error)
    return (
      <div className="mx-auto max-w-xl px-6 py-24">
        <EmptyState title="Agent not found" text={error} action={<Link to="/listings" className="btn btn-gold">Browse houses</Link>} />
      </div>
    );
  if (!data) return <Spinner label="Loading agent" />;

  const { agent, isVerified, avgRating, listings } = data;
  const name = agent.agentInfo?.businessName || agent.name;

  return (
    <div className="mx-auto max-w-[1320px] px-6 pt-10">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-[32px] bg-teal p-7 text-onteal sm:p-10">
        <div className="flex items-center gap-5">
          <Avatar name={name} size="h-20 w-20 text-2xl" />
          <div>
            <h1 className="h-serif text-[clamp(28px,4vw,42px)] leading-tight">{name}</h1>
            <p className="mt-1 text-onteal/75">
              {agent.agentInfo?.businessName && `${agent.name} · `}On Nest since {fmtDate(agent.createdAt)}
            </p>
            <div className="mt-2">
              {isVerified ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-[#9be3b9]">
                  <Icon name="shield" size={15} /> Verified agent
                </span>
              ) : (
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-onteal/70">Not verified yet</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-onteal/60">Houses listed</p>
            <p className="h-serif text-3xl text-gold">{listings.length}</p>
          </div>
          <div>
            <p className="text-onteal/60">Average rating</p>
            <p className="h-serif text-3xl text-gold">{avgRating ? avgRating.toFixed(1) : "None"}</p>
          </div>
          {agent.agentInfo?.officeAddress && (
            <div className="max-w-[220px]">
              <p className="text-onteal/60">Office</p>
              <p className="mt-1 font-semibold">{agent.agentInfo.officeAddress}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {agent.phone && (
          <a href={`tel:${agent.phone}`} className="btn btn-gold">
            <Icon name="phone" size={16} /> Call {agent.phone}
          </a>
        )}
        <button onClick={() => (user ? setReporting(true) : navigate("/login"))} className="btn btn-ghost text-mut">
          <Icon name="flag" /> Report agent
        </button>
      </div>

      <h2 className="h-serif mt-12 text-[30px]">Houses by {name}</h2>
      <div className="mt-6">
        {listings.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <ListingCard key={l._id} listing={{ ...l, agent: { agentInfo: { verificationStatus: isVerified ? "approved" : "" } } }} />
            ))}
          </div>
        ) : (
          <EmptyState title="No live houses" text="This agent has no houses up right now." />
        )}
      </div>

      <ReportModal open={reporting} onClose={() => setReporting(false)} agentId={agent._id} name={name} />
    </div>
  );
}
