import { route, ok } from "@/lib/server/api";
import { requireRole, isErr } from "@/lib/server/auth";
import { generateMerkle, setStatus } from "@/lib/server/services";
export const POST = route(async (req, { params }) => { const s = requireRole(req, "admin"); if (isErr(s)) return s; return ok({ txHash: await setStatus(Number(params.id), "end") }); });
export const dynamic = "force-dynamic";
