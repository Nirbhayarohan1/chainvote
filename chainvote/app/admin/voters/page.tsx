"use client";
import { useEffect, useState } from "react";
import { Shell, Err, Okay, useSession } from "@/components/ui"; import { api } from "@/lib/client";
export default function Voters() {
  const s = useSession(); const [v, setV] = useState<any[]>([]); const [count, setCount] = useState(10); const [csv, setCsv] = useState(""); const [err, setErr] = useState(""); const [msg, setMsg] = useState("");
  const load = () => api("/api/admin/voters").then(setV).catch((e) => setErr(e.message)); useEffect(() => { if (s?.role === "admin") load(); }, [s]);
  const add = async (body: any) => { setErr(""); setMsg(""); try { const r = await api("/api/admin/voters", { body }); setMsg(`Registered ${r.created} voters`); load(); } catch (e: any) { setErr(e.message); } };
  return (<Shell title="Voter management" sub="Voters added here are pre-verified. Generate the Merkle tree afterwards to include them."><Okay msg={msg} /><Err msg={err} />
    <div className="grid gap-5 md:grid-cols-2"><div className="card space-y-3"><h3 className="text-lg text-white">Add synthetic voters</h3><input type="number" className="input" value={count} onChange={(e) => setCount(+e.target.value)} /><button className="btn btn-primary" onClick={() => add({ count })}>Generate</button></div>
      <div className="card space-y-3"><h3 className="text-lg text-white">Import CSV (name,phone[,password])</h3><textarea rows={3} className="input" value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={"Asha Rao,9876543210"} /><div className="flex gap-2"><input type="file" accept=".csv" className="text-xs" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); }} /><button className="btn btn-primary" onClick={() => add({ csv })}>Import</button></div></div></div>
    <div className="card mt-5 max-h-96 overflow-auto"><table className="w-full text-sm"><thead><tr><th>Voter ID</th><th>Name</th><th>Phone</th><th>OTP verified</th></tr></thead><tbody>{v.map((x) => <tr key={x.voterId}><td className="font-mono">{x.voterId}</td><td>{x.name}</td><td>{x.phone}</td><td>{x.verified ? "yes" : "no"}</td></tr>)}</tbody></table></div></Shell>);
}
