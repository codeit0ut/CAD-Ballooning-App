import type { LoaderFunctionArgs } from "react-router";

/** Chrome DevTools probes this path; RR dev had no route and logged noisy 404s. */
export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    throw new Response(null, { status: 405 });
  }
  return Response.json({}, { headers: { "Cache-Control": "no-store" } });
}
