import { z } from "zod";
import { route, ok } from "@/lib/server/api";
import { createVoter } from "@/lib/server/services";
const S = z.object({ name: z.string().min(2).max(60), phone: z.string().regex(/^\d{10}$/, "10-digit phone required"), password: z.string().min(6) });
export const POST = route(async (req) => {
  const b = S.parse(await req.json());
  const v: any = await createVoter(b.name, b.phone, b.password, false);
  return ok({ voterId: v.voterId, message: "Registered. Verify with the mock OTP (123456)." }, 201);
});
export const dynamic = "force-dynamic";
