"""Generate charts from measured data in research/results/. Run: npm run charts"""
import csv, json, os
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
R = os.path.join(os.path.dirname(__file__), "..", "research", "results")
rd = lambda f: list(csv.DictReader(open(os.path.join(R, f))))
def style(ax, t, x, y): ax.set_title(t); ax.set_xlabel(x); ax.set_ylabel(y); ax.grid(alpha=.3)
m = [r for r in rd("merkle_benchmarks.csv") if r["experiment"] == "merkle_generation"]
fig, ax = plt.subplots(figsize=(6, 4)); ax.errorbar([int(r["voters"]) for r in m], [float(r["mean_ms"]) for r in m], yerr=[float(r["std_ms"]) for r in m], marker="o", color="#4f46e5", capsize=3); style(ax, "Merkle tree generation time (off-chain)", "Voters", "Time (ms), mean ± std"); fig.tight_layout(); fig.savefig(os.path.join(R, "chart_merkle_generation.png"), dpi=150)
p = [r for r in rd("merkle_benchmarks.csv") if r["experiment"] == "merkle_proof"]
fig, ax = plt.subplots(figsize=(6, 4)); xs = [int(r["voters"]) for r in p]; ax.plot(xs, [float(r["mean_ms"]) for r in p], marker="o", label="Proof generation", color="#4f46e5"); ax.plot(xs, [float(r["verify_mean_ms"]) for r in p], marker="s", label="Proof verification", color="#10b981"); ax.legend(); style(ax, "Merkle proof timings (off-chain, per proof)", "Voters in tree", "Time (ms)"); fig.tight_layout(); fig.savefig(os.path.join(R, "chart_merkle_proofs.png"), dpi=150)
s = rd("scalability_results.csv"); xs = [int(r["voters"]) for r in s]
fig, ax = plt.subplots(1, 2, figsize=(11, 4)); ax[0].plot(xs, [float(r["total_vote_time_ms"]) / 1000 for r in s], marker="o", color="#4f46e5"); style(ax[0], "Total time for N sequential votes (in-process EVM)", "Voters", "Seconds"); ax[1].plot(xs, [float(r["mean_gas_per_vote"]) for r in s], marker="o", color="#10b981"); style(ax[1], "Mean gas per vote vs. election size", "Voters", "Gas"); fig.tight_layout(); fig.savefig(os.path.join(R, "chart_scalability.png"), dpi=150)
t = [r for r in rd("transaction_benchmarks.csv") if r["status"] == "success"]
fig, ax = plt.subplots(figsize=(6, 4)); ax.hist([int(r["gas_used"]) for r in t], bins=15, color="#6366f1"); style(ax, "Gas used per vote (100-voter election)", "Gas", "Transactions"); fig.tight_layout(); fig.savefig(os.path.join(R, "chart_gas_distribution.png"), dpi=150)
e = json.load(open(os.path.join(R, "election_summary.json")))["endToEnd"]
fig, ax = plt.subplots(figsize=(7, 4)); keys = ["registration_commitments_ms", "merkle_build_and_publish_ms", "eligibility_verification_ms", "voting_ms", "close_election_ms", "result_calculation_ms"]; bottom = [0] * len(e)
for k, c in zip(keys, ["#818cf8", "#4f46e5", "#34d399", "#10b981", "#f59e0b", "#94a3b8"]): v = [r[k] for r in e]; ax.bar([str(r["voters"]) for r in e], v, bottom=bottom, label=k.replace("_ms", "").replace("_", " "), color=c); bottom = [a + b for a, b in zip(bottom, v)]
ax.legend(fontsize=7); style(ax, "End-to-end election time breakdown", "Voters", "Time (ms)"); fig.tight_layout(); fig.savefig(os.path.join(R, "chart_end_to_end.png"), dpi=150)
print("charts written to", R)
