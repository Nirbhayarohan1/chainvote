"use client";
import { useState } from "react"; import { useRouter } from "next/navigation"; import Link from "next/link";
import { Shell, Err } from "@/components/ui"; import { api } from "@/lib/client";
export default function Login() {
  const r = useRouter(); const [voterId, setV] = useState(""); const [password, setP] = useState(""); const [err, setErr] = useState("");
  const go = async () => { setErr(""); try { await api("/api/auth/login", { body: { voterId, password } }); r.push("/dashboard"); } catch (e: any) { setErr(e.message); } };
  return (<Shell title="Voter login"><div className="card max-w-md space-y-4">
    <div><label className="label">Voter ID</label><input className="input" value={voterId} onChange={(e) => setV(e.target.value)} placeholder="VTR-00001" /></div>
    <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={(e) => setP(e.target.value)} /></div>
    <button onClick={go} className="btn btn-primary w-full">Log in</button><Err msg={err} />
    <p className="text-sm text-slate-400">New here? <Link className="text-indigo-400" href="/register">Register</Link></p></div></Shell>);
}
