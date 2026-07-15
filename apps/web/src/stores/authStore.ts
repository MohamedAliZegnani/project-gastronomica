import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PublicUser } from "@gastronomica/shared";
import { api } from "../lib/api";

type AuthState = {
  token: string | null;
  user: PublicUser | null;
  bootstrapped: boolean;
  setSession: (token: string, user: PublicUser) => void;
  clearSession: () => void;
  bootstrap: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      bootstrapped: false,
      setSession: (token, user) => set({ token, user }),
      clearSession: () => set({ token: null, user: null }),
      bootstrap: async () => {
        const { token } = get();
        if (!token) {
          set({ bootstrapped: true, user: null });
          return;
        }
        try {
          const { user } = await api.me(token);
          set({ user, bootstrapped: true });
        } catch {
          set({ token: null, user: null, bootstrapped: true });
        }
      },
      logout: async () => {
        const { token } = get();
        if (token) {
          try {
            await api.logout(token);
          } catch {
            /* ignore */
          }
        }
        set({ token: null, user: null });
      },
    }),
    {
      name: "gastronomica-auth",
      partialize: (s) => ({ token: s.token }),
    },
  ),
);
