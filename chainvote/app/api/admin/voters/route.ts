import { z } from "zod";
import { route, ok } from "@/lib/server/api";
import { requireRole, isErr } from "@/lib/server/auth";
import { VoterModel } from "@/lib/server/models";
import { createVoter } from "@/lib/server/services";
const S = z.object({ count: z.number().int().min(1).max(2000).optional(), csv: z.string().optional() });
export const GET = route(async (req) => { const s = requireRole(req, "admin"); if (isErr(s)) return s; return ok(await VoterModel.find({}, "-passwordHash").sort({ voterId: 1 }).limit(2000).lean()); });
/** Register synthetic voters: `count` random ones, or `csv` lines "name,phone[,password]". Voters are created pre-verified. */
export const POST = route(async (req) => {
  const s = requireRole(req, "admin"); if (isErr(s)) return s;
  const b = S.parse(await req.json());
  const made: string[] = [];
  if (b.csv) for (const line of b.csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) { const [name, phone, pw] = line.split(",").map((x) => x.trim()); if (!name || !/^\d{10}$/.test(phone || "") || name.toLowerCase() === "name") continue; made.push(((await createVoter(name, phone, pw || "voter123", true)) as any).voterId); }
  if (b.count) for (let i = 0; i < b.count; i++) made.push(((await createVoter(`Synthetic Voter ${i + 1}`, String(9000000000 + Math.floor(Math.random() * 99999999)).slice(0, 10), "voter123", true)) as any).voterId);
  return ok({ created: made.length, voterIds: made }, 201);
});
export const dynamic = "force-dynamic";
