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
import { query, withTransaction } from "../db.js";
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

type UserRow = {
  id: string;
  display_name: string;
  email: string | null;
  email_normalized: string | null;
  role: "player" | "guest";
  avatar_hue: number;
  coins: number;
  gems: number;
  xp: number;
  level: number;
  bio: string;
  password_hash: string | null;
  password_salt: string | null;
  created_at: Date | string;
};

type SettingsRow = {
  user_id: string;
  display_name: string;
  bio: string;
  master_volume: number;
  music_volume: number;
  sfx_volume: number;
  reduce_motion: boolean;
  show_pings: boolean;
};

type InvRow = {
  item_id: string;
  name: string;
  kind: InventoryItem["kind"];
  rarity: InventoryItem["rarity"];
  equipped: boolean;
  emoji: string;
};

function rowToPublic(row: UserRow): PublicUser {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    avatarHue: row.avatar_hue,
    coins: row.coins,
    gems: row.gems,
    xp: row.xp,
    level: row.level,
    bio: row.bio,
    createdAt:
      typeof row.created_at === "string" ? row.created_at : row.created_at.toISOString(),
  };
}

function settingsFromRow(row: SettingsRow): UserSettings {
  return {
    displayName: row.display_name,
    bio: row.bio,
    masterVolume: row.master_volume,
    musicVolume: row.music_volume,
    sfxVolume: row.sfx_volume,
    reduceMotion: row.reduce_motion,
    showPings: row.show_pings,
  };
}

async function loadInventory(userId: string): Promise<InventoryItem[]> {
  const { rows } = await query<InvRow>(
    `SELECT item_id, name, kind, rarity, equipped, emoji
     FROM inventory_items WHERE user_id = $1 ORDER BY item_id`,
    [userId],
  );
  return rows.map((r) => ({
    id: r.item_id,
    name: r.name,
    kind: r.kind,
    rarity: r.rarity,
    equipped: r.equipped,
    emoji: r.emoji,
  }));
}

async function loadSettings(userId: string, fallbackName: string): Promise<UserSettings> {
  const { rows } = await query<SettingsRow>(
    `SELECT * FROM user_settings WHERE user_id = $1`,
    [userId],
  );
  if (rows[0]) return settingsFromRow(rows[0]);
  return defaultSettings(fallbackName);
}

async function loadStored(userId: string): Promise<StoredUser | null> {
  const { rows } = await query<UserRow>(`SELECT * FROM users WHERE id = $1`, [userId]);
  const row = rows[0];
  if (!row) return null;
  const settings = await loadSettings(userId, row.display_name);
  const inventory = await loadInventory(userId);
  return {
    ...rowToPublic(row),
    emailNormalized: row.email_normalized,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    settings,
    inventory,
  };
}

async function issueToken(userId: string): Promise<string> {
  const token = randomToken();
  await query(`INSERT INTO sessions (token, user_id) VALUES ($1, $2)`, [token, userId]);
  return token;
}

function randomToken(): string {
  return uid("sess").replace("sess_", "") + uid("k").replace("k_", "");
}

async function requireUserId(token: string | undefined): Promise<string> {
  if (!token) throw httpError("Unauthorized", 401);
  const { rows } = await query<{ user_id: string }>(
    `SELECT user_id FROM sessions WHERE token = $1`,
    [token],
  );
  if (!rows[0]) throw httpError("Unauthorized", 401);
  return rows[0].user_id;
}

async function requireStored(token: string | undefined): Promise<StoredUser> {
  const userId = await requireUserId(token);
  const user = await loadStored(userId);
  if (!user) throw httpError("Unauthorized", 401);
  return user;
}

