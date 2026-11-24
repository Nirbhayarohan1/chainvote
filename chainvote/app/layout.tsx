import "./globals.css";
export const metadata = { title: "ChainVote — Blockchain E-Voting MVP", description: "Merkle-gated, gasless, auditable voting demo" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
