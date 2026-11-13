// Applies db/schema.sql to the database in DATABASE_URL. Safe to run on every deploy.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});
await client.connect();
try {
  await client.query(fs.readFileSync(path.join(here, "..", "db", "schema.sql"), "utf8"));
  console.log("Database schema is up to date.");
} finally {
  await client.end();
}
