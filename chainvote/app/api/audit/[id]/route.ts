import { route, ok } from "@/lib/server/api";
import { auditReport } from "@/lib/server/services";
export const GET = route(async (_req, { params }) => ok(await auditReport(Number(params.id))));
export const dynamic = "force-dynamic";
