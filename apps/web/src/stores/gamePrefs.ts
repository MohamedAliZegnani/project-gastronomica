import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_CHEF_LOOK,
  normalizeChefLook,
  type ChefLook,
} from "../game/cosmetics/chefLook";

type GamePrefs = {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  reduceMotion: boolean;
  showPings: boolean;
  chefLook: ChefLook;
  setFromSettings: (partial: Partial<Omit<GamePrefs, "setFromSettings">>) => void;
  setChefLook: (look: Partial<ChefLook>) => void;
};

export const useGamePrefs = create<GamePrefs>()(
  persist(
    (set, get) => ({
      masterVolume: 80,
      musicVolume: 60,
      sfxVolume: 70,
      reduceMotion: false,
      showPings: true,
      chefLook: { ...DEFAULT_CHEF_LOOK },
      setFromSettings: (partial) => set(partial),
      setChefLook: (partial) =>
        set({ chefLook: normalizeChefLook({ ...get().chefLook, ...partial }) }),
    }),
    {
      name: "gastronomica-game-prefs",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GamePrefs>;
        return {
          ...current,
          ...p,
          chefLook: normalizeChefLook(p.chefLook ?? current.chefLook),
        };
      },
    },
  ),
);
