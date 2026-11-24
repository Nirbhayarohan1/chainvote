import { route, ok, fail } from "@/lib/server/api";
import { getSession } from "@/lib/server/auth";
export const GET = route(async (req) => { const s = getSession(req); return s ? ok(s) : fail("Not authenticated", 401); });
export const dynamic = "force-dynamic";
