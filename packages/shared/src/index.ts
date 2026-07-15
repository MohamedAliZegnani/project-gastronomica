export const APP_NAME = "Ready, Set, Cook";
export const APP_VERSION = "1.1.0";

export type HealthStatus = {
  ok: boolean;
  service: string;
  version: string;
  database: "up" | "down" | "unknown";
  timestamp: string;
};

export type UserRole = "player" | "guest";

export type PublicUser = {
  id: string;
  displayName: string;
  email: string | null;
  role: UserRole;
  avatarHue: number;
  coins: number;
  gems: number;
  xp: number;
  level: number;
  bio: string;
  createdAt: string;
};

export type AuthResponse = {
  token: string;
  user: PublicUser;
};

export type FriendStatus = "online" | "away" | "offline" | "in_match";

export type Friend = {
  id: string;
  displayName: string;
  status: FriendStatus;
  level: number;
  avatarHue: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  kind: "hat" | "outfit" | "emote" | "badge" | "tool";
  rarity: "common" | "rare" | "epic" | "legendary";
  equipped: boolean;
  emoji: string;
};

export type ShopItem = {
  id: string;
  name: string;
  kind: InventoryItem["kind"];
  rarity: InventoryItem["rarity"];
  priceCoins: number;
  priceGems: number;
  emoji: string;
  owned: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  displayName: string;
  score: number;
  level: number;
  avatarHue: number;
};

export type UserSettings = {
  displayName: string;
  bio: string;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  reduceMotion: boolean;
  showPings: boolean;
};

export type DashboardSummary = {
  user: PublicUser;
  friendsOnline: number;
  dailyMissions: { id: string; title: string; progress: number; goal: number }[];
  seasonProgress: { name: string; tier: number; maxTier: number; xp: number; xpToNext: number };
  recentAchievements: { id: string; title: string; emoji: string }[];
  news: { id: string; title: string; date: string }[];
};

export type MatchRewardInput = {
  xpEarned: number;
  coinsEarned: number;
  score: number;
  stars: 0 | 1 | 2 | 3;
  served: number;
};

export type MatchRewardResponse = {
  user: PublicUser;
  applied: { xp: number; coins: number };
};

/** Lobby / multiplayer */
export const LOBBY_MAX_PLAYERS = 4;
export const LOBBY_MIN_PLAYERS = 1;
export const QUICK_MATCH_MIN = 2;
export const MATCH_DURATION_SEC = 180;

export type LobbyMode = "private" | "quick";
export type LobbyPhase = "lobby" | "starting" | "playing" | "ended";
export type FacingDir = "down" | "left" | "right" | "up";

export type LobbyPlayer = {
  id: string;
  displayName: string;
  avatarHue: number;
  ready: boolean;
  slot: number;
  isHost: boolean;
};

export type LobbyState = {
  code: string;
  phase: LobbyPhase;
  mode: LobbyMode;
  players: LobbyPlayer[];
  maxPlayers: number;
  hostId: string;
  countdown: number | null;
};

export type MatchStartPayload = {
  code: string;
  seed: number;
  durationSec: number;
  startedAt: number;
  players: LobbyPlayer[];
};

export type PlayerNetState = {
  id: string;
  x: number;
  y: number;
  facing: FacingDir;
  moving: boolean;
  sprinting: boolean;
  heldLabel: string | null;
};

export type LobbyErrorPayload = {
  message: string;
};

export type MatchmakingStatus = {
  searching: boolean;
  queueSize: number;
};

export const SocketEvents = {
  PING: "ping",
  PONG: "pong",
  LOBBY_CREATE: "lobby:create",
  LOBBY_JOIN: "lobby:join",
  LOBBY_LEAVE: "lobby:leave",
  LOBBY_READY: "lobby:ready",
  LOBBY_START: "lobby:start",
  LOBBY_STATE: "lobby:state",
  LOBBY_ERROR: "lobby:error",
  MATCH_FIND: "match:find",
  MATCH_CANCEL: "match:cancel",
  MATCH_STATUS: "match:status",
  MATCH_START: "match:start",
  MATCH_END: "match:end",
  PLAYER_STATE: "player:state",
  PLAYER_LEFT: "player:left",
} as const;

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents];

export type LobbyCreatePayload = {
  displayName: string;
  avatarHue: number;
};

export type LobbyJoinPayload = {
  code: string;
  displayName: string;
  avatarHue: number;
};

export type LobbyReadyPayload = {
  ready: boolean;
};

export type MatchFindPayload = {
  displayName: string;
  avatarHue: number;
};
