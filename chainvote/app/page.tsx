import Link from "next/link";
import { Shell } from "@/components/ui";
import { Fingerprint, GitBranch, Fuel, SearchCheck } from "lucide-react";
const F = [[Fingerprint, "Merkle-gated eligibility", "Only voters in the published Merkle root can vote. No raw IDs go on-chain."], [GitBranch, "One voter, one vote", "Election-specific nullifiers are enforced by the contract itself."], [Fuel, "Gasless for voters", "A server-side relayer submits and pays for the transaction."], [SearchCheck, "Publicly verifiable", "Check any transaction hash on the audit page."]] as const;
export default function Home() {
  return (<Shell><section className="grid gap-10 py-10 md:grid-cols-2 md:items-center"><div>
    <p className="mb-3 text-sm uppercase tracking-widest text-emerald-400">B.Tech major project · MVP</p>
    <h1 className="text-5xl leading-tight text-white">Every ballot is a transaction you can check.</h1>
    <p className="mt-5 max-w-md text-slate-400">ChainVote is a local demonstration of Merkle-proof eligibility, nullifier-based double-vote prevention and relayer-paid votes on a Hardhat chain.</p>
    <div className="mt-8 flex gap-3"><Link href="/register" className="btn btn-primary">Register as voter</Link><Link href="/login" className="btn btn-ghost">Voter login</Link><Link href="/admin" className="btn btn-ghost">Admin</Link></div></div>
    <div className="grid grid-cols-2 gap-4">{F.map(([I, t, d]) => <div key={t} className="card"><I className="mb-3 h-5 w-5 text-indigo-400" /><h3 className="text-white">{t}</h3><p className="mt-1 text-sm text-slate-400">{d}</p></div>)}</div></section>
    <p className="mt-6 text-xs text-slate-500">Baseline MVP: votes are recorded transparently on-chain. It does not provide ballot secrecy or coercion resistance. Synthetic voter data only.</p></Shell>);
}
