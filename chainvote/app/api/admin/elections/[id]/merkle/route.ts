import { route, ok } from "@/lib/server/api";
import { requireRole, isErr } from "@/lib/server/auth";
import { generateMerkle, setStatus } from "@/lib/server/services";
export const POST = route(async (req, { params }) => { const s = requireRole(req, "admin"); if (isErr(s)) return s; return ok(await generateMerkle(Number(params.id))); });
export const dynamic = "force-dynamic";
