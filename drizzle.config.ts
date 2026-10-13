import type { Config } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "";

export default (
  url.startsWith("libsql:") || url.startsWith("http")
    ? {
        schema: "./src/db/schema.ts",
        out: "./drizzle",
        dialect: "turso",
        dbCredentials: { url, authToken: process.env.DATABASE_AUTH_TOKEN },
      }
    : {
        schema: "./src/db/schema.ts",
        out: "./drizzle",
        dialect: "sqlite",
        dbCredentials: { url: process.env.DATABASE_PATH ?? "./data/labboard.db" },
      }
) satisfies Config;
