"use client";
import { useEffect, useState } from "react"; import Link from "next/link"; import { useParams } from "next/navigation";
import { Shell, Badge, Err, Okay } from "@/components/ui"; import { api, short } from "@/lib/client";
export default function Manage() {
  const { id } = useParams<{ id: string }>(); const [e, setE] = useState<any>(null); const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false); const [name, setName] = useState("");
  const load = () => api("/api/admin/elections").then((l) => setE(l.find((x: any) => String(x.chainId) === id))).catch((x) => setErr(x.message)); useEffect(() => { load(); }, [id]);
  const act = async (fn: () => Promise<any>, ok: string) => { setBusy(true); setErr(""); setMsg(""); try { await fn(); setMsg(ok); await load(); } catch (x: any) { setErr(x.message); } setBusy(false); };
  const post = (p: string, body: any = {}, method?: string) => api(`/api/admin/elections/${id}/${p}`, { body, method });
  const report = async () => { const r = await api(`/api/admin/elections/${id}/report`); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(r, null, 2)], { type: "application/json" })); a.download = `chainvote-election-${id}-report.json`; a.click(); };
  if (!e) return <Shell><Err msg={err} /></Shell>;
  const created = e.status === "created";
  return (<Shell title={e.name} sub={e.description}><div className="mb-4 flex items-center gap-3"><Badge status={e.status} /><span className="text-sm text-slate-400">Eligible: {e.eligibleCount} · Root: <span className="hash">{e.merkleRoot ? short(e.merkleRoot) : "not set"}</span></span></div>
    <Okay msg={msg} /><Err msg={err} />
    <div className="mt-4 grid gap-5 md:grid-cols-2">
      <div className="card"><h3 className="mb-3 text-lg text-white">Candidates</h3><ul className="space-y-2">{e.candidates.map((c: any) => <li key={c.cid} className="flex items-center justify-between text-sm"><span>{c.cid}. {c.name}</span>{created && <button className="btn btn-ghost" onClick={() => { const n = prompt("Rename candidate", c.name); if (n) act(() => post("candidates", { cid: c.cid, name: n }, "PUT"), "Candidate renamed"); }}>Edit</button>}</li>)}</ul>
        {created && <div className="mt-4 flex gap-2"><input className="input" placeholder="New candidate" value={name} onChange={(x) => setName(x.target.value)} /><button disabled={!name || busy} className="btn btn-primary" onClick={() => act(async () => { await post("candidates", { name }); setName(""); }, "Candidate added")}>Add</button></div>}</div>
      <div className="card space-y-3"><h3 className="text-lg text-white">Election controls</h3>
        <button disabled={!created || busy} onClick={() => act(() => post("merkle"), "Merkle tree generated and root published on-chain")} className="btn btn-primary w-full">1. Generate Merkle tree & publish root</button>
        <button disabled={!created || !e.merkleRoot || busy} onClick={() => act(() => post("start"), "Election started")} className="btn btn-green w-full">2. Start election</button>
        <button disabled={e.status !== "active" || busy} onClick={() => confirm("End election? This cannot be undone.") && act(() => post("end"), "Election closed")} className="btn btn-danger w-full">3. End election</button>
        <div className="flex gap-2"><Link href={`/results/${id}`} className="btn btn-ghost flex-1">Results</Link><button onClick={report} className="btn btn-ghost flex-1">Download report</button><Link href={`/audit?election=${id}`} className="btn btn-ghost flex-1">Audit</Link></div></div></div></Shell>);
}
