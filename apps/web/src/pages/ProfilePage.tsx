import { useEffect, useState } from "react";
import type { PublicUser } from "@gastronomica/shared";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { Avatar, Badge, Card, PageHeader } from "../components/ui";

export function ProfilePage() {
  const token = useAuthStore((s) => s.token)!;
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .profile(token)
      .then((r) => setUser(r.user))
      .catch((e: Error) => setError(e.message));
  }, [token]);

  if (error) return <p className="text-red-300">{error}</p>;
  if (!user) return <p className="text-[color:var(--color-muted)]">Loading profile…</p>;

  return (
    <div>
      <PageHeader title="Profile" subtitle="How other chefs see you." />
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={user.displayName} hue={user.avatarHue} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-3xl">{user.displayName}</h2>
            <Badge>{user.role}</Badge>
          </div>
          <p className="mt-1 text-[color:var(--color-muted)]">{user.bio}</p>
          <p className="mt-3 text-sm">
            Level {user.level} · {user.xp} XP · {user.coins} coins · {user.gems} gems
          </p>
          {user.email && (
            <p className="mt-1 text-sm text-[color:var(--color-muted)]">{user.email}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
