"use client";
import { Suspense, useEffect, useState } from "react"; import { useSearchParams } from "next/navigation";
import { Shell, Err, Stat } from "@/components/ui"; import { api } from "@/lib/client";
const Row = ({ k, v, h }: { k: string; v: any; h?: boolean }) => <div><div className="label">{k}</div><div className={h ? "hash" : "text-sm"}>{String(v)}</div></div>;
function Inner() {
  const q = useSearchParams(); const [tx, setTx] = useState(q.get("tx") || ""); const [r, setR] = useState<any>(null); const [err, setErr] = useState(""); const [eid, setEid] = useState(q.get("election") || "1"); const [rep, setRep] = useState<any>(null);
  const check = async (h = tx) => { setErr(""); setR(null); try { setR(await api(`/api/verify/${h.trim()}`)); } catch (e: any) { setErr(e.message); } };
  const loadRep = async () => { setErr(""); try { setRep(await api(`/api/audit/${eid}`)); } catch (e: any) { setErr(e.message); } };
  useEffect(() => { if (q.get("tx")) check(q.get("tx")!); if (q.get("election")) loadRep(); }, []);
  return (<Shell title="Audit & verification" sub="Public checks against the actual chain."><Err msg={err} />
    <div className="card space-y-3"><h3 className="text-lg text-white">Verify a transaction</h3><div className="flex gap-2"><input className="input font-mono" placeholder="0x… transaction hash" value={tx} onChange={(e) => setTx(e.target.value)} /><button className="btn btn-primary" onClick={() => check()}>Verify</button></div>
      {r && (r.found ? <div className="grid gap-3 md:grid-cols-2"><Row k="Status" v={r.status} /><Row k="Block" v={r.blockNumber} /><Row k="Timestamp" v={r.timestamp} /><Row k="Gas used" v={r.gasUsed} /><Row k="Vote event found" v={r.voteEventFound ? "yes" : "no"} />{r.vote && <><Row k="Candidate (transparent MVP)" v={`${r.vote.candidateId} — ${r.vote.candidateName}`} /><Row k="Nullifier" v={r.vote.nullifier} h /><Row k="Nullifier marked used" v={r.nullifierUsed ? "yes" : "no"} /><Row k="Election Merkle root" v={r.merkleRoot} h /></>}</div> : <p className="text-amber-400">Transaction not found on this chain.</p>)}</div>
    <div className="card mt-5 space-y-3"><h3 className="text-lg text-white">Election audit report</h3><div className="flex gap-2"><input className="input w-32" value={eid} onChange={(e) => setEid(e.target.value)} /><button className="btn btn-ghost" onClick={loadRep}>Load</button>{rep && <button className="btn btn-green" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(rep, null, 2)], { type: "application/json" })); a.download = `audit-${eid}.json`; a.click(); }}>Download JSON</button>}</div>
      {rep && <><div className="grid gap-4 md:grid-cols-4"><Stat label="Registered" value={rep.totalRegisteredVoters} /><Stat label="Votes" value={rep.totalVotes} /><Stat label="Duplicates rejected" value={rep.rejectedDuplicateAttempts} /><Stat label="Other rejections" value={rep.otherRejectedAttempts} /></div><Row k="Merkle root" v={rep.election.merkleRoot} h /></>}</div></Shell>);
}
export default function Audit() { return <Suspense><Inner /></Suspense>; }
