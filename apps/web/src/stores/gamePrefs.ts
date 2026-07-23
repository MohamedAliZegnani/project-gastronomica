import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_CHEF_LOOK,
  normalizeChefLook,
  type ChefLook,
} from "../game/cosmetics/chefLook";
import {
  DEFAULT_SITE_THEME,
  isSiteThemeId,
  type SiteThemeId,
} from "../theme/siteThemes";

type GamePrefs = {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  reduceMotion: boolean;
  showPings: boolean;
  siteTheme: SiteThemeId;
  chefLook: ChefLook;
  setFromSettings: (partial: Partial<Omit<GamePrefs, "setFromSettings" | "setChefLook" | "setSiteTheme">>) => void;
  setChefLook: (look: Partial<ChefLook>) => void;
  setSiteTheme: (theme: SiteThemeId) => void;
};

export const useGamePrefs = create<GamePrefs>()(
  persist(
    (set, get) => ({
      masterVolume: 80,
      musicVolume: 60,
      sfxVolume: 70,
      reduceMotion: false,
      showPings: true,
      siteTheme: DEFAULT_SITE_THEME,
      chefLook: { ...DEFAULT_CHEF_LOOK },
      setFromSettings: (partial) => set(partial),
      setChefLook: (partial) =>
        set({ chefLook: normalizeChefLook({ ...get().chefLook, ...partial }) }),
      setSiteTheme: (siteTheme) => set({ siteTheme }),
    }),
    {
      name: "gastronomica-game-prefs",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GamePrefs>;
        return {
          ...current,
          ...p,
          siteTheme: isSiteThemeId(p.siteTheme) ? p.siteTheme : current.siteTheme,
          chefLook: normalizeChefLook(p.chefLook ?? current.chefLook),
        };
      },
    },
  ),
);
