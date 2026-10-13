import Database from "better-sqlite3";
import { drizzle as drizzleBetter, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";

/** Dev: better-sqlite3 (sync). Prod (Turso): @libsql/client (async) — call sites always `await`, which is a no-op for sync values. */
export type DB = BetterSQLite3Database<typeof schema>;

function createDb(): DB {
  const url = process.env.DATABASE_URL;
  const token = process.env.DATABASE_AUTH_TOKEN;
  if (url && (url.startsWith("libsql:") || url.startsWith("http"))) {
    const client = createClient({ url, authToken: token });
    return drizzleLibsql(client, { schema }) as unknown as DB;
  }
  const dbPath = process.env.DATABASE_PATH ?? "./data/labboard.db";
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzleBetter(sqlite, { schema });
}

const globalForDb = globalThis as unknown as { __labboardDb?: DB };
export const db = globalForDb.__labboardDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__labboardDb = db;

export * from "./schema";
