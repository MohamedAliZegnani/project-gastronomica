import { useEffect, useState } from "react";
import { APP_VERSION } from "@gastronomica/shared";

type Health = {
  ok: boolean;
  database: "up" | "down" | "unknown";
  persistence?: "postgres" | "memory";
  version?: string;
};

export function StatusPill() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/health")
      .then((r) => r.json())
      .then((data: Health) => {
        if (alive) setHealth(data);
      })
      .catch(() => {
        if (alive) setHealth({ ok: false, database: "down" });
      });
    return () => {
      alive = false;
    };
  }, []);

  const dbOk = health?.database === "up";
  const persistence = health?.persistence ?? "memory";

  return (
    <div className="inline-flex flex-wrap items-center gap-2 text-xs text-[color:var(--color-muted)]">
      <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
        v{health?.version ?? APP_VERSION}
      </span>
      <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
        API {health?.ok === false ? "offline" : "online"}
      </span>
      <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
        DB {dbOk ? "connected" : health?.database === "unknown" ? "n/a" : "offline"}
      </span>
      <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
        Save {persistence}
      </span>
    </div>
  );
}
