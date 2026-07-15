import { Router, type Request, type Response, type NextFunction } from "express";
import {
  applyMatchRewards,
  getDashboard,
  getFriends,
  getInventory,
  getLeaderboard,
  getProfile,
  getSettings,
  getShop,
  guestUser,
  loginUser,
  logout,
  persistenceMode,
  registerUser,
  updateSettings,
} from "./store/index.js";

type AuthedRequest = Request & { token?: string };

function tokenFrom(req: Request): string | undefined {
  const header = req.header("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return undefined;
}

function withToken(req: AuthedRequest, _res: Response, next: NextFunction) {
  req.token = tokenFrom(req);
  next();
}

function handleError(res: Response, err: unknown) {
  const status = (err as { status?: number }).status ?? 500;
  const message = err instanceof Error ? err.message : "Server error";
  res.status(status).json({ error: message });
}

export const apiRouter = Router();
apiRouter.use(withToken);

apiRouter.get("/persistence", (_req, res) => {
  res.json({ mode: persistenceMode() });
});

apiRouter.post("/auth/register", async (req, res) => {
  try {
    const { displayName, email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    res
      .status(201)
      .json(await registerUser({ displayName: displayName || "Chef", email, password }));
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    res.json(await loginUser({ email, password }));
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.post("/auth/guest", async (req, res) => {
  try {
    res.status(201).json(await guestUser(req.body?.displayName));
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.post("/auth/logout", async (req: AuthedRequest, res) => {
  try {
    await logout(req.token);
    res.json({ ok: true });
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.get("/auth/me", async (req: AuthedRequest, res) => {
  try {
    res.json({ user: await getProfile(req.token) });
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.get("/dashboard", async (req: AuthedRequest, res) => {
  try {
    res.json(await getDashboard(req.token));
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.get("/profile", async (req: AuthedRequest, res) => {
  try {
    res.json({ user: await getProfile(req.token) });
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.get("/friends", async (req: AuthedRequest, res) => {
  try {
    res.json({ friends: await getFriends(req.token) });
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.get("/inventory", async (req: AuthedRequest, res) => {
  try {
    res.json({ items: await getInventory(req.token) });
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.get("/shop", async (req: AuthedRequest, res) => {
  try {
    res.json({ items: await getShop(req.token) });
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.get("/leaderboards", async (req: AuthedRequest, res) => {
  try {
    res.json({ entries: await getLeaderboard(req.token) });
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.get("/settings", async (req: AuthedRequest, res) => {
  try {
    res.json({ settings: await getSettings(req.token) });
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.patch("/settings", async (req: AuthedRequest, res) => {
  try {
    res.json({ settings: await updateSettings(req.token, req.body ?? {}) });
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.post("/match/complete", async (req: AuthedRequest, res) => {
  try {
    const xpEarned = Number(req.body?.xpEarned ?? 0);
    const coinsEarned = Number(req.body?.coinsEarned ?? 0);
    const score = Number(req.body?.score ?? 0);
    const stars = Number(req.body?.stars ?? 0) as 0 | 1 | 2 | 3;
    const served = Number(req.body?.served ?? 0);
    const result = await applyMatchRewards(req.token, {
      xpEarned,
      coinsEarned,
      score,
      stars,
      served,
    });
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});
