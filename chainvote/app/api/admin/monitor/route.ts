import { route, ok } from "@/lib/server/api";
import { requireRole, isErr } from "@/lib/server/auth";
import { AuditLogModel, VoteRecordModel, VoterModel } from "@/lib/server/models";
import { provider } from "@/lib/server/chain";
export const GET = route(async (req) => {
  const s = requireRole(req, "admin"); if (isErr(s)) return s;
  let block: number | null = null; try { block = await provider().getBlockNumber(); } catch {}
  return ok({ latestBlock: block, voters: await VoterModel.countDocuments(), votes: await VoteRecordModel.find().sort({ createdAt: -1 }).limit(50).lean(), log: await AuditLogModel.find().sort({ createdAt: -1 }).limit(50).lean() });
});
export const dynamic = "force-dynamic";