async function insertUserBundle(user: StoredUser): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO users (
        id, display_name, email, email_normalized, role, avatar_hue,
        coins, gems, xp, level, bio, password_hash, password_salt, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        user.id,
        user.displayName,
        user.email,
        user.emailNormalized,
        user.role,
        user.avatarHue,
        user.coins,
        user.gems,
        user.xp,
        user.level,
        user.bio,
        user.passwordHash,
        user.passwordSalt,
        user.createdAt,
      ],
    );
    await client.query(
      `INSERT INTO user_settings (
        user_id, display_name, bio, master_volume, music_volume, sfx_volume, reduce_motion, show_pings
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        user.id,
        user.settings.displayName,
        user.settings.bio,
        user.settings.masterVolume,
        user.settings.musicVolume,
        user.settings.sfxVolume,
        user.settings.reduceMotion,
        user.settings.showPings,
      ],
    );
    for (const item of user.inventory) {
      await client.query(
        `INSERT INTO inventory_items (user_id, item_id, name, kind, rarity, equipped, emoji)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [user.id, item.id, item.name, item.kind, item.rarity, item.equipped, item.emoji],
      );
    }
  });
}

export async function registerUser(input: {
  displayName: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const emailNormalized = input.email.trim().toLowerCase();
  const existing = await query(`SELECT id FROM users WHERE email_normalized = $1`, [
    emailNormalized,
  ]);
  if (existing.rows.length > 0) throw httpError("Email already registered", 409);
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
  try {
    await insertUserBundle(user);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "23505") throw httpError("Email already registered", 409);
    throw err;
  }
  return { token: await issueToken(id), user: toPublic(user) };
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const emailNormalized = input.email.trim().toLowerCase();
  const { rows } = await query<UserRow>(
    `SELECT * FROM users WHERE email_normalized = $1`,
    [emailNormalized],
  );
  const row = rows[0];
  if (!row?.password_hash || !row.password_salt) {
    throw httpError("Invalid email or password", 401);
  }
  if (!verifyPassword(input.password, row.password_hash, row.password_salt)) {
    throw httpError("Invalid email or password", 401);
  }
  const user = await loadStored(row.id);
  if (!user) throw httpError("Invalid email or password", 401);
  return { token: await issueToken(user.id), user: toPublic(user) };
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
  await insertUserBundle(user);
  return { token: await issueToken(id), user: toPublic(user) };
}

export async function logout(token: string | undefined): Promise<void> {
  if (!token) return;
  await query(`DELETE FROM sessions WHERE token = $1`, [token]);
}

export async function getDashboard(token: string | undefined): Promise<DashboardSummary> {
  const user = await requireStored(token);
  const best = await query<{ best: string | null }>(
    `SELECT MAX(score)::text AS best FROM match_results WHERE user_id = $1`,
    [user.id],
  );
  const bestScore = Number(best.rows[0]?.best ?? 0);
  user.level = levelFromXp(user.xp);
  return {
    user: toPublic(user),
    friendsOnline: DEMO_FRIENDS.filter((f) => f.status === "online").length,
    dailyMissions: [
      { id: "m1", title: "Serve 5 dishes", progress: Math.min(5, Math.floor(user.xp / 50)), goal: 5 },
      { id: "m2", title: "Play with a friend", progress: 0, goal: 1 },
      { id: "m3", title: "Earn 300 team score", progress: Math.min(300, bestScore), goal: 300 },
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
      { id: "a2", title: "Persisted Progress", emoji: "🗄️" },
    ],
    news: [
      { id: "n1", title: "v1.0 polish pass is live", date: "2026-07-15" },
      { id: "n2", title: "Accounts persist when Postgres is connected", date: "2026-07-15" },
    ],
  };
}

export async function getFriends(token: string | undefined): Promise<Friend[]> {
  await requireStored(token);
  const { rows } = await query<{
    id: string;
    display_name: string;
    level: number;
    avatar_hue: number;
  }>(
    `SELECT id, display_name, level, avatar_hue FROM users
     WHERE role = 'player' ORDER BY xp DESC LIMIT 8`,
  );
  if (rows.length <= 1) return [...DEMO_FRIENDS];
  return rows.slice(0, 6).map((r, i) => ({
    id: r.id,
    displayName: r.display_name,
    status: (["online", "away", "offline", "in_match"] as const)[i % 4]!,
    level: r.level,
    avatarHue: r.avatar_hue,
  }));
}

export async function getInventory(token: string | undefined): Promise<InventoryItem[]> {
  return (await requireStored(token)).inventory;
}

