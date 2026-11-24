import { z } from "zod";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { route, fail } from "@/lib/server/api";
import { signToken, withCookie } from "@/lib/server/auth";
import { VoterModel } from "@/lib/server/models";
const S = z.object({ voterId: z.string(), password: z.string() });
export const POST = route(async (req) => {
  const b = S.parse(await req.json());
  const v: any = await VoterModel.findOne({ voterId: b.voterId });
  if (!v || !(await bcrypt.compare(b.password, v.passwordHash))) return fail("Invalid credentials", 401);
  if (!v.verified) return fail("Phone not verified. Complete OTP verification first.", 403);
  const token = signToken({ role: "voter", sub: v.voterId });
  return withCookie(NextResponse.json({ token, voterId: v.voterId, name: v.name }), token);
});
export const dynamic = "force-dynamic";
