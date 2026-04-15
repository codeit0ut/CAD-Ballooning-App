import type { Database } from "better-sqlite3";
import {
  deleteDocument,
  getDocumentById,
  insertBallooningDocument,
  listBallooningDocuments,
  type QualityDocumentRow,
  updateBallooningDocument
} from "~/db/ballooning.repository";
import { migrateBalloonAnnotations } from "./ballooning.migrate";
import { ballooningDiagramValidator } from "./ballooning.models";
import type { BallooningDiagramContent } from "./ballooning.types";
import type { z } from "zod";

function rowToDiagram(row: QualityDocumentRow) {
  let content: BallooningDiagramContent;
  try {
    content = JSON.parse(row.content) as BallooningDiagramContent;
    content.annotations = migrateBalloonAnnotations(content.annotations ?? []);
    content.notes = content.notes ?? [];
  } catch {
    content = {
      drawingNumber: null,
      revision: null,
      pdfUrl: null,
      annotations: [],
      features: [],
      notes: []
    };
  }
  return {
    id: row.id,
    name: row.name,
    content,
    companyId: row.company_id,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getBallooningDiagrams(
  db: Database,
  companyId: string,
  args?: { search: string | null; limit: number; offset: number }
) {
  const { data, count } = listBallooningDocuments(db, companyId, {
    search: args?.search ?? null,
    limit: args?.limit ?? 100,
    offset: args?.offset ?? 0
  });
  return {
    data: data.map(rowToDiagram),
    count,
    error: null as null
  };
}

export async function getBallooningDiagram(db: Database, id: string) {
  const row = getDocumentById(db, id);
  if (!row) {
    return { data: null, error: new Error("Not found") as Error | null };
  }
  return { data: rowToDiagram(row), error: null as null };
}

export async function upsertBallooningDiagram(
  db: Database,
  diagram: Omit<z.infer<typeof ballooningDiagramValidator>, "id"> & {
    id?: string;
    companyId: string;
    createdBy: string;
    updatedBy?: string;
  }
) {
  const {
    id,
    name,
    drawingNumber,
    revision,
    pdfUrl,
    annotations,
    features,
    notes,
    companyId,
    createdBy,
    updatedBy
  } = diagram;

  if (id) {
    const existing = getDocumentById(db, id);
    if (!existing) {
      return { data: null, error: new Error("Document not found") };
    }
    const prev = rowToDiagram(existing).content;
    const content: BallooningDiagramContent = {
      drawingNumber:
        drawingNumber !== undefined && drawingNumber !== ""
          ? drawingNumber
          : prev.drawingNumber,
      revision:
        revision !== undefined && revision !== "" ? revision : prev.revision,
      pdfUrl:
        pdfUrl !== undefined && pdfUrl !== "" ? pdfUrl ?? null : prev.pdfUrl,
      annotations: annotations
        ? JSON.parse(annotations)
        : prev.annotations,
      features: features ? JSON.parse(features) : prev.features,
      notes: notes ? JSON.parse(notes) : prev.notes
    };
    const ok = updateBallooningDocument(db, {
      id,
      name,
      content,
      updatedBy: updatedBy ?? createdBy
    });
    if (!ok) {
      return { data: null, error: new Error("Update failed") };
    }
    return { data: { id }, error: null as null };
  }

  const contentNew: BallooningDiagramContent = {
    drawingNumber: drawingNumber ?? null,
    revision: revision ?? null,
    pdfUrl: pdfUrl ?? null,
    annotations: annotations ? JSON.parse(annotations) : [],
    features: features ? JSON.parse(features) : [],
    notes: notes ? JSON.parse(notes) : []
  };

  const newId = insertBallooningDocument(db, {
    name,
    content: contentNew,
    companyId,
    createdBy
  });
  return { data: { id: newId }, error: null as null };
}

export async function deleteBallooningDiagram(db: Database, id: string) {
  const ok = deleteDocument(db, id);
  if (!ok) {
    return { error: new Error("Delete failed") };
  }
  return { error: null as null };
}
