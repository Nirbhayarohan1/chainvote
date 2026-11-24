import { z } from "zod";
import { route, ok, fail } from "@/lib/server/api";
import { MOCK_OTP } from "@/lib/server/auth";
import { VoterModel } from "@/lib/server/models";
const S = z.object({ voterId: z.string(), otp: z.string() });
export const POST = route(async (req) => {
  const b = S.parse(await req.json());
  if (b.otp !== MOCK_OTP()) return fail("Invalid OTP", 401);
  const r = await VoterModel.updateOne({ voterId: b.voterId }, { verified: true });
  if (!r.matchedCount) return fail("Unknown voter", 404);
  return ok({ verified: true });
});
export const dynamic = "force-dynamic";
