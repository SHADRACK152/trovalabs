import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to run migrations.");
const pool = new Pool({ connectionString });
const migrationPath = fileURLToPath(new URL("../migrations/001_mcp_context.sql", import.meta.url));
try {
  const sql = await readFile(path.resolve(migrationPath), "utf8");
  await pool.query(sql);
  console.log("MCP context schema applied.");
} finally {
  await pool.end();
}
