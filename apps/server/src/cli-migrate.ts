import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { getPool, setDbReady } from "./db.js";
import { migrate } from "./migrate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const pool = getPool();
if (!pool) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

try {
  await migrate(pool);
  setDbReady(true);
  console.log("Migration complete (schema_version 9)");
  process.exit(0);
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
}
