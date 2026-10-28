import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../../api/client";
import { Avatar, EmptyState, ErrorNote, Icon, Modal, PageTitle, Spinner } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { AREAS, cap, naira } from "../../utils/format";
import Select from "../../components/Select";

const EMPTY = {
  budget: "",
  preferredAreas: "",
  gender: "male",
  preferredGender: "any",
  department: "",
  level: "",
  about: "",
  habits: "",
  contact: "",
  hasHouse: false,
  isActive: true,
};

function ProfileForm({ profile, onSaved, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState(() =>
    profile
      ? {
          ...EMPTY,
          ...profile,
          preferredAreas: (profile.preferredAreas || []).join(", "),
          habits: (profile.habits || []).join(", "),
          listing: undefined,
        }
      : EMPTY
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const toggleArea = (a) => {
    const list = form.preferredAreas.split(",").map((s) => s.trim()).filter(Boolean);
    const has = list.some((x) => x.toLowerCase() === a.toLowerCase());
    const next = has ? list.filter((x) => x.toLowerCase() !== a.toLowerCase()) : [...list, a];
    setForm({ ...form, preferredAreas: next.join(", ") });
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        budget: Number(form.budget),
        preferredAreas: form.preferredAreas,
        gender: form.gender,
        preferredGender: form.preferredGender,
        department: form.department,
        level: form.level,
        about: form.about,
        habits: form.habits,
        contact: form.contact,
        hasHouse: form.hasHouse,
        isActive: form.isActive,
      };
      const res = await api.put("/roommates/me", body);
      toast("Roommate profile saved");
      onSaved(res.data.profile);
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const chosen = form.preferredAreas.toLowerCase();

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="budget">
            My budget for my share (₦)
          </label>
          <input id="budget" required inputMode="numeric" className="input" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value.replace(/\D/g, "") })} />
        </div>
        <div>
          <label className="label" htmlFor="contact">
            How to reach me
          </label>
          <input id="contact" className="input" value={form.contact} onChange={set("contact")} placeholder="WhatsApp 080..." />
        </div>
      </div>

      <div>
        <span className="label">Areas I like</span>
        <div className="flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => toggleArea(a)}
              className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${chosen.includes(a.toLowerCase()) ? "border-teal bg-teal text-onteal" : "border-line bg-sf"}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="gender">
            I am
          </label>
          <Select
            id="gender"
            value={form.gender}
            onChange={(v) => setForm({ ...form, gender: v })}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ]}
          />
        </div>
        <div>
          <label className="label" htmlFor="pgender">
            I'd room with
          </label>
          <Select
            id="pgender"
            value={form.preferredGender}
            onChange={(v) => setForm({ ...form, preferredGender: v })}
            options={[
              { value: "any", label: "Anyone" },
              { value: "male", label: "Male only" },
              { value: "female", label: "Female only" },
            ]}
          />
        </div>
        <div>
          <label className="label" htmlFor="dept">
            Department
          </label>
          <input id="dept" className="input" value={form.department} onChange={set("department")} placeholder="Computer Science" />
        </div>
        <div>
          <label className="label" htmlFor="level">
            Level
          </label>
          <input id="level" className="input" value={form.level} onChange={set("level")} placeholder="300L" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="habits">
          Habits (comma separated)
        </label>
        <input id="habits" className="input" value={form.habits} onChange={set("habits")} placeholder="quiet, early riser, no smoking" />
      </div>
      <div>
        <label className="label" htmlFor="about">
          About me
        </label>
        <textarea id="about" rows={3} className="input" value={form.about} onChange={set("about")} />
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="h-4 w-4 accent-teal" checked={form.hasHouse} onChange={set("hasHouse")} />
        I already have a house and need someone to share it
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="h-4 w-4 accent-teal" checked={form.isActive} onChange={set("isActive")} />
        Show my profile to other students
      </label>

      <ErrorNote>{error}</ErrorNote>
      <button className="btn btn-teal w-full" disabled={busy}>
        {busy ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}

function MatchCard({ r }) {
  const score = r.matchScore || 0;
  return (
    <div className="panel flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={r.student?.name} dark size="h-12 w-12" />
          <div>
            <p className="font-bold">{r.student?.name}</p>
            <p className="text-xs text-mut">{[r.department, r.level, cap(r.gender || "")].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="h-serif text-2xl text-tealt">{score}%</p>
          <p className="text-[11px] font-semibold text-mut">match</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sf2">
        <div className="h-full rounded-full bg-gold" style={{ width: `${score}%` }} />
      </div>

      <p className="mt-4 text-sm">
        Budget <span className="font-bold">{naira(r.budget)}</span>
        {r.preferredAreas?.length > 0 && <span className="text-mut"> · {r.preferredAreas.map(cap).join(", ")}</span>}
      </p>
      {r.about && <p className="mt-2 text-sm leading-relaxed text-mut">{r.about}</p>}
      {r.habits?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.habits.map((h) => (
            <span key={h} className="rounded-full bg-sf2 px-2.5 py-1 text-xs font-semibold">
              {h}
            </span>
          ))}
        </div>
      )}
      {r.hasHouse && (
        <p className="mt-3 rounded-xl bg-okb px-3 py-2 text-sm font-semibold text-okt">
          Has a house{r.listing ? `: ${r.listing.title} (${naira(r.listing.totalCost)})` : ""}
        </p>
      )}
      {r.contact && (
        <p className="mt-auto pt-4 text-sm">
          <span className="text-mut">Contact: </span>
          <span className="font-bold">{r.contact}</span>
        </p>
      )}
    </div>
  );
}

