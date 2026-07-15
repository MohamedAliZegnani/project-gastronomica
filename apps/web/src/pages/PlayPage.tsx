import { Link } from "react-router-dom";
import { Button, Card, PageHeader } from "../components/ui";

const modes = [
  {
    title: "Quick Match",
    body: "Jump into a public co-op kitchen with matchmaking.",
    status: "Live",
    to: "/play/quick" as string | null,
  },
  {
    title: "Private Match",
    body: "Create a room code and invite friends.",
    status: "Live",
    to: "/play/private",
  },
  {
    title: "Practice",
    body: "Timed matches with combos, star ratings, XP and coin rewards.",
    status: "Live",
    to: "/play/practice",
  },
  {
    title: "Ranked",
    body: "Competitive seasons with leaderboard climb.",
    status: "Later",
    to: null,
  },
];

export function PlayPage() {
  return (
    <div>
      <PageHeader title="Play" subtitle="Choose how you want to cook tonight." />
      <div className="grid gap-4 md:grid-cols-2">
        {modes.map((m) => (
          <Card key={m.title}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold">{m.title}</h2>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-[color:var(--color-muted)]">
                {m.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-[color:var(--color-muted)]">{m.body}</p>
            {m.to ? (
              <Link to={m.to} className="mt-4 inline-block">
                <Button>Enter kitchen</Button>
              </Link>
            ) : (
              <Button className="mt-4" disabled>
                Coming soon
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
