import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MapId } from "../game/maps/catalog";
import { isMapId } from "../game/maps/catalog";
import {
  COSMETIC_SHOP,
  FREE_BOOT_STYLE,
  FREE_CHARACTER_ID,
  FREE_SHIRT_STYLE,
  type BootStyle,
  type CharacterId,
  type ShirtStyle,
} from "../game/cosmetics/chefLook";

export type MapBest = {
  /** Best performance % ever on this map (0–100). */
  percent: number;
  stars: 0 | 1 | 2 | 3;
};

type KitchenProgress = {
  coins: number;
  /** Purchased cosmetic shop item ids. */
  ownedCosmetics: string[];
  mapBest: Partial<Record<MapId, MapBest>>;
  /** Apply a finished run (solo). Adds coins; updates best % if higher. */
  applyMatch: (input: {
    mapId: string;
    coinsEarned: number;
    performancePercent: number;
    stars: 0 | 1 | 2 | 3;
  }) => void;
  /** Replace from duo server state (shared wallet). */
  syncFromDuo: (input: {
    coins: number;
    mapBest: Record<string, MapBest>;
  }) => void;
  bestFor: (mapId: MapId) => MapBest | null;
  ownsCosmetic: (itemId: string) => boolean;
  ownsShirtStyle: (style: ShirtStyle) => boolean;
  ownsBootStyle: (style: BootStyle) => boolean;
  ownsCharacterId: (id: CharacterId) => boolean;
  /** Buy a shop item with kitchen coins. Returns false if already owned / can't afford / unknown. */
  buyCosmetic: (itemId: string) => boolean;
};

function normalizeMapBest(
  raw: Record<string, MapBest> | Partial<Record<MapId, MapBest>> | undefined,
): Partial<Record<MapId, MapBest>> {
  const out: Partial<Record<MapId, MapBest>> = {};
  if (!raw) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (!isMapId(k) || !v) continue;
    const percent = Math.max(0, Math.min(100, Math.round(Number(v.percent) || 0)));
    const stars = ([0, 1, 2, 3] as const).includes(v.stars as 0 | 1 | 2 | 3)
      ? (v.stars as 0 | 1 | 2 | 3)
      : percent >= 100
        ? 3
        : percent >= 70
          ? 2
          : percent >= 40
            ? 1
            : 0;
    out[k] = { percent, stars };
  }
  return out;
}

function normalizeOwned(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set(COSMETIC_SHOP.map((i) => i.id));
  return raw.filter((id): id is string => typeof id === "string" && ids.has(id));
}

export const useKitchenProgress = create<KitchenProgress>()(
  persist(
    (set, get) => ({
      coins: 0,
      ownedCosmetics: [],
      mapBest: {},
      applyMatch: ({ mapId, coinsEarned, performancePercent, stars }) => {
        if (!isMapId(mapId)) return;
        const add = Math.max(0, Math.floor(coinsEarned));
        const percent = Math.max(0, Math.min(100, Math.round(performancePercent)));
        const prev = get().mapBest[mapId];
        const nextBest =
          !prev || percent > prev.percent
            ? { percent, stars }
            : prev;
        set({
          coins: get().coins + add,
          mapBest: { ...get().mapBest, [mapId]: nextBest },
        });
      },
      syncFromDuo: ({ coins, mapBest }) => {
        set({
          coins: Math.max(0, Math.floor(Number(coins) || 0)),
          mapBest: normalizeMapBest(mapBest),
        });
      },
      bestFor: (mapId) => get().mapBest[mapId] ?? null,
      ownsCosmetic: (itemId) => get().ownedCosmetics.includes(itemId),
      ownsShirtStyle: (style) => {
        if (style === FREE_SHIRT_STYLE) return true;
        const item = COSMETIC_SHOP.find((i) => i.shirtStyle === style);
        return item ? get().ownedCosmetics.includes(item.id) : false;
      },
      ownsBootStyle: (style) => {
        if (style === FREE_BOOT_STYLE) return true;
        const item = COSMETIC_SHOP.find((i) => i.bootStyle === style);
        return item ? get().ownedCosmetics.includes(item.id) : false;
      },
      ownsCharacterId: (id) => {
        if (id === FREE_CHARACTER_ID) return true;
        const item = COSMETIC_SHOP.find((i) => i.characterId === id);
        return item ? get().ownedCosmetics.includes(item.id) : false;
      },
      buyCosmetic: (itemId) => {
        const item = COSMETIC_SHOP.find((i) => i.id === itemId);
        if (!item) return false;
        if (get().ownedCosmetics.includes(itemId)) return false;
        if (get().coins < item.priceCoins) return false;
        set({
          coins: get().coins - item.priceCoins,
          ownedCosmetics: [...get().ownedCosmetics, itemId],
        });
        return true;
      },
    }),
    {
      name: "gastronomica-kitchen-progress",
      partialize: (s) => ({
        coins: s.coins,
        mapBest: s.mapBest,
        ownedCosmetics: s.ownedCosmetics,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<KitchenProgress>;
        return {
          ...current,
          coins: Math.max(0, Math.floor(Number(p.coins) || 0)),
          mapBest: normalizeMapBest(p.mapBest as Record<string, MapBest> | undefined),
          ownedCosmetics: normalizeOwned(p.ownedCosmetics),
        };
      },
    },
  ),
);
