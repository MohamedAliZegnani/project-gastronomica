import { useEffect, useState } from "react";
import type { Friend } from "@gastronomica/shared";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { Avatar, Card, PageHeader } from "../components/ui";

const statusLabel: Record<Friend["status"], string> = {
  online: "Online",
  away: "Away",
  offline: "Offline",
  in_match: "In match",
};

export function FriendsPage() {
  const token = useAuthStore((s) => s.token)!;
  const [friends, setFriends] = useState<Friend[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .friends(token)
      .then((r) => setFriends(r.friends))
      .catch((e: Error) => setError(e.message));
  }, [token]);

  return (
    <div>
      <PageHeader title="Friends" subtitle="See who's ready to plate with you." />
      {error && <p className="text-red-300">{error}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {friends.map((f) => (
          <Card key={f.id} className="flex items-center gap-3">
            <Avatar name={f.displayName} hue={f.avatarHue} />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{f.displayName}</p>
              <p className="text-sm text-[color:var(--color-muted)]">
                Lv {f.level} · {statusLabel[f.status]}
              </p>
            </div>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                f.status === "online"
                  ? "bg-[color:var(--color-accent-2)]"
                  : f.status === "in_match"
                    ? "bg-[color:var(--color-accent)]"
                    : f.status === "away"
                      ? "bg-yellow-500"
                      : "bg-white/25"
              }`}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
