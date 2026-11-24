"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, ReactNode } from "react";
import { ShieldCheck, LogOut } from "lucide-react";
import { api } from "@/lib/client";

export function useSession() {
  const [s, setS] = useState<{ role: string; sub: string } | null | undefined>(undefined);
  useEffect(() => { api("/api/auth/me").then(setS).catch(() => setS(null)); }, []);
  return s;
}
export function Shell({ children, title, sub }: { children?: ReactNode; title?: string; sub?: string }) {
  const s = useSession(); const r = useRouter();
  const logout = async () => { await api("/api/auth/logout", { method: "POST", body: {} }); r.push("/"); r.refresh(); };
  const links = s?.role === "admin" ? [["/admin", "Dashboard"], ["/admin/voters", "Voters"], ["/admin/monitor", "Transactions"], ["/audit", "Audit"]] : s?.role === "voter" ? [["/dashboard", "Elections"], ["/audit", "Verify"]] : [["/audit", "Verify"], ["/login", "Voter login"], ["/admin", "Admin"]];
  return (<div className="min-h-screen"><header className="border-b border-white/10"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
    <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-white"><ShieldCheck className="h-5 w-5 text-emerald-400" /> Chain<span className="text-indigo-400">Vote</span></Link>
    <nav className="flex items-center gap-5 text-sm text-slate-300">{links.map(([h, l]) => <Link key={h} href={h} className="hover:text-white">{l}</Link>)}
      {s && <button onClick={logout} className="flex items-center gap-1 text-slate-400 hover:text-white"><LogOut className="h-4 w-4" />Logout</button>}</nav></div></header>
    <main className="mx-auto max-w-6xl px-5 py-8">{title && <div className="mb-6"><h1 className="text-3xl text-white">{title}</h1>{sub && <p className="mt-1 text-slate-400">{sub}</p>}</div>}{children}</main></div>);
}
export const Badge = ({ status }: { status: string }) => <span className={`badge ${status === "active" ? "bg-emerald-500/15 text-emerald-400" : status === "closed" ? "bg-slate-500/20 text-slate-300" : "bg-indigo-500/15 text-indigo-300"}`}>{status}</span>;
export const Err = ({ msg }: { msg?: string }) => msg ? <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{msg}</p> : null;
export const Okay = ({ msg }: { msg?: string }) => msg ? <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{msg}</p> : null;
export const Stat = ({ label, value }: { label: string; value: any }) => <div className="card"><div className="label">{label}</div><div className="text-2xl text-white">{value}</div></div>;