export default function Roommates() {
  const toast = useToast();
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = none
  const [matches, setMatches] = useState(null);
  const [filters, setFilters] = useState({ maxBudget: "", area: "", gender: "", hasHouse: "" });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/roommates/me")
      .then((res) => setProfile(res.data.profile))
      .catch((err) => setError(errMsg(err)));
  }, []);

  useEffect(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""));
    api
      .get("/roommates", { params })
      .then((res) => setMatches(res.data.roommates))
      .catch((err) => setError(errMsg(err)));
  }, [filters, profile]);

  const removeProfile = async () => {
    if (!window.confirm("Stop looking for a roommate? Your profile will be removed.")) return;
    await api.delete("/roommates/me");
    setProfile(null);
    toast("You're no longer listed as looking for a roommate");
  };


  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (profile === undefined) return <Spinner label="Loading roommates" />;

  return (
    <>
      <PageTitle title="Find a roommate" text="Optional. Share a house to split rent and fees with someone who fits." />

      {/* my profile */}
      <div className={`mb-8 rounded-[28px] p-6 ${profile ? "border border-line bg-sf" : "bg-teal text-onteal"}`}>
        {profile ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 font-bold">
                <span className={`h-2.5 w-2.5 rounded-full ${profile.isActive ? "bg-okt" : "bg-rnt"}`} />
                {profile.isActive ? "You're visible to other students" : "Your profile is hidden"}
              </p>
              <p className="mt-1 text-sm text-mut">
                Budget {naira(profile.budget)}
                {profile.preferredAreas?.length > 0 && ` · ${profile.preferredAreas.map(cap).join(", ")}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)} className="btn btn-ghost btn-sm">
                Edit profile
              </button>
              <button onClick={removeProfile} className="btn btn-danger btn-sm">
                Stop looking
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="h-serif text-2xl">I want a roommate</p>
              <p className="mt-1 text-sm text-onteal/75">Make a profile so students who fit can find you, and see your match score with them.</p>
            </div>
            <button onClick={() => setEditing(true)} className="btn btn-gold">
              <Icon name="plus" /> Create my profile
            </button>
          </div>
        )}
      </div>

      {/* filters */}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <input className="input" inputMode="numeric" placeholder="Max budget ₦" value={filters.maxBudget} onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value.replace(/\D/g, "") })} />
        <Select
          label="Area"
          value={filters.area}
          onChange={(v) => setFilters({ ...filters, area: v })}
          options={[{ value: "", label: "Any area" }, ...AREAS.map((a) => ({ value: a.toLowerCase(), label: a }))]}
        />
        <Select
          label="Gender"
          value={filters.gender}
          onChange={(v) => setFilters({ ...filters, gender: v })}
          options={[
            { value: "", label: "Any gender" },
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ]}
        />
        <Select
          label="House"
          value={filters.hasHouse}
          onChange={(v) => setFilters({ ...filters, hasHouse: v })}
          options={[
            { value: "", label: "With or without a house" },
            { value: "true", label: "Already has a house" },
            { value: "false", label: "Still looking for a house" },
          ]}
        />
      </div>

      {!matches ? (
        <Spinner label="Finding matches" />
      ) : matches.length === 0 ? (
        <EmptyState title="No roommates match yet" text="Try removing a filter, or check back as more students join." />
      ) : (
        <>
          {!profile && <p className="mb-4 text-sm text-mut">Create your profile to see match scores. Until then, everyone shows 0%.</p>}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((r) => (
              <MatchCard key={r._id} r={r} />
            ))}
          </div>
        </>
      )}

      <Modal open={editing} onClose={() => setEditing(false)} title={profile ? "Edit roommate profile" : "Create roommate profile"} wide>
        <ProfileForm profile={profile} onSaved={setProfile} onClose={() => setEditing(false)} />
      </Modal>

      <p className="mt-10 text-sm text-mut">
        Found someone? Browse{" "}
        <Link to="/listings?shared=true" className="font-bold text-tealt hover:underline">
          houses you can share
        </Link>{" "}
        and use the split selector to see your share.
      </p>
    </>
  );
}
