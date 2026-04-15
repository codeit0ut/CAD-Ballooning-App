import {
  getBallooningDiagram,
  parseBallooningDiagramForm,
  upsertBallooningDiagram
} from "~/modules/ballooning";
import type { BallooningDiagramContent } from "~/modules/ballooning/ballooning.types";
import { BalloonDiagramEditor } from "~/modules/ballooning/ui";
import { assertIsPost, requirePermissions } from "~/server/auth.server";
import { path } from "~/utils/path";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, redirect, useLoaderData } from "react-router";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { db, companyId } = await requirePermissions(request, {
    view: "quality"
  });

  const { id } = params;
  if (!id) throw new Error("Could not find id");

  const diagram = await getBallooningDiagram(db, id);

  if (diagram.error || !diagram.data) {
    throw redirect(path.to.ballooningDiagrams);
  }

  if (diagram.data.companyId !== companyId) {
    throw redirect(path.to.ballooningDiagrams);
  }

  return { diagram: diagram.data };
}

export async function action({ request, params }: ActionFunctionArgs) {
  assertIsPost(request);
  const { db, companyId, userId } = await requirePermissions(request, {
    update: "quality"
  });

  const { id } = params;
  if (!id) return data({ errors: { _form: "Missing id" } }, { status: 400 });

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
    id,
    companyId,
    createdBy: userId,
    updatedBy: userId
  });

  if (result.error) {
    return data({ errors: { _form: "Failed to save" } }, { status: 400 });
  }

  throw redirect(path.to.ballooningDiagram(id));
}

export default function BallooningDetailRoute() {
  const { diagram } = useLoaderData<typeof loader>();
  const content = diagram.content as BallooningDiagramContent | null;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <BalloonDiagramEditor
        diagramId={diagram.id}
        name={diagram.name}
        content={content}
      />
    </div>
  );
}
