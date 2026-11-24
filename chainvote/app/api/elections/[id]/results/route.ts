import { route, ok } from "@/lib/server/api";
import { resultsFor } from "@/lib/server/services";
export const GET = route(async (_req, { params }) => ok(await resultsFor(Number(params.id))));
export const dynamic = "force-dynamic";
