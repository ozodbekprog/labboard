import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.DATABASE_PATH ?? "./data/labboard.db";

function createDb(): BetterSQLite3Database<typeof schema> {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

// Reuse across hot reloads in dev
const globalForDb = globalThis as unknown as { __labboardDb?: BetterSQLite3Database<typeof schema> };

export const db = globalForDb.__labboardDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__labboardDb = db;

export * from "./schema";
