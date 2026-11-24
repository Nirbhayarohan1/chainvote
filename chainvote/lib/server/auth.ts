import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export type Session = { role: "voter" | "admin"; sub: string };
const secret = () => process.env.JWT_SECRET || "dev-insecure-secret";
export const MOCK_OTP = () => process.env.MOCK_OTP || "123456";

export const signToken = (s: Session) => jwt.sign(s, secret(), { expiresIn: "8h" });
export function verifyToken(t?: string | null): Session | null {
  if (!t) return null;
  try { return jwt.verify(t, secret()) as Session; } catch { return null; }
}
export function getSession(req: Request): Session | null {
  const h = req.headers.get("authorization");
  if (h?.startsWith("Bearer ")) return verifyToken(h.slice(7));
  try { return verifyToken(cookies().get("cv_token")?.value); } catch { return null; }
}
/** Returns a 401/403 response, or the session when authorised. */
export function requireRole(req: Request, role: "voter" | "admin"): Session | NextResponse {
  const s = getSession(req);
  if (!s) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (s.role !== role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return s;
}
export const isErr = (x: any): x is NextResponse => x instanceof NextResponse;
export function withCookie(res: NextResponse, token: string) {
  res.cookies.set("cv_token", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 8 * 3600 });
  return res;
}
