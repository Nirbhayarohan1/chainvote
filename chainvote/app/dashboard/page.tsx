"use client";
import { useEffect, useState } from "react"; import Link from "next/link";
import { Shell, Badge, Err } from "@/components/ui"; import { api } from "@/lib/client";
export default function Dash() {
  const [els, setEls] = useState<any[]>([]); const [err, setErr] = useState("");
  useEffect(() => { api("/api/auth/me").then(() => api("/api/elections")).then(setEls).catch((e) => setErr(e.message)); }, []);
  return (<Shell title="Available elections"><Err msg={err} /><div className="grid gap-4 md:grid-cols-2">{els.map((e) => (<div key={e.chainId} className="card">
    <div className="flex items-center justify-between"><h3 className="text-xl text-white">{e.name}</h3><Badge status={e.status} /></div>
    <p className="mt-1 text-sm text-slate-400">{e.description}</p><p className="mt-3 text-sm">{e.candidates.length} candidates · {e.eligible ? <span className="text-emerald-400">you are eligible</span> : <span className="text-amber-400">not in the eligibility tree</span>}{e.hasVoted && " · voted"}</p>
    <div className="mt-4 flex gap-2"><Link className="btn btn-primary" href={`/election/${e.chainId}`}>{e.status === "active" && e.eligible && !e.hasVoted ? "Vote" : "Open"}</Link>{e.hasVoted && <Link className="btn btn-ghost" href={`/receipt/${e.chainId}`}>Receipt</Link>}{e.status === "closed" && <Link className="btn btn-ghost" href={`/results/${e.chainId}`}>Results</Link>}</div></div>))}
    {!els.length && !err && <p className="text-slate-400">No elections yet.</p>}</div></Shell>);
}
