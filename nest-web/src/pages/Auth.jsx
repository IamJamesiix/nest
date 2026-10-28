import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { errMsg } from "../api/client";
import GoogleButton, { OrDivider } from "../components/GoogleButton";
import { ErrorNote, LogoMark } from "../components/ui";
import { homeFor, useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";


function RoleToggle({ role, setRole }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-full border border-line bg-sf2 p-1">
      {[
        ["student", "I'm looking for a house"],
        ["agent", "I'm an agent"],
      ].map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setRole(value)}
          aria-pressed={role === value}
          className={`h-10 rounded-full text-sm font-bold transition-colors ${role === value ? "bg-teal text-onteal" : "text-mut hover:text-ink"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function AuthShell({ title, text, children }) {
  return (
    <div className="mx-auto grid max-w-[1100px] items-center gap-10 px-6 py-12 lg:grid-cols-2">
      <div className="hidden rounded-[32px] bg-teal p-10 text-onteal lg:block">
        <LogoMark size={48} light />
        <h2 className="h-serif mt-8 text-[40px] leading-tight">Find your place around OAU without the runaround.</h2>
        <ul className="mt-8 space-y-4 text-onteal/80">
          <li>Every agent is checked with a real ID.</li>
          <li>The full cost is shown before you inspect.</li>
          <li>Book inspections and get answers in the app.</li>
        </ul>
      </div>
      <div className="panel w-full p-7 sm:p-9">
        <h1 className="h-serif text-[34px] leading-tight">{title}</h1>
        <p className="mt-1.5 text-mut">{text}</p>
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(params.get("expired") ? "Your session ended. Sign in again." : "");
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState("student");

  if (user) return <Navigate to={homeFor(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await login(email.trim(), password);
      navigate(params.get("next") || homeFor(u), { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" text="Sign in to book inspections, save houses or manage your listings.">
      <RoleToggle role={role} setRole={setRole} />
      <p className="mb-4 mt-2 text-center text-xs text-mut">Only matters if this is your first time signing in with Google.</p>
      <GoogleButton role={role} onError={setError} />
      <OrDivider />
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <PasswordInput id="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn btn-teal h-12 w-full" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-mut">
        New to Nest?{" "}
        <Link to="/register" className="font-bold text-tealt hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get("role") === "agent" ? "agent" : "student");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", businessName: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user)} replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = { ...form, role };
      if (role !== "agent") delete body.businessName;
      const u = await register(body);
      navigate(u.role === "agent" ? "/agent/verification" : "/listings", { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your account" text="It takes a minute. You can switch to finding a roommate later.">
      <RoleToggle role={role} setRole={setRole} />
      <div className="mt-5">
        <GoogleButton role={role} onError={setError} />
      </div>
      <OrDivider />
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input id="name" required className="input" value={form.name} onChange={set("name")} />
        </div>
        {role === "agent" && (
          <div>
            <label className="label" htmlFor="biz">
              Business name (optional)
            </label>
            <input id="biz" className="input" value={form.businessName} onChange={set("businessName")} placeholder="e.g. Tunde Homes Ile-Ife" />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="remail">
              Email
            </label>
            <input id="remail" type="email" required className="input" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Phone
            </label>
            <input id="phone" required className="input" value={form.phone} onChange={set("phone")} placeholder="080..." />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="rpass">
            Password
          </label>
          <PasswordInput id="rpass" required minLength={6} value={form.password} onChange={set("password")} autoComplete="new-password" />
        </div>
        {role === "agent" && <p className="text-sm text-mut">After signing up, you'll send an ID for verification. You can post houses once an admin approves you.</p>}
        <ErrorNote>{error}</ErrorNote>
        <button className="btn btn-gold h-12 w-full" disabled={busy}>
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-mut">
        Already have an account?{" "}
        <Link to="/login" className="font-bold text-tealt hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
