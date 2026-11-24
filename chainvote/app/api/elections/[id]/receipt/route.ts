import { route, ok, fail } from "@/lib/server/api";
import { requireRole, isErr } from "@/lib/server/auth";
import { VoteRecordModel } from "@/lib/server/models";
export const GET = route(async (req, { params }) => {
  const s = requireRole(req, "voter"); if (isErr(s)) return s;
  const r: any = await VoteRecordModel.findOne({ chainId: Number(params.id), voterId: s.sub }).lean();
  return r ? ok({ txHash: r.txHash, blockNumber: r.blockNumber, gasUsed: r.gasUsed, nullifier: r.nullifier, candidateId: r.candidateId, at: r.createdAt }) : fail("No vote recorded", 404);
});
export const dynamic = "force-dynamic";
