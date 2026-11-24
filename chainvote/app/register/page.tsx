"use client";
import { useState } from "react"; import { useRouter } from "next/navigation";
import { Shell, Err } from "@/components/ui"; import { api } from "@/lib/client";
export default function Register() {
  const r = useRouter(); const [f, setF] = useState({ name: "", phone: "", password: "" }); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => { setBusy(true); setErr(""); try { const j = await api("/api/auth/register", { body: f }); r.push(`/verify-otp?voterId=${j.voterId}`); } catch (e: any) { setErr(e.message); } setBusy(false); };
  return (<Shell title="Voter registration" sub="Synthetic demo identity — no real Aadhaar data."><div className="card max-w-md space-y-4">
    {(["name", "phone", "password"] as const).map((k) => <div key={k}><label className="label">{k === "phone" ? "Phone (10 digits)" : k}</label><input className="input" type={k === "password" ? "password" : "text"} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>)}
    <button disabled={busy} onClick={submit} className="btn btn-primary w-full">Register & send OTP</button><Err msg={err} /></div></Shell>);
}
