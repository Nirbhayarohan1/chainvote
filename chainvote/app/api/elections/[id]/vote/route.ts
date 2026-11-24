import { z } from "zod";
import { route, ok, fail } from "@/lib/server/api";
import { requireRole, isErr } from "@/lib/server/auth";
import { castVoteViaRelayer } from "@/lib/server/services";
const S = z.object({ candidateId: z.number().int() });
export const POST = route(async (req, { params }) => {
  const s = requireRole(req, "voter"); if (isErr(s)) return s;
  const b = S.parse(await req.json());
  const r = await castVoteViaRelayer(Number(params.id), s.sub, b.candidateId);
  if (!r.ok) return fail(r.error, r.status);
  const rec: any = r.record;
  return ok({ status: "confirmed", txHash: rec.txHash, blockNumber: rec.blockNumber, gasUsed: rec.gasUsed, nullifier: rec.nullifier, candidateId: rec.candidateId }, 201);
});
export const dynamic = "force-dynamic";