export async function getShop(token: string | undefined): Promise<ShopItem[]> {
  const user = await requireStored(token);
  const owned = new Set(user.inventory.map((i) => i.id));
  return SHOP_CATALOG.map((item) => ({ ...item, owned: owned.has(item.id) }));
}

export async function getLeaderboard(_token: string | undefined): Promise<LeaderboardEntry[]> {
  const { rows } = await query<{
    display_name: string;
    score: number;
    level: number;
    avatar_hue: number;
  }>(
    `SELECT u.display_name, u.level, u.avatar_hue, COALESCE(MAX(m.score), 0)::int AS score
     FROM users u
     LEFT JOIN match_results m ON m.user_id = u.id
     GROUP BY u.id, u.display_name, u.level, u.avatar_hue
     HAVING COALESCE(MAX(m.score), 0) > 0
     ORDER BY score DESC
     LIMIT 20`,
  );
  if (rows.length === 0) {
    return [
      { rank: 1, displayName: "NovaChef", score: 18420, level: 28, avatarHue: 40 },
      { rank: 2, displayName: "SteamPunk", score: 17110, level: 25, avatarHue: 190 },
      { rank: 3, displayName: "Mira", score: 15880, level: 22, avatarHue: 160 },
    ];
  }
  return rows.map((r, i) => ({
    rank: i + 1,
    displayName: r.display_name,
    score: r.score,
    level: r.level,
    avatarHue: r.avatar_hue,
  }));
}

export async function getSettings(token: string | undefined): Promise<UserSettings> {
  return { ...(await requireStored(token)).settings };
}

export async function updateSettings(
  token: string | undefined,
  patch: Partial<UserSettings>,
): Promise<UserSettings> {
  const user = await requireStored(token);
  const next: UserSettings = {
    ...user.settings,
    ...patch,
    displayName:
      (patch.displayName ?? user.settings.displayName).trim().slice(0, 24) || user.displayName,
    bio: (patch.bio ?? user.settings.bio).slice(0, 140),
  };
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE user_settings SET
        display_name = $2, bio = $3, master_volume = $4, music_volume = $5,
        sfx_volume = $6, reduce_motion = $7, show_pings = $8
       WHERE user_id = $1`,
      [
        user.id,
        next.displayName,
        next.bio,
        next.masterVolume,
        next.musicVolume,
        next.sfxVolume,
        next.reduceMotion,
        next.showPings,
      ],
    );
    await client.query(
      `UPDATE users SET display_name = $2, bio = $3 WHERE id = $1`,
      [user.id, next.displayName, next.bio],
    );
  });
  return next;
}

export async function getProfile(token: string | undefined): Promise<PublicUser> {
  const user = await requireStored(token);
  const level = levelFromXp(user.xp);
  if (level !== user.level) {
    await query(`UPDATE users SET level = $2 WHERE id = $1`, [user.id, level]);
    user.level = level;
  }
  return toPublic(user);
}

export async function applyMatchRewards(
  token: string | undefined,
  input: MatchRewardInput,
): Promise<MatchRewardResponse> {
  const user = await requireStored(token);
  const xp = Math.max(0, Math.floor(input.xpEarned));
  const coins = Math.max(0, Math.floor(input.coinsEarned));
  const score = Math.max(0, Math.floor(input.score ?? 0));
  const stars = Math.min(3, Math.max(0, Math.floor(input.stars ?? 0))) as 0 | 1 | 2 | 3;
  const served = Math.max(0, Math.floor(input.served ?? 0));
  const matchId = uid("match");
  const nextXp = user.xp + xp;
  const nextCoins = user.coins + coins;
  const nextLevel = levelFromXp(nextXp);

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE users SET xp = $2, coins = $3, level = $4 WHERE id = $1`,
      [user.id, nextXp, nextCoins, nextLevel],
    );
    await client.query(
      `INSERT INTO match_results (id, user_id, score, stars, served, xp_earned, coins_earned)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [matchId, user.id, score, stars, served, xp, coins],
    );
  });

  return {
    user: {
      ...toPublic(user),
      xp: nextXp,
      coins: nextCoins,
      level: nextLevel,
    },
    applied: { xp, coins },
  };
}
