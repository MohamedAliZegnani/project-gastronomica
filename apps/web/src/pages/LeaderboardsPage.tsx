import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "@gastronomica/shared";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { Avatar, Card, PageHeader } from "../components/ui";

export function LeaderboardsPage() {
  const token = useAuthStore((s) => s.token)!;
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .leaderboards(token)
      .then((r) => setEntries(r.entries))
      .catch((e: Error) => setError(e.message));
  }, [token]);

  return (
    <div>
      <PageHeader title="Leaderboards" subtitle="Seasonal team score leaders (demo data)." />
      {error && <p className="text-red-300">{error}</p>}
      <Card className="overflow-hidden !p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-black/25 text-[color:var(--color-muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Rank</th>
              <th className="px-4 py-3 font-semibold">Chef</th>
              <th className="px-4 py-3 font-semibold">Level</th>
              <th className="px-4 py-3 font-semibold">Score</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.rank} className="border-b border-white/5">
                <td className="px-4 py-3 font-bold text-[color:var(--color-accent)]">#{e.rank}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={e.displayName} hue={e.avatarHue} size="sm" />
                    {e.displayName}
                  </div>
                </td>
                <td className="px-4 py-3">{e.level}</td>
                <td className="px-4 py-3 font-semibold">{e.score.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
