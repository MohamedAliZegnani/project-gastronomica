import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { DashboardSummary } from "@gastronomica/shared";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { Badge, Button, Card, PageHeader, ProgressBar } from "../components/ui";

const playModes = [
  { title: "Quick Match", to: "/play/quick", blurb: "Public co-op queue" },
  { title: "Private Match", to: "/play/private", blurb: "Invite with a room code" },
  { title: "Practice", to: "/play/practice", blurb: "Solo scored service" },
];

export function DashboardPage() {
  const token = useAuthStore((s) => s.token)!;
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .dashboard(token)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [token]);

  if (error) return <p className="text-red-300">{error}</p>;
  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-white/5" />
        <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Hey, ${data.user.displayName}`}
        subtitle="Your kitchen HQ — jump into a match or check the brigade."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Play</h2>
              <p className="text-sm text-[color:var(--color-muted)]">
                Co-op lobbies, private rooms, and solo practice are ready.
              </p>
            </div>
            <Link to="/play">
              <Button>Open play menu</Button>
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {playModes.map((mode) => (
              <Link
                key={mode.title}
                to={mode.to}
                className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-[color:var(--color-accent)]/40"
              >
                <p className="font-bold">{mode.title}</p>
                <p className="mt-1 text-xs text-[color:var(--color-muted)]">{mode.blurb}</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-bold">Season</h2>
          <p className="mt-1 text-sm text-[color:var(--color-muted)]">{data.seasonProgress.name}</p>
          <p className="mt-3 text-sm">
            Tier {data.seasonProgress.tier}/{data.seasonProgress.maxTier}
          </p>
          <div className="mt-2">
            <ProgressBar value={data.seasonProgress.xp} max={data.seasonProgress.xpToNext} />
          </div>
          <p className="mt-2 text-xs text-[color:var(--color-muted)]">
            {data.seasonProgress.xp}/{data.seasonProgress.xpToNext} XP to next tier
          </p>
        </Card>

        <Card>
          <h2 className="font-bold">Daily missions</h2>
          <ul className="mt-3 grid gap-3">
            {data.dailyMissions.map((m) => (
              <li key={m.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{m.title}</span>
                  <span className="text-[color:var(--color-muted)]">
                    {m.progress}/{m.goal}
                  </span>
                </div>
                <ProgressBar value={m.progress} max={m.goal} />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="font-bold">Friends online</h2>
          <p className="mt-3 font-[family-name:var(--font-display)] text-4xl">
            {data.friendsOnline}
          </p>
          <Link to="/friends" className="mt-3 inline-block">
            <Button variant="secondary">View friends</Button>
          </Link>
        </Card>

        <Card>
          <h2 className="font-bold">Recent achievements</h2>
          <ul className="mt-3 grid gap-2">
            {data.recentAchievements.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-sm">
                <span>{a.emoji}</span>
                <span>{a.title}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold">News</h2>
            <Badge>v1.0</Badge>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.news.map((n) => (
              <li key={n.id} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                <p className="font-semibold">{n.title}</p>
                <p className="text-[color:var(--color-muted)]">{n.date}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
