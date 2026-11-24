import { route, ok } from "@/lib/server/api";
import { verifyTx } from "@/lib/server/services";
export const GET = route(async (_req, { params }) => ok(await verifyTx(params.txHash)));
export const dynamic = "force-dynamic";
