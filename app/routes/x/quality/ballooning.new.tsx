import {
  parseBallooningDiagramForm,
  upsertBallooningDiagram
} from "~/modules/ballooning";
import { BallooningForm } from "~/modules/ballooning/ui";
import { assertIsPost, requirePermissions } from "~/server/auth.server";
import { path } from "~/utils/path";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, redirect, useNavigate } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  await requirePermissions(request, { create: "quality" });
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  assertIsPost(request);
  const { db, companyId, userId } = await requirePermissions(request, {
    create: "quality"
  });

  const formData = await request.formData();
  const parsed = parseBallooningDiagramForm(formData);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") errors[key] = issue.message;
    }
    return data({ errors }, { status: 400 });
  }

  const result = await upsertBallooningDiagram(db, {
    ...parsed.data,
    companyId,
    createdBy: userId
  });

  if (result.error || !result.data?.id) {
    return data(
      { errors: { _form: "Failed to create ballooning diagram" } },
      { status: 400 }
    );
  }

  throw redirect(path.to.ballooningDiagram(result.data.id));
}

export default function BallooningNewRoute() {
  const navigate = useNavigate();

  return (
    <BallooningForm
      initialValues={{ name: "", drawingNumber: "", revision: "" }}
      onClose={() => navigate(-1)}
    />
  );
}
