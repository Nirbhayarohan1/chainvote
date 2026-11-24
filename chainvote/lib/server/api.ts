import { NextResponse } from "next/server";
import { connectDB } from "./db";
export const ok = (data: any, status = 200) => NextResponse.json(data, { status });
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
/** Wraps a route handler: DB connect + uniform error handling. */
export function route(fn: (req: Request, ctx: any) => Promise<NextResponse>) {
  return async (req: Request, ctx: any) => {
    try { await connectDB(); return await fn(req, ctx); }
    catch (e: any) {
      if (e?.name === "ZodError") return fail(e.issues?.map((i: any) => `${i.path.join(".")}: ${i.message}`).join("; ") || "Invalid input", 422);
      console.error(e);
      return fail(e?.message || "Server error", 500);
    }
  };
}
