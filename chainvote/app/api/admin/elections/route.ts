import { z } from "zod";
import { route, ok } from "@/lib/server/api";
import { requireRole, isErr } from "@/lib/server/auth";
import { ElectionModel } from "@/lib/server/models";
import { createElection } from "@/lib/server/services";
const S = z.object({ name: z.string().min(3), description: z.string().default(""), candidates: z.array(z.string().min(1)).default([]) });
export const GET = route(async (req) => { const s = requireRole(req, "admin"); if (isErr(s)) return s; return ok(await ElectionModel.find().sort({ chainId: -1 }).lean()); });
export const POST = route(async (req) => { const s = requireRole(req, "admin"); if (isErr(s)) return s; const b = S.parse(await req.json()); return ok(await createElection(b.name, b.description, b.candidates), 201); });
export const dynamic = "force-dynamic";
