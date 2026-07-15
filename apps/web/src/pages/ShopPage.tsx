import { useEffect, useState } from "react";
import type { ShopItem } from "@gastronomica/shared";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { Badge, Button, Card, PageHeader } from "../components/ui";

export function ShopPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .shop(token)
      .then((r) => setItems(r.items))
      .catch((e: Error) => setError(e.message));
  }, [token]);

  return (
    <div>
      <PageHeader
        title="Shop"
        subtitle={`Spend coins & gems · you have ${user?.coins ?? 0}🪙 / ${user?.gems ?? 0}💎`}
      />
      {error && <p className="text-red-300">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            <div className="flex items-start justify-between">
              <span className="text-3xl">{item.emoji}</span>
              <Badge>{item.rarity}</Badge>
            </div>
            <h3 className="mt-3 font-bold">{item.name}</h3>
            <p className="text-sm capitalize text-[color:var(--color-muted)]">{item.kind}</p>
            <p className="mt-2 text-sm font-semibold">
              {item.priceCoins > 0 && `${item.priceCoins} coins`}
              {item.priceCoins > 0 && item.priceGems > 0 && " · "}
              {item.priceGems > 0 && `${item.priceGems} gems`}
            </p>
            <Button className="mt-4 w-full" disabled>
              {item.owned ? "Owned" : "Purchase (Phase 9)"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
