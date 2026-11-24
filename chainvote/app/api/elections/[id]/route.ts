import { route, ok, fail } from "@/lib/server/api";
import { getSession } from "@/lib/server/auth";
import { ElectionModel, EligibilityModel } from "@/lib/server/models";
import { getProofFor } from "@/lib/server/services";
export const GET = route(async (req, { params }) => {
  const id = Number(params.id);
  const e: any = await ElectionModel.findOne({ chainId: id }).lean();
  if (!e) return fail("Election not found", 404);
  const s = getSession(req);
  let me: any = null;
  if (s?.role === "voter") { const row: any = await EligibilityModel.findOne({ chainId: id, voterId: s.sub }).lean(); me = { eligible: !!row, hasVoted: !!row?.hasVoted, merkleProof: row ? (await getProofFor(id, s.sub))?.proof : null, commitment: row?.commitment }; }
  return ok({ chainId: e.chainId, name: e.name, description: e.description, status: e.status, candidates: e.candidates, merkleRoot: e.merkleRoot, eligibleCount: e.eligibleCount, me });
});
export const dynamic = "force-dynamic";
