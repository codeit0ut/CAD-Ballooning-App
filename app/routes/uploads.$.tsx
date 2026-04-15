import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { LoaderFunctionArgs } from "react-router";

const UPLOAD_ROOT = join(process.cwd(), "public", "uploads");

function resolveUploadPath(splat: string) {
  const segments = splat.split("/").filter(Boolean);
  for (const seg of segments) {
    if (seg === ".." || seg.includes("\0")) return null;
  }
  if (segments.length === 0) return null;
  const abs = join(UPLOAD_ROOT, ...segments);
  if (!abs.startsWith(UPLOAD_ROOT)) return null;
  return abs;
}

export async function loader({ params }: LoaderFunctionArgs) {
  const splat = params["*"] ?? "";
  const abs = resolveUploadPath(splat);
  if (!abs) throw new Response("Not Found", { status: 404 });

  let st;
  try {
    st = await stat(abs);
  } catch {
    throw new Response("Not Found", { status: 404 });
  }
  if (!st.isFile()) throw new Response("Not Found", { status: 404 });

  const body = await readFile(abs);
  const isPdf = abs.toLowerCase().endsWith(".pdf");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": isPdf ? "application/pdf" : "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
