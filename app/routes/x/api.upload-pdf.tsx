import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { nanoid } from "nanoid";
import { assertIsPost, requirePermissions } from "~/server/auth.server";
import type { ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  assertIsPost(request);
  await requirePermissions(request, { update: "quality" });

  const formData = await request.formData();
  const file = formData.get("file");
  const isBlobLike =
    file !== null &&
    typeof file === "object" &&
    typeof (file as Blob).arrayBuffer === "function" &&
    typeof (file as Blob).size === "number";
  if (!isBlobLike || (file as Blob).size === 0) {
    return Response.json({ ok: false, error: "No file" }, { status: 400 });
  }

  const diagramId = String(formData.get("diagramId") ?? "misc");
  const safeSegment = diagramId.replace(/[^a-zA-Z0-9_-]/g, "") || "misc";
  const buf = Buffer.from(await (file as Blob).arrayBuffer());
  const dir = join(
    process.cwd(),
    "public",
    "uploads",
    "ballooning",
    safeSegment
  );
  mkdirSync(dir, { recursive: true });
  const filename = `${nanoid()}.pdf`;
  const fp = join(dir, filename);
  writeFileSync(fp, buf);
  const url = `/uploads/ballooning/${safeSegment}/${filename}`;
  return Response.json({ ok: true, url });
}
