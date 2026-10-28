import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth, homeFor } from "../context/AuthContext";
import { useCompare } from "../context/CompareContext";
import Navbar from "./Navbar";
import ThemeToggle from "./ThemeToggle";
import { Avatar, Icon, Logo, Photo, Spinner } from "./ui";

// ---------- route guard ----------
export function RequireRole({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}

// ---------- public pages ----------
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <CompareTray />
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-mut">
        <Logo />
        <p>Off-campus houses around OAU, Ile-Ife. Built by a SWEP team.</p>
      </div>
    </footer>
  );
}

// floating bar that shows houses picked for comparison
function CompareTray() {
  const { items, remove, clear } = useCompare();
  const { pathname } = useLocation();
  if (!items.length || pathname === "/compare") return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-night py-2 pl-3 pr-2 text-onteal shadow-soft">
      <div className="flex -space-x-2">
        {items.map((i) => (
          <button key={i._id} onClick={() => remove(i._id)} title={`Remove ${i.title}`} className="relative">
            <Photo src={i.photo} className="h-10 w-10 rounded-full border-2 border-night" />
          </button>
        ))}
      </div>
      <p className="flex-1 truncate text-sm font-semibold">
        {items.length} of 4 picked {items.length < 2 && <span className="font-normal text-onteal/60">· pick one more</span>}
      </p>
      <button onClick={clear} className="hidden text-sm text-onteal/60 hover:text-onteal sm:block">
        Clear
      </button>
      <Link to="/compare" className={`btn btn-gold btn-sm ${items.length < 2 ? "pointer-events-none opacity-50" : ""}`}>
        Compare
      </Link>
    </div>
  );
}

// ---------- dashboards ----------
const MENUS = {
  student: [
    { to: "/me/inspections", label: "My inspections", icon: "calendar" },
    { to: "/me/favourites", label: "Favourites", icon: "heart" },
    { to: "/roommates", label: "Roommates", icon: "users" },
    { to: "/listings", label: "Find a house", icon: "search" },
  ],
  agent: [
    { to: "/agent", label: "My listings", icon: "grid", end: true },
    { to: "/agent/listings/new", label: "Create listing", icon: "plus" },
    { to: "/agent/inspections", label: "Inspection requests", icon: "calendar" },
    { to: "/agent/verification", label: "Verification", icon: "shield" },
  ],
  admin: [
    { to: "/admin", label: "Overview", icon: "grid", end: true },
    { to: "/admin/agents", label: "Agent verification", icon: "shield" },
    { to: "/admin/users", label: "Users", icon: "users" },
    { to: "/admin/listings", label: "All listings", icon: "home" },
    { to: "/admin/reports", label: "Reports", icon: "flag" },
    { to: "/admin/admins", label: "Admins & roles", icon: "users" },
  ],
};

export function DashboardLayout() {
  const { user, logout, refresh } = useAuth();

  // pick up changes made by an admin (approval, role, ban) when a dashboard opens
  useEffect(() => {
    refresh().catch(() => {});
  }, []);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const menu = MENUS[user.role] || [];
  const roleLabel = { student: "House finder", agent: "Agent", admin: "Admin" }[user.role];
  const verified = user.agentInfo?.verificationStatus === "approved";

  const sidebar = (
    <aside className="flex h-full flex-col rounded-[28px] border border-white/5 bg-night p-5 text-onteal">
      <div className="flex items-start justify-between gap-2 px-2">
        <div>
          <Logo light />
          <p className="mt-2 text-xs font-semibold text-gold">{roleLabel}</p>
        </div>
        <ThemeToggle onDark className="h-10 w-10" />
      </div>
      <nav className="mt-7 flex flex-col gap-1">
        {menu.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-medium transition-colors ${
                isActive ? "bg-white/10 text-gold" : "text-onteal/80 hover:bg-white/5 hover:text-onteal"
              }`
            }
          >
            <Icon name={m.icon} />
            {m.label}
          </NavLink>
        ))}
        {user.role !== "student" && (
          <Link to="/" className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-medium text-onteal/80 hover:bg-white/5">
            <Icon name="search" />
            View site
          </Link>
        )}
      </nav>

      <div className="mt-auto rounded-2xl bg-white/5 p-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} dark />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user.agentInfo?.businessName || user.name}</p>
            {user.role === "agent" ? (
              verified ? (
                <span className="text-xs font-semibold text-[#72D49D]">Verified agent</span>
              ) : (
                <span className="text-xs text-onteal/60">Not verified yet</span>
              )
            ) : (
              <p className="truncate text-xs text-onteal/60">{user.email}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2 text-sm font-semibold text-onteal/80 hover:bg-white/5"
        >
          <Icon name="logout" size={16} /> Log out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px] gap-6 p-3 sm:p-5">
      <div className="sticky top-5 hidden h-[calc(100vh-2.5rem)] w-[260px] shrink-0 lg:block">{sidebar}</div>

      {open && (
        <div className="fixed inset-0 z-50 bg-night/50 p-3 lg:hidden" onClick={() => setOpen(false)}>
          <div className="h-full w-[270px]" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-between rounded-full border border-line bg-sf py-2 pl-4 pr-2 lg:hidden">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle className="h-10 w-10" />
            <button className="grid h-10 w-10 place-items-center rounded-full bg-sf2" onClick={() => setOpen(true)} aria-label="Open menu">
              <Icon name="menu" />
            </button>
          </div>
        </div>
        <main className="pb-16 pt-2 lg:pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

