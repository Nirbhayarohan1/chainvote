import { z } from "zod";
import { NextResponse } from "next/server";
import { route, fail } from "@/lib/server/api";
import { signToken, withCookie } from "@/lib/server/auth";
const S = z.object({ username: z.string(), password: z.string() });
export const POST = route(async (req) => {
  const b = S.parse(await req.json());
  if (b.username !== (process.env.ADMIN_USERNAME || "admin") || b.password !== (process.env.ADMIN_PASSWORD || "Admin@12345")) return fail("Invalid credentials", 401);
  const token = signToken({ role: "admin", sub: b.username });
  return withCookie(NextResponse.json({ token, role: "admin" }), token);
});
export const dynamic = "force-dynamic";
