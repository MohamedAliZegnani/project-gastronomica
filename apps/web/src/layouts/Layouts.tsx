import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { PublicNavbar, AppSidebar, SiteFooter } from "../components/Nav";

export function PublicLayout() {
  return (
    <div className="flex min-h-full flex-col">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  if (!bootstrapped) {
    return (
      <div className="grid min-h-full place-items-center text-[color:var(--color-muted)]">
        Loading kitchen…
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <AppSidebar />
      <main className="flex-1 px-4 py-6 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}
