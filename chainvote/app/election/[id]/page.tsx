"use client";
import { useEffect, useState } from "react"; import Link from "next/link"; import { useParams } from "next/navigation";
import { Shell, Badge, Err, Okay } from "@/components/ui"; import { api, short } from "@/lib/client";
export default function Election() {
  const { id } = useParams<{ id: string }>(); const [e, setE] = useState<any>(null); const [sel, setSel] = useState<number | null>(null); const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [tx, setTx] = useState<any>(null);
  const load = () => api(`/api/elections/${id}`).then(setE).catch((x) => setErr(x.message)); useEffect(() => { load(); }, [id]);
  const vote = async () => { setBusy(true); setErr(""); try { setTx(await api(`/api/elections/${id}/vote`, { body: { candidateId: sel } })); load(); } catch (x: any) { setErr(x.message); } setBusy(false); setConfirm(false); };
  if (!e) return <Shell><Err msg={err} /></Shell>;
  const can = e.status === "active" && e.me?.eligible && !e.me?.hasVoted && !tx;
  return (<Shell title={e.name} sub={e.description}><div className="mb-4 flex items-center gap-3"><Badge status={e.status} /><span className="text-sm text-slate-400">Merkle root: <span className="hash">{short(e.merkleRoot)}</span></span></div>
    {e.me && !e.me.eligible && <Err msg="You are not in this election's eligibility tree." />}
    {tx && <div className="card mb-5 border-emerald-500/30"><h3 className="text-lg text-emerald-400">Vote confirmed on-chain</h3><p className="mt-2 text-sm">Transaction hash</p><p className="hash">{tx.txHash}</p><p className="mt-2 text-sm text-slate-400">Block {tx.blockNumber} · gas {tx.gasUsed}</p><div className="mt-3 flex gap-2"><Link className="btn btn-green" href={`/receipt/${id}`}>View receipt</Link><Link className="btn btn-ghost" href={`/audit?tx=${tx.txHash}`}>Verify</Link></div></div>}
    {e.me?.hasVoted && !tx && <Okay msg="You have already voted in this election." />}
    <div className="grid gap-3 md:grid-cols-2">{e.candidates.map((c: any) => (<button key={c.cid} disabled={!can} onClick={() => setSel(c.cid)} className={`card text-left transition ${sel === c.cid ? "border-indigo-400 bg-indigo-500/10" : "hover:border-white/25"} disabled:cursor-default`}><div className="text-xs text-slate-400">Candidate {c.cid}</div><div className="text-lg text-white">{c.name}</div></button>))}</div>
    {can && <div className="mt-5"><button disabled={sel == null} onClick={() => setConfirm(true)} className="btn btn-primary">Review & submit vote</button></div>}
    {confirm && <div className="fixed inset-0 z-10 grid place-items-center bg-black/60"><div className="card max-w-sm"><h3 className="text-xl text-white">Confirm your vote</h3><p className="mt-2 text-slate-300">Voting for <b>{e.candidates.find((c: any) => c.cid === sel)?.name}</b>. This is final and recorded transparently on-chain.</p><div className="mt-4 flex gap-2"><button disabled={busy} onClick={vote} className="btn btn-green">{busy ? "Submitting…" : "Confirm"}</button><button onClick={() => setConfirm(false)} className="btn btn-ghost">Cancel</button></div></div></div>}
    <Err msg={err} />
    {e.me?.hasVoted && <div className="mt-5"><p className="mb-2 text-sm text-slate-400">Demo: try a duplicate vote to see the contract reject it.</p><button disabled={busy} onClick={async () => { setBusy(true); setErr(""); try { await api(`/api/elections/${id}/vote`, { body: { candidateId: 1 } }); } catch (x: any) { setErr(x.message); } setBusy(false); }} className="btn btn-danger">Attempt duplicate vote</button></div>}
    {e.status === "closed" && <Link className="btn btn-ghost mt-5" href={`/results/${id}`}>View results</Link>}</Shell>);
}
