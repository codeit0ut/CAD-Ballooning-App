import { deleteBallooningDiagram } from "~/modules/ballooning";
import { assertIsPost, requirePermissions } from "~/server/auth.server";
import { path } from "~/utils/path";
import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";

export async function action({ request, params }: ActionFunctionArgs) {
  assertIsPost(request);
  const { db } = await requirePermissions(request, {
    delete: "quality"
  });

  const { id } = params;
  if (!id) throw new Error("Could not find id");

  const result = await deleteBallooningDiagram(db, id);

  if (result.error) {
    throw redirect(path.to.ballooningDiagrams);
  }

  throw redirect(path.to.ballooningDiagrams);
}

export default function DeleteBallooningRoute() {
  return null;
}
