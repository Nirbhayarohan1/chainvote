import { z } from "zod";
import { route, ok, fail } from "@/lib/server/api";
import { requireRole, isErr } from "@/lib/server/auth";
import { ElectionModel } from "@/lib/server/models";
import { addCandidate, renameCandidate } from "@/lib/server/services";
const A = z.object({ name: z.string().min(1) });
const R = z.object({ cid: z.number().int(), name: z.string().min(1) });
async function guard(req: Request, id: string) {
  const s = requireRole(req, "admin"); if (isErr(s)) return s;
  const el: any = await ElectionModel.findOne({ chainId: Number(id) });
  if (!el) return fail("Election not found", 404);
  if (el.status !== "created") return fail("Candidates can only be changed before activation", 409);
  return null;
}
export const POST = route(async (req, { params }) => { const g = await guard(req, params.id); if (g) return g; return ok(await addCandidate(Number(params.id), A.parse(await req.json()).name), 201); });
export const PUT = route(async (req, { params }) => { const g = await guard(req, params.id); if (g) return g; const b = R.parse(await req.json()); await renameCandidate(Number(params.id), b.cid, b.name); return ok({ updated: true }); });
export const dynamic = "force-dynamic";
