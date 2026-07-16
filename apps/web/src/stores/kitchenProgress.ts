import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MapId } from "../game/maps/catalog";
import { isMapId } from "../game/maps/catalog";

export type MapBest = {
  /** Best performance % ever on this map (0–100). */
  percent: number;
  stars: 0 | 1 | 2 | 3;
};

type KitchenProgress = {
  coins: number;
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

export const useKitchenProgress = create<KitchenProgress>()(
  persist(
    (set, get) => ({
      coins: 0,
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
    }),
    {
      name: "gastronomica-kitchen-progress",
      partialize: (s) => ({ coins: s.coins, mapBest: s.mapBest }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<KitchenProgress>;
        return {
          ...current,
          coins: Math.max(0, Math.floor(Number(p.coins) || 0)),
          mapBest: normalizeMapBest(p.mapBest as Record<string, MapBest> | undefined),
        };
      },
    },
  ),
);
