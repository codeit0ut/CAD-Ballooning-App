import { getBallooningDiagrams } from "~/modules/ballooning";
import { BallooningTable } from "~/modules/ballooning/ui";
import { requirePermissions } from "~/server/auth.server";
import type { LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData } from "react-router";
import { VStack } from "~/components/ui/stack";

function parseLimitOffset(params: URLSearchParams) {
  const lim = Number(params.get("limit"));
  const off = Number(params.get("offset"));
  return {
    limit: Number.isFinite(lim) && lim > 0 ? lim : 100,
    offset: Number.isFinite(off) && off >= 0 ? off : 0
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { db, companyId } = await requirePermissions(request, {
    view: "quality"
  });

  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const search = searchParams.get("search");
  const { limit, offset } = parseLimitOffset(searchParams);

  const diagrams = await getBallooningDiagrams(db, companyId, {
    search,
    limit,
    offset
  });

  return {
    diagrams: diagrams.data ?? [],
    count: diagrams.count ?? 0,
    search
  };
}

export default function BallooningRoute() {
  const { diagrams, count, search } = useLoaderData<typeof loader>();

  return (
    <VStack spacing={0} className="h-full">
      <BallooningTable data={diagrams} count={count} search={search} />
      <Outlet />
    </VStack>
  );
}
