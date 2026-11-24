import { route, ok } from "@/lib/server/api";
import { requireRole, isErr } from "@/lib/server/auth";
import { auditReport } from "@/lib/server/services";
export const GET = route(async (req, { params }) => { const s = requireRole(req, "admin"); if (isErr(s)) return s; return ok(await auditReport(Number(params.id))); });
export const dynamic = "force-dynamic";
