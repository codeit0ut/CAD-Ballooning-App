/**
 * Carbon stores ballooning diagrams as rows on `qualityDocument` (Postgres)
 * with JSON `content` and `tags` containing "ballooning" — see
 * `quality.service.ts` in the ERP app. This project has no Supabase, so we
 * keep the same layering (repository → service → routes) against a local
 * SQLite file for the same fields only.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

let db: Database.Database | null = null;

function getDbPath() {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "ballooning.db");
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma("journal_mode = WAL");
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS quality_document (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '{}',
      company_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '["ballooning"]',
      status TEXT NOT NULL DEFAULT 'Active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_qd_company ON quality_document(company_id);
  `);
}
