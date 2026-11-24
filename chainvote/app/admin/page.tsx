"use client";
import { useEffect, useState } from "react"; import Link from "next/link";
import { Shell, Badge, Err, useSession } from "@/components/ui"; import { api } from "@/lib/client";
export default function Admin() {
  const s = useSession(); const [els, setEls] = useState<any[]>([]); const [err, setErr] = useState("");
  const [cred, setCred] = useState({ username: "admin", password: "" }); const [n, setN] = useState({ name: "", description: "", candidates: "" });
  const load = () => api("/api/admin/elections").then(setEls).catch((e) => setErr(e.message));
  useEffect(() => { if (s?.role === "admin") load(); }, [s]);
  if (s === undefined) return <Shell />;
  if (s?.role !== "admin") return (<Shell title="Admin login"><div className="card max-w-md space-y-4">
    <div><label className="label">Username</label><input className="input" value={cred.username} onChange={(e) => setCred({ ...cred, username: e.target.value })} /></div>
    <div><label className="label">Password</label><input className="input" type="password" value={cred.password} onChange={(e) => setCred({ ...cred, password: e.target.value })} /></div>
    <button className="btn btn-primary w-full" onClick={async () => { setErr(""); try { await api("/api/auth/admin-login", { body: cred }); location.reload(); } catch (e: any) { setErr(e.message); } }}>Log in</button><Err msg={err} /></div></Shell>);
  const create = async () => { setErr(""); try { await api("/api/admin/elections", { body: { name: n.name, description: n.description, candidates: n.candidates.split("\n").map((x) => x.trim()).filter(Boolean) } }); setN({ name: "", description: "", candidates: "" }); load(); } catch (e: any) { setErr(e.message); } };
  return (<Shell title="Admin dashboard"><div className="grid gap-6 md:grid-cols-2">
    <div className="space-y-3">{els.map((e) => <Link key={e.chainId} href={`/admin/elections/${e.chainId}`} className="card block hover:border-indigo-400/50"><div className="flex items-center justify-between"><h3 className="text-lg text-white">#{e.chainId} {e.name}</h3><Badge status={e.status} /></div><p className="mt-1 text-sm text-slate-400">{e.candidates.length} candidates · {e.eligibleCount} eligible</p></Link>)}{!els.length && <p className="text-slate-400">No elections yet.</p>}</div>
    <div className="card space-y-3"><h3 className="text-xl text-white">Create election</h3>
      <div><label className="label">Name</label><input className="input" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} /></div>
      <div><label className="label">Description</label><input className="input" value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} /></div>
      <div><label className="label">Candidates (one per line)</label><textarea rows={5} className="input" value={n.candidates} onChange={(e) => setN({ ...n, candidates: e.target.value })} /></div>
      <button onClick={create} className="btn btn-green">Create on-chain</button><Err msg={err} /></div></div></Shell>);
}
