import type { Database } from "better-sqlite3";
import { getDb } from "~/db/client.server";

export type PermissionOp = "view" | "create" | "update" | "delete";

const DEMO_COMPANY = "demo-company";
const DEMO_USER = "demo-user";

export type AuthContext = {
  db: Database;
  companyId: string;
  userId: string;
};

/** Stub auth layer: single demo tenant (replaces Carbon `requirePermissions`). */
export async function requirePermissions(
  _request: Request,
  _perms: Partial<Record<PermissionOp, "quality">>
): Promise<AuthContext> {
  return {
    db: getDb(),
    companyId: DEMO_COMPANY,
    userId: DEMO_USER
  };
}

export function assertIsPost(request: Request) {
  if (request.method.toUpperCase() !== "POST") {
    throw new Response("Method Not Allowed", { status: 405 });
  }
}
