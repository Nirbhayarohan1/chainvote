import { NextResponse } from "next/server";
export async function POST() { const r = NextResponse.json({ ok: true }); r.cookies.set("cv_token", "", { path: "/", maxAge: 0 }); return r; }
export const dynamic = "force-dynamic";
