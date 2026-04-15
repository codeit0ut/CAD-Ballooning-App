import type { Database } from "better-sqlite3";
import { nanoid } from "nanoid";

export type QualityDocumentRow = {
  id: string;
  name: string;
  content: string;
  company_id: string;
  created_by: string;
  updated_by: string;
  tags: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function nowIso() {
  return new Date().toISOString();
}

const baseWhere = `company_id = ? AND tags LIKE '%ballooning%'`;

export function listBallooningDocuments(
  db: Database,
  companyId: string,
  opts: { search: string | null; limit: number; offset: number }
) {
  if (opts.search) {
    const where = `${baseWhere} AND name LIKE ?`;
    const countRow = db
      .prepare(`SELECT COUNT(*) as c FROM quality_document WHERE ${where}`)
      .get(companyId, `%${opts.search}%`) as { c: number };
    const rows = db
      .prepare(
        `SELECT * FROM quality_document WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`
      )
      .all(
        companyId,
        `%${opts.search}%`,
        opts.limit,
        opts.offset
      ) as QualityDocumentRow[];
    return { data: rows, count: countRow.c };
  }

  const countRow = db
    .prepare(`SELECT COUNT(*) as c FROM quality_document WHERE ${baseWhere}`)
    .get(companyId) as { c: number };
  const rows = db
    .prepare(
      `SELECT * FROM quality_document WHERE ${baseWhere} ORDER BY name ASC LIMIT ? OFFSET ?`
    )
    .all(companyId, opts.limit, opts.offset) as QualityDocumentRow[];

  return { data: rows, count: countRow.c };
}

export function getDocumentById(db: Database, id: string) {
  const row = db
    .prepare(`SELECT * FROM quality_document WHERE id = ?`)
    .get(id) as QualityDocumentRow | undefined;
  return row ?? null;
}

export function insertBallooningDocument(
  db: Database,
  input: {
    name: string;
    content: Record<string, unknown>;
    companyId: string;
    createdBy: string;
  }
) {
  const id = nanoid();
  const ts = nowIso();
  const content = JSON.stringify(input.content);
  const tags = JSON.stringify(["ballooning"]);
  db.prepare(
    `
    INSERT INTO quality_document (
      id, name, content, company_id, created_by, updated_by, tags, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)
  `
  ).run(
    id,
    input.name,
    content,
    input.companyId,
    input.createdBy,
    input.createdBy,
    tags,
    ts,
    ts
  );
  return id;
}

export function updateBallooningDocument(
  db: Database,
  input: {
    id: string;
    name: string;
    content: Record<string, unknown>;
    updatedBy: string;
  }
) {
  const ts = nowIso();
  const res = db
    .prepare(
      `
    UPDATE quality_document
    SET name = ?, content = ?, updated_by = ?, updated_at = ?
    WHERE id = ?
  `
    )
    .run(
      input.name,
      JSON.stringify(input.content),
      input.updatedBy,
      ts,
      input.id
    );
  return res.changes > 0;
}

export function deleteDocument(db: Database, id: string) {
  const res = db.prepare(`DELETE FROM quality_document WHERE id = ?`).run(id);
  return res.changes > 0;
}
