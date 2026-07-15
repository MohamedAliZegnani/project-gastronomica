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

const API_BASE = "/api/v1";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error || res.statusText, res.status);
  }
  return data as T;
}

export const api = {
  register: (body: { displayName: string; email: string; password: string }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  guest: (displayName?: string) =>
    request<AuthResponse>("/auth/guest", {
      method: "POST",
      body: JSON.stringify({ displayName }),
    }),
  logout: (token: string) =>
    request<{ ok: boolean }>("/auth/logout", { method: "POST", token }),
  me: (token: string) => request<{ user: PublicUser }>("/auth/me", { token }),
  dashboard: (token: string) => request<DashboardSummary>("/dashboard", { token }),
  profile: (token: string) => request<{ user: PublicUser }>("/profile", { token }),
  friends: (token: string) => request<{ friends: Friend[] }>("/friends", { token }),
  inventory: (token: string) => request<{ items: InventoryItem[] }>("/inventory", { token }),
  shop: (token: string) => request<{ items: ShopItem[] }>("/shop", { token }),
  leaderboards: (token: string) =>
    request<{ entries: LeaderboardEntry[] }>("/leaderboards", { token }),
  settings: (token: string) => request<{ settings: UserSettings }>("/settings", { token }),
  updateSettings: (token: string, patch: Partial<UserSettings>) =>
    request<{ settings: UserSettings }>("/settings", {
      method: "PATCH",
      token,
      body: JSON.stringify(patch),
    }),
  completeMatch: (token: string, body: MatchRewardInput) =>
    request<MatchRewardResponse>("/match/complete", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    }),
};
