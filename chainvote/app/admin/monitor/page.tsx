"use client";
import { useEffect, useState } from "react";
import { Shell, Err, Stat, useSession } from "@/components/ui"; import { api, short } from "@/lib/client";
export default function Monitor() {
  const s = useSession(); const [d, setD] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { if (s?.role !== "admin") return; const f = () => api("/api/admin/monitor").then(setD).catch((e) => setErr(e.message)); f(); const t = setInterval(f, 4000); return () => clearInterval(t); }, [s]);
  return (<Shell title="Blockchain transaction monitor" sub="Refreshes every 4 seconds."><Err msg={err} />{d && <><div className="grid gap-4 md:grid-cols-3"><Stat label="Latest block" value={d.latestBlock ?? "chain offline"} /><Stat label="Registered voters" value={d.voters} /><Stat label="Votes recorded" value={d.votes.length} /></div>
    <div className="card mt-5 overflow-x-auto"><h3 className="mb-2 text-lg text-white">Recent votes</h3><table className="w-full text-sm"><thead><tr><th>Block</th><th>Tx</th><th>Gas</th><th>Confirm (ms)</th></tr></thead><tbody>{d.votes.map((v: any) => <tr key={v.txHash}><td>{v.blockNumber}</td><td className="hash">{short(v.txHash)}</td><td>{v.gasUsed}</td><td>{Math.round(v.confirmMs)}</td></tr>)}</tbody></table></div>
    <div className="card mt-5 overflow-x-auto"><h3 className="mb-2 text-lg text-white">Activity log</h3><table className="w-full text-sm"><thead><tr><th>Time</th><th>Type</th><th>Detail</th></tr></thead><tbody>{d.log.map((l: any) => <tr key={l._id}><td>{new Date(l.createdAt).toLocaleTimeString()}</td><td className={l.type === "vote_ok" ? "text-emerald-400" : "text-amber-400"}>{l.type}</td><td className="hash">{short(l.detail)}</td></tr>)}</tbody></table></div></>}</Shell>);
}
