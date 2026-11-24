import { route, ok } from "@/lib/server/api";
import { getSession } from "@/lib/server/auth";
import { ElectionModel, EligibilityModel } from "@/lib/server/models";
export const GET = route(async (req) => {
  const s = getSession(req);
  const els: any[] = await ElectionModel.find().sort({ chainId: -1 }).lean();
  const elig: any[] = s?.role === "voter" ? await EligibilityModel.find({ voterId: s.sub }).lean() : [];
  return ok(els.map((e) => { const m = elig.find((x) => x.chainId === e.chainId); return { chainId: e.chainId, name: e.name, description: e.description, status: e.status, candidates: e.candidates, eligibleCount: e.eligibleCount, merkleRoot: e.merkleRoot, eligible: !!m, hasVoted: !!m?.hasVoted }; }));
});
export const dynamic = "force-dynamic";
