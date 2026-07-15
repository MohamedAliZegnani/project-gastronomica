import { NavLink } from "react-router-dom";
import { APP_NAME } from "@gastronomica/shared";
import { useAuthStore } from "../stores/authStore";
import { Avatar, Button } from "./ui";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-semibold ${isActive ? "text-[color:var(--color-accent)]" : "text-[color:var(--color-muted)] hover:text-ink"}`;

export function PublicNavbar() {
  const user = useAuthStore((s) => s.user);
  return (
    <header className="border-b border-white/10 bg-[color:var(--color-panel)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <NavLink to="/" className="font-[family-name:var(--font-display)] text-xl tracking-wide">
          {APP_NAME}
        </NavLink>
        <nav className="flex items-center gap-4">
          <NavLink to="/engine" className={linkClass}>
            Sandbox
          </NavLink>
          {user ? (
            <>
              <NavLink to="/play" className={linkClass}>
                Play
              </NavLink>
              <NavLink to="/dashboard" className={linkClass}>
                Dashboard
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}>
                Login
              </NavLink>
              <NavLink to="/register">
                <Button className="!py-2">Register</Button>
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

const appLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/play", label: "Play" },
  { to: "/friends", label: "Friends" },
  { to: "/inventory", label: "Inventory" },
  { to: "/shop", label: "Shop" },
  { to: "/leaderboards", label: "Leaderboards" },
  { to: "/profile", label: "Profile" },
  { to: "/settings", label: "Settings" },
];

export function AppSidebar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="flex w-full flex-col gap-4 border-b border-white/10 bg-[color:var(--color-panel)] p-4 lg:min-h-full lg:w-64 lg:border-b-0 lg:border-r">
      <NavLink to="/" className="font-[family-name:var(--font-display)] text-lg">
        {APP_NAME}
      </NavLink>
      {user && (
        <div className="flex items-center gap-3 rounded-xl bg-black/20 p-3">
          <Avatar name={user.displayName} hue={user.avatarHue} />
          <div className="min-w-0">
            <p className="truncate font-bold">{user.displayName}</p>
            <p className="text-xs text-[color:var(--color-muted)]">
              Lv {user.level} · {user.coins}🪙 · {user.gems}💎
            </p>
          </div>
        </div>
      )}
      <nav className="grid grid-cols-2 gap-1 lg:grid-cols-1">
        {appLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-semibold ${
                isActive
                  ? "bg-[color:var(--color-accent)]/15 text-[color:var(--color-accent)]"
                  : "text-[color:var(--color-muted)] hover:bg-white/5 hover:text-ink"
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto pt-2">
        <Button variant="ghost" className="w-full" onClick={() => void logout()}>
          Log out
        </Button>
      </div>
    </aside>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 py-8 text-center text-sm text-[color:var(--color-muted)]">
      <p>© {new Date().getFullYear()} {APP_NAME}. Phase 7 scoring.</p>
      <p className="mt-1">Co-op cooking · Web & mobile ready</p>
    </footer>
  );
}
