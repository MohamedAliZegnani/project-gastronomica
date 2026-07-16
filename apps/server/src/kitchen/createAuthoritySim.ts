import { getMapLayout } from "@gastronomica/shared";
import { AuthorityKitchen } from "./AuthorityKitchen.js";
import { AuthorityBuffet } from "./AuthorityBuffet.js";

export type AuthoritySim = AuthorityKitchen | AuthorityBuffet;

export function createAuthoritySim(
  mapId: string,
  code: string,
  seed: number,
  durationSec: number,
  roster: { id: string; displayName: string; avatarHue: number; slot: number }[],
): AuthoritySim {
  const layout = getMapLayout(mapId);
  const duration = durationSec || layout.matchSeconds;
  if (layout.mode === "buffet") {
    return new AuthorityBuffet(code, seed, duration, roster, layout.id);
  }
  return new AuthorityKitchen(code, seed, duration, roster, layout.id);
}
