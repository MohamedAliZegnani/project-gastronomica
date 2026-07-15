import type pg from "pg";
import { getPool } from "./db.js";

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  email_normalized TEXT,
  role TEXT NOT NULL CHECK (role IN ('player', 'guest')),
  avatar_hue INT NOT NULL DEFAULT 140,
  coins INT NOT NULL DEFAULT 0,
  gems INT NOT NULL DEFAULT 0,
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  bio TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
  password_salt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_normalized_unique UNIQUE (email_normalized)
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  master_volume INT NOT NULL DEFAULT 80,
  music_volume INT NOT NULL DEFAULT 60,
  sfx_volume INT NOT NULL DEFAULT 70,
  reduce_motion BOOLEAN NOT NULL DEFAULT FALSE,
  show_pings BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS inventory_items (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  rarity TEXT NOT NULL,
  equipped BOOLEAN NOT NULL DEFAULT FALSE,
  emoji TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS match_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  stars INT NOT NULL DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
  served INT NOT NULL DEFAULT 0,
  xp_earned INT NOT NULL DEFAULT 0,
  coins_earned INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS match_results_user_score_idx ON match_results(user_id, score DESC);
CREATE INDEX IF NOT EXISTS match_results_score_idx ON match_results(score DESC);

INSERT INTO schema_meta (key, value)
VALUES ('phase', '9-persistence'), ('schema_version', '9')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
`;

export async function migrate(pool?: pg.Pool | null): Promise<boolean> {
  const p = pool ?? getPool();
  if (!p) return false;
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    await client.query(MIGRATION_SQL);
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
