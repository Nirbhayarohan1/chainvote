"use client";
import { useEffect, useState } from "react"; import Link from "next/link"; import { useParams } from "next/navigation";
import { Shell, Err } from "@/components/ui"; import { api } from "@/lib/client";
export default function Receipt() {
  const { id } = useParams<{ id: string }>(); const [r, setR] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api(`/api/elections/${id}/receipt`).then(setR).catch((e) => setErr(e.message)); }, [id]);
  return (<Shell title="Voting receipt"><Err msg={err} />{r && <div className="card max-w-2xl space-y-3">
    {[["Transaction hash", r.txHash], ["Block number", r.blockNumber], ["Gas used", r.gasUsed], ["Nullifier", r.nullifier], ["Recorded at", new Date(r.at).toLocaleString()]].map(([k, v]) => <div key={k as string}><div className="label">{k}</div><div className="hash">{String(v)}</div></div>)}
    <Link href={`/audit?tx=${r.txHash}`} className="btn btn-green">Verify this transaction</Link></div>}</Shell>);
}
