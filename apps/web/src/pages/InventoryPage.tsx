import { useEffect, useState } from "react";
import type { InventoryItem } from "@gastronomica/shared";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { Badge, Card, PageHeader } from "../components/ui";

export function InventoryPage() {
  const token = useAuthStore((s) => s.token)!;
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .inventory(token)
      .then((r) => setItems(r.items))
      .catch((e: Error) => setError(e.message));
  }, [token]);

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Hats, outfits, emotes, and badges you own." />
      {error && <p className="text-red-300">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-3xl">{item.emoji}</span>
              {item.equipped && <Badge>Equipped</Badge>}
            </div>
            <h3 className="mt-3 font-bold">{item.name}</h3>
            <p className="text-sm capitalize text-[color:var(--color-muted)]">
              {item.kind} · {item.rarity}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
