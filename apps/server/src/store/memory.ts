import type {
  AuthResponse,
  DashboardSummary,
  Friend,
  InventoryItem,
  LeaderboardEntry,
  MatchRewardInput,
  MatchRewardResponse,
  PublicUser,
  ShopItem,
  UserSettings,
} from "@gastronomica/shared";
import {
  DEMO_FRIENDS,
  SHOP_CATALOG,
  defaultSettings,
  hashPassword,
  httpError,
  levelFromXp,
  seedDemoCatalog,
  toPublic,
  uid,
  verifyPassword,
  type StoredUser,
} from "./helpers.js";

const users = new Map<string, StoredUser>();
const tokens = new Map<string, string>();
const matchBest = new Map<string, number>(); // userId -> best score

function issueToken(userId: string): string {
  const token = uid("tok").replace("tok_", "") + uid("x").replace("x_", "");
  tokens.set(token, userId);
  return token;
}

function requireStored(token: string | undefined): StoredUser {
  if (!token) throw httpError("Unauthorized", 401);
  const id = tokens.get(token);
  if (!id) throw httpError("Unauthorized", 401);
  const user = users.get(id);
  if (!user) throw httpError("Unauthorized", 401);
  return user;
}

export async function registerUser(input: {
  displayName: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const emailNormalized = input.email.trim().toLowerCase();
  for (const u of users.values()) {
    if (u.emailNormalized === emailNormalized) {
      throw httpError("Email already registered", 409);
    }
  }
  if (input.password.length < 6) {
    throw httpError("Password must be at least 6 characters", 400);
  }
  const { hash, salt } = hashPassword(input.password);
  const displayName = input.displayName.trim().slice(0, 24) || "Chef";
  const id = uid("user");
  const user: StoredUser = {
    id,
    displayName,
    email: emailNormalized,
    emailNormalized,
    role: "player",
    avatarHue: Math.floor(Math.random() * 360),
    coins: 500,
    gems: 20,
    xp: 40,
    level: 1,
    bio: "New to the brigade.",
    createdAt: new Date().toISOString(),
    passwordHash: hash,
    passwordSalt: salt,
    settings: defaultSettings(displayName),
    inventory: seedDemoCatalog(),
  };
  users.set(id, user);
  return { token: issueToken(id), user: toPublic(user) };
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const emailNormalized = input.email.trim().toLowerCase();
  const user = [...users.values()].find((u) => u.emailNormalized === emailNormalized);
  if (!user?.passwordHash || !user.passwordSalt) {
    throw httpError("Invalid email or password", 401);
  }
  if (!verifyPassword(input.password, user.passwordHash, user.passwordSalt)) {
    throw httpError("Invalid email or password", 401);
  }
  return { token: issueToken(user.id), user: toPublic(user) };
}

export async function guestUser(displayName?: string): Promise<AuthResponse> {
  const name = (displayName?.trim() || `Guest ${Math.floor(Math.random() * 900 + 100)}`).slice(
    0,
    24,
  );
  const id = uid("guest");
  const user: StoredUser = {
    id,
    displayName: name,
    email: null,
    emailNormalized: null,
    role: "guest",
    avatarHue: Math.floor(Math.random() * 360),
    coins: 100,
    gems: 0,
    xp: 0,
    level: 1,
    bio: "Just visiting the kitchen.",
    createdAt: new Date().toISOString(),
    passwordHash: null,
    passwordSalt: null,
    settings: defaultSettings(name),
    inventory: seedDemoCatalog().slice(0, 2),
  };
  users.set(id, user);
  return { token: issueToken(id), user: toPublic(user) };
}

export async function logout(token: string | undefined): Promise<void> {
  if (token) tokens.delete(token);
}

export async function getDashboard(token: string | undefined): Promise<DashboardSummary> {
  const user = requireStored(token);
  user.level = levelFromXp(user.xp);
  return {
    user: toPublic(user),
    friendsOnline: 3,
    dailyMissions: [
      { id: "m1", title: "Serve 5 dishes", progress: Math.min(5, Math.floor(user.xp / 50)), goal: 5 },
      { id: "m2", title: "Play with a friend", progress: 0, goal: 1 },
      { id: "m3", title: "Earn 300 team score", progress: Math.min(300, matchBest.get(user.id) ?? 0), goal: 300 },
    ],
    seasonProgress: {
      name: "Season 1 · Ember Ovens",
      tier: Math.min(30, levelFromXp(user.xp)),
      maxTier: 30,
      xp: user.xp % 250,
      xpToNext: 250,
    },
    recentAchievements: [
      { id: "a1", title: "First Service", emoji: "⭐" },
      { id: "a2", title: "No Walkouts", emoji: "🛎️" },
    ],
    news: [
      { id: "n1", title: "v1.0 polish pass is live", date: "2026-07-15" },
      { id: "n2", title: "Pause, help overlay, and audio prefs wired", date: "2026-07-15" },
    ],
  };
}

export async function getFriends(token: string | undefined): Promise<Friend[]> {
  requireStored(token);
  return [...DEMO_FRIENDS];
}

export async function getInventory(token: string | undefined): Promise<InventoryItem[]> {
  return requireStored(token).inventory;
}

export async function getShop(token: string | undefined): Promise<ShopItem[]> {
  const user = requireStored(token);
  const owned = new Set(user.inventory.map((i) => i.id));
  return SHOP_CATALOG.map((item) => ({ ...item, owned: owned.has(item.id) }));
}

export async function getLeaderboard(_token: string | undefined): Promise<LeaderboardEntry[]> {
  const rows = [...users.values()]
    .map((u) => ({
      displayName: u.displayName,
      score: matchBest.get(u.id) ?? 0,
      level: levelFromXp(u.xp),
      avatarHue: u.avatarHue,
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  if (rows.length === 0) {
    return [
      { rank: 1, displayName: "NovaChef", score: 18420, level: 28, avatarHue: 40 },
      { rank: 2, displayName: "SteamPunk", score: 17110, level: 25, avatarHue: 190 },
      { rank: 3, displayName: "Mira", score: 15880, level: 22, avatarHue: 160 },
    ];
  }

  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

export async function getSettings(token: string | undefined): Promise<UserSettings> {
  return { ...requireStored(token).settings };
}

export async function updateSettings(
  token: string | undefined,
  patch: Partial<UserSettings>,
): Promise<UserSettings> {
  const user = requireStored(token);
  user.settings = {
    ...user.settings,
    ...patch,
    displayName:
      (patch.displayName ?? user.settings.displayName).trim().slice(0, 24) || user.displayName,
    bio: (patch.bio ?? user.settings.bio).slice(0, 140),
  };
  user.displayName = user.settings.displayName;
  user.bio = user.settings.bio;
  return { ...user.settings };
}

export async function getProfile(token: string | undefined): Promise<PublicUser> {
  const user = requireStored(token);
  user.level = levelFromXp(user.xp);
  return toPublic(user);
}

export async function applyMatchRewards(
  token: string | undefined,
  input: MatchRewardInput,
): Promise<MatchRewardResponse> {
  const user = requireStored(token);
  const xp = Math.max(0, Math.floor(input.xpEarned));
  const coins = Math.max(0, Math.floor(input.coinsEarned));
  const score = Math.max(0, Math.floor(input.score ?? 0));
  user.xp += xp;
  user.coins += coins;
  user.level = levelFromXp(user.xp);
  const prev = matchBest.get(user.id) ?? 0;
  if (score > prev) matchBest.set(user.id, score);
  return { user: toPublic(user), applied: { xp, coins } };
}
