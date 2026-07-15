import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { APP_NAME, APP_VERSION, type HealthStatus } from "@gastronomica/shared";
import { checkDatabase, getPool, setDbReady } from "./db.js";
import { attachLobby } from "./lobby.js";
import { migrate } from "./migrate.js";
import { apiRouter } from "./routes.js";
import { persistenceMode } from "./store/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

async function healthPayload(): Promise<HealthStatus> {
  return {
    ok: true,
    service: APP_NAME,
    version: APP_VERSION,
    database: await checkDatabase(),
    timestamp: new Date().toISOString(),
  };
}

app.get("/health", async (_req, res) => {
  const payload = await healthPayload();
  res.json({ ...payload, persistence: persistenceMode() });
});

app.get("/api/health", async (_req, res) => {
  const payload = await healthPayload();
  res.json({ ...payload, persistence: persistenceMode() });
});

app.use("/api/v1", apiRouter);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"] },
});

attachLobby(io);

async function boot() {
  const pool = getPool();
  if (pool) {
    try {
      await migrate(pool);
      setDbReady(true);
      console.log(`${APP_NAME} persistence: postgres`);
    } catch (err) {
      setDbReady(false);
      console.warn(
        `${APP_NAME} persistence: memory (postgres unavailable)`,
        err instanceof Error ? err.message : err,
      );
    }
  } else {
    setDbReady(false);
    console.log(`${APP_NAME} persistence: memory (DATABASE_URL not set)`);
  }

  httpServer.listen(PORT, () => {
    console.log(`${APP_NAME} API listening on http://localhost:${PORT}`);
  });
}

void boot();
