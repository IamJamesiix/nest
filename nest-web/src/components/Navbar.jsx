import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth, homeFor } from "../context/AuthContext";
import { useCompare } from "../context/CompareContext";
import ThemeToggle from "./ThemeToggle";
import { Avatar, Icon, Logo } from "./ui";

const linkCls = ({ isActive }) =>
  `rounded-full px-4 py-2.5 text-[15px] font-medium transition-colors ${isActive ? "bg-sf2 text-tealt" : "hover:bg-sf2/70"}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const { items } = useCompare();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const links = [
    { to: "/listings", label: "Find a house" },
    { to: "/compare", label: `Compare${items.length ? ` (${items.length})` : ""}` },
  ];
  if (!user || user.role === "student") links.push({ to: "/roommates", label: "Find a roommate" });
  if (!user) links.push({ to: "/register?role=agent", label: "For agents" });

  return (
    <header className="sticky top-0 z-40 mx-auto w-full max-w-[1320px] px-4 pt-4 sm:px-6">
      <nav className="flex items-center justify-between gap-3 rounded-full border border-glassline bg-glass py-2.5 pl-5 pr-2.5 shadow-soft backdrop-blur-xl">
        <Logo />

        <div className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkCls} end>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          {user ? (
            <>
              <Link to={homeFor(user) === "/listings" ? "/me/inspections" : homeFor(user)} className="btn btn-ghost">
                <Avatar name={user.name} size="h-7 w-7" />
                {user.role === "student" ? "My account" : "Dashboard"}
              </Link>
              <button onClick={handleLogout} className="btn px-3 text-mut hover:text-ink" aria-label="Log out">
                <Icon name="logout" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn hover:bg-sf2">
                Sign in
              </Link>
              <Link to="/register?role=agent" className="btn btn-gold">
                List a house
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button className="grid h-11 w-11 place-items-center rounded-full border border-line bg-sf" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            <Icon name={open ? "x" : "menu"} />
          </button>
        </div>
      </nav>

      {open && (
        <div className="mt-2 flex flex-col gap-1 rounded-3xl border border-line bg-sf p-3 shadow-soft lg:hidden" onClick={() => setOpen(false)}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkCls} end>
              {l.label}
            </NavLink>
          ))}
          <div className="my-1 h-px bg-line" />
          {user ? (
            <>
              <Link to={homeFor(user) === "/listings" ? "/me/inspections" : homeFor(user)} className="rounded-full px-4 py-2.5 font-semibold">
                {user.role === "student" ? "My account" : "Dashboard"}
              </Link>
              <button onClick={handleLogout} className="rounded-full px-4 py-2.5 text-left font-semibold text-bad">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-full px-4 py-2.5 font-semibold">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-gold">
                Create account
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
