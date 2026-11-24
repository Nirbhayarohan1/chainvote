"use client";
import { useEffect, useState } from "react"; import { useParams } from "next/navigation";
import { Shell, Err, Stat, Badge } from "@/components/ui"; import { api, short } from "@/lib/client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
export default function Results() {
  const { id } = useParams<{ id: string }>(); const [r, setR] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api(`/api/elections/${id}/results`).then(setR).catch((e) => setErr(e.message)); }, [id]);
  if (!r) return <Shell><Err msg={err} /></Shell>;
  if (!r.published) return <Shell title={r.name}><div className="card">Results are published only after the election is closed. Status: <Badge status={r.status} /></div></Shell>;
  return (<Shell title={r.name} sub="Read from the smart contract after closure.">
    <div className="grid gap-4 md:grid-cols-4"><Stat label="Registered" value={r.registered} /><Stat label="Eligible" value={r.eligible} /><Stat label="Votes cast" value={r.totalVotes} /><Stat label="Turnout" value={`${r.turnoutPct}%`} /></div>
    <div className="card mt-5 h-80"><ResponsiveContainer><BarChart data={r.candidates}><CartesianGrid stroke="#ffffff12" /><XAxis dataKey="name" stroke="#94a3b8" fontSize={12} /><YAxis allowDecimals={false} stroke="#94a3b8" /><Tooltip contentStyle={{ background: "#0b1224", border: "1px solid #ffffff20" }} /><Bar dataKey="votes" radius={[6, 6, 0, 0]}>{r.candidates.map((c: any, i: number) => <Cell key={i} fill={r.winner?.cid === c.cid ? "#34d399" : "#6366f1"} />)}</Bar></BarChart></ResponsiveContainer></div>
    <div className="card mt-5"><h3 className="text-xl text-white">{r.winner ? `Winner: ${r.winner.name}` : r.tie ? `Tie: ${r.tie.map((t: any) => t.name).join(", ")}` : "No votes cast"}</h3><p className="mt-1 text-sm text-slate-400">Merkle root <span className="hash">{r.merkleRoot}</span></p></div>
    <div className="card mt-5 overflow-x-auto"><h3 className="mb-2 text-lg text-white">Blockchain transactions ({r.transactions.length})</h3><table className="w-full text-sm"><thead><tr><th>Block</th><th>Tx hash</th><th>Nullifier</th></tr></thead><tbody>{r.transactions.map((t: any) => <tr key={t.txHash}><td>{t.blockNumber}</td><td className="hash">{short(t.txHash)}</td><td className="hash">{short(t.nullifier)}</td></tr>)}</tbody></table></div></Shell>);
}
