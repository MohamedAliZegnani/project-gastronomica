import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type {
  InventoryItem,
  PublicUser,
  UserSettings,
} from "@gastronomica/shared";

export type StoredUser = PublicUser & {
  emailNormalized: string | null;
  passwordHash: string | null;
  passwordSalt: string | null;
  settings: UserSettings;
  inventory: InventoryItem[];
};

export function uid(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 32).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const next = scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export function toPublic(user: StoredUser): PublicUser {
  const {
    emailNormalized: _e,
    passwordHash: _h,
    passwordSalt: _s,
    settings: _set,
    inventory: _inv,
    ...pub
  } = user;
  return pub;
}

export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / 250) + 1);
}

export function seedDemoCatalog(): InventoryItem[] {
  return [
    { id: "hat_toque", name: "Classic Toque", kind: "hat", rarity: "common", equipped: true, emoji: "👨‍🍳" },
    { id: "outfit_apron", name: "Kitchen Apron", kind: "outfit", rarity: "common", equipped: true, emoji: "🦺" },
    { id: "emote_cheer", name: "Chef's Kiss", kind: "emote", rarity: "rare", equipped: false, emoji: "💋" },
    { id: "badge_rookie", name: "Rookie Whisk", kind: "badge", rarity: "common", equipped: true, emoji: "🎖️" },
  ];
}

export function defaultSettings(displayName: string): UserSettings {
  return {
    displayName,
    bio: "Ready for service.",
    masterVolume: 80,
    musicVolume: 60,
    sfxVolume: 70,
    reduceMotion: false,
    showPings: true,
  };
}

export function httpError(message: string, status: number): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

export const SHOP_CATALOG = [
  { id: "hat_chili", name: "Chili Crown", kind: "hat" as const, rarity: "epic" as const, priceCoins: 800, priceGems: 0, emoji: "🌶️" },
  { id: "outfit_midnight", name: "Midnight Coat", kind: "outfit" as const, rarity: "rare" as const, priceCoins: 600, priceGems: 0, emoji: "🧥" },
  { id: "emote_fire", name: "Flambé!", kind: "emote" as const, rarity: "legendary" as const, priceCoins: 0, priceGems: 40, emoji: "🔥" },
  { id: "tool_ladle", name: "Golden Ladle", kind: "tool" as const, rarity: "rare" as const, priceCoins: 450, priceGems: 0, emoji: "🥄" },
  { id: "badge_star", name: "Three-Star Pin", kind: "badge" as const, rarity: "epic" as const, priceCoins: 0, priceGems: 25, emoji: "🌟" },
];

export const DEMO_FRIENDS = [
  { id: "f1", displayName: "Mira", status: "online" as const, level: 12, avatarHue: 160 },
  { id: "f2", displayName: "Jules", status: "in_match" as const, level: 9, avatarHue: 28 },
  { id: "f3", displayName: "Kenji", status: "away" as const, level: 15, avatarHue: 210 },
  { id: "f4", displayName: "Sara", status: "offline" as const, level: 7, avatarHue: 310 },
];
