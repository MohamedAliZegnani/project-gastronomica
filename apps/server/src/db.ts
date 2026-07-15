import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let ready = false;

export function getPool(): pg.Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      connectionTimeoutMillis: 2000,
      max: 10,
    });
  }
  return pool;
}

export function isDbReady(): boolean {
  return ready;
}

export function setDbReady(value: boolean) {
  ready = value;
}

export async function checkDatabase(): Promise<"up" | "down" | "unknown"> {
  const p = getPool();
  if (!p) return "unknown";
  try {
    await p.query("SELECT 1");
    return "up";
  } catch {
    return "down";
  }
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  const p = getPool();
  if (!p || !ready) {
    throw new Error("Database is not available");
  }
  return p.query<T>(text, params);
}

export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const p = getPool();
  if (!p || !ready) throw new Error("Database is not available");
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
