"use client";
import { Suspense, useState } from "react"; import { useRouter, useSearchParams } from "next/navigation";
import { Shell, Err } from "@/components/ui"; import { api } from "@/lib/client";
function Inner() {
  const r = useRouter(); const q = useSearchParams(); const [voterId, setV] = useState(q.get("voterId") || ""); const [otp, setOtp] = useState(""); const [err, setErr] = useState("");
  const go = async () => { setErr(""); try { await api("/api/auth/verify-otp", { body: { voterId, otp } }); r.push("/login?verified=1"); } catch (e: any) { setErr(e.message); } };
  return (<Shell title="Verify your phone" sub="Demo mode: the OTP is fixed at 123456."><div className="card max-w-md space-y-4">
    <div><label className="label">Voter ID</label><input className="input" value={voterId} onChange={(e) => setV(e.target.value)} /></div>
    <div><label className="label">OTP</label><input className="input" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" /></div>
    <button onClick={go} className="btn btn-green w-full">Verify</button><Err msg={err} /></div></Shell>);
}
export default function Page() { return <Suspense><Inner /></Suspense>; }
