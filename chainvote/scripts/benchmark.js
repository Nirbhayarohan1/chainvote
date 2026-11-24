/* ChainVote benchmark suite. Run: npm run benchmark   (uses Hardhat's in-process EVM; no Mongo needed)
 * Every number written is measured at run time. Nothing is hardcoded or estimated.
 * Labels: "real_evm_tx"  = actual signed transactions executed by the Hardhat EVM (in-process, automine, zero network latency)
 *         "offchain"     = pure JS computation, no chain
 *         "simulated_no_db" = business logic without MongoDB I/O                                              */
const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const os = require("os");
const path = require("path");
const bcrypt = require("bcryptjs");
const M = require("../lib/core/merkle");

const OUT = path.join(__dirname, "..", "research", "results");
fs.mkdirSync(OUT, { recursive: true });
const SIZES = (process.env.BENCH_SIZES || "50,100,500,1000").split(",").map(Number);
const REPS = Number(process.env.BENCH_REPS || 10);
const now = () => performance.now();
const ver = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "node_modules", n, "package.json"), "utf8")).version;
const stats = (a) => { const n = a.length, m = a.reduce((s, x) => s + x, 0) / n; return { n, mean: m, min: Math.min(...a), max: Math.max(...a), std: Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / n) }; };
const csv = (file, rows) => { const keys = Object.keys(rows[0]); fs.writeFileSync(path.join(OUT, file), [keys.join(","), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(",").replace(/"/g, (m) => m))].join("\n") + "\n"); };
const f = (x, d = 3) => Number(x.toFixed(d));
const meta = () => ({
  timestamp: new Date().toISOString(),
  hardware: { cpu: os.cpus()[0]?.model, cores: os.cpus().length, ramGB: f(os.totalmem() / 2 ** 30, 1), platform: `${os.platform()} ${os.arch()}`, os: os.release() },
  software: { node: process.version, hardhat: ver("hardhat"), ethers: ver("ethers"), solc: ver("solc"), merkletreejs: ver("merkletreejs"), openzeppelin: ver("@openzeppelin/contracts") },
  config: { sizes: SIZES, repetitionsPerMeasurement: REPS, candidates: 5, chain: "Hardhat in-process EVM (automine, no network latency)" },
});

const mkVoters = (eid, n) => Array.from({ length: n }, (_, i) => { const salt = M.randomSalt(); const id = `VTR-${i + 1}`; return { id, salt, c: M.commitment(eid, id, salt), n: M.nullifier(eid, salt) }; });

async function freshElection(n, candidates = 5) {
  const [owner, relayer] = await ethers.getSigners();
  const voting = await (await ethers.getContractFactory("Voting")).deploy(owner.address, relayer.address);
  await voting.createElection("Bench");
  for (let i = 1; i <= candidates; i++) await voting.addCandidate(1, `C${i}`);
  const voters = mkVoters(1, n);
  const tree = M.buildTree(voters.map((v) => v.c));
  await voting.setMerkleRoot(1, M.rootOf(tree));
  await voting.startElection(1);
  return { voting, owner, relayer, voters, tree, asRelayer: voting.connect(relayer) };
}

async function castAll(ctx, voters, label) {
  const rows = []; let ok = 0, failed = 0;
  for (let i = 0; i < voters.length; i++) {
    const v = voters[i]; const proof = M.proofOf(ctx.tree, v.c);
    const t0 = now();
    try {
      const tx = await ctx.asRelayer.castVote(1, (i % 5) + 1, v.n, v.c, proof);
      const t1 = now(); const rc = await tx.wait(); const t2 = now();
      ok++; rows.push({ experiment: label, voters: voters.length, tx_index: i + 1, status: "success", gas_used: Number(rc.gasUsed), submit_ms: f(t1 - t0), confirm_ms: f(t2 - t0), proof_len: proof.length, kind: "real_evm_tx" });
    } catch (e) { failed++; rows.push({ experiment: label, voters: voters.length, tx_index: i + 1, status: "failed", gas_used: 0, submit_ms: f(now() - t0), confirm_ms: "", proof_len: proof.length, kind: "real_evm_tx" }); }
  }
  return { rows, ok, failed };
}

(async () => {
  const meta0 = meta(); const summary = { meta: meta0, experiments: {} };
  console.log("ChainVote benchmarks —", meta0.timestamp, "\nSizes:", SIZES.join(", "), " reps:", REPS);

  /* Exp 0 / registration: bcrypt hashing + commitment creation (no DB I/O) */
  const reg = [];
  for (const n of SIZES) {
    const t0 = now(); for (let i = 0; i < n; i++) await bcrypt.hash("voter123", 8); const tHash = now() - t0;
    const t1 = now(); mkVoters(1, n); const tComm = now() - t1;
    reg.push({ voters: n, bcrypt_cost: 8, password_hashing_ms: f(tHash), commitment_generation_ms: f(tComm), total_ms: f(tHash + tComm), per_voter_ms: f((tHash + tComm) / n), kind: "simulated_no_db" });
    console.log(`[registration] n=${n} total=${f(tHash + tComm, 1)}ms`);
  }
  csv("registration_results.csv", reg);

  /* Exp 1: Merkle generation */
  const merkle = [];
  for (const n of SIZES) {
    const cs = mkVoters(1, n).map((v) => v.c); const ts = [];
    for (let r = 0; r < REPS; r++) { const t0 = now(); const tr = M.buildTree(cs); M.rootOf(tr); ts.push(now() - t0); }
    const s = stats(ts);
    merkle.push({ experiment: "merkle_generation", voters: n, repetitions: s.n, mean_ms: f(s.mean), min_ms: f(s.min), max_ms: f(s.max), std_ms: f(s.std), kind: "offchain" });
    console.log(`[merkle gen] n=${n} mean=${f(s.mean)}ms`);
  }

  /* Exp 2: proof generation / verification / invalid rejection (off-chain + on-chain view) */
  const proofSummary = [];
  for (const n of SIZES) {
    const vs = mkVoters(1, n); const tree = M.buildTree(vs.map((v) => v.c)); const root = M.rootOf(tree);
    const tg = [], tv = []; let valid = 0, invalidRejected = 0, invalidTotal = 0;
    for (const v of vs) {
      let t0 = now(); const p = M.proofOf(tree, v.c); tg.push(now() - t0);
      t0 = now(); const ok = M.verifyProof(root, v.c, p); tv.push(now() - t0); if (ok) valid++;
      const fake = M.commitment(1, "EVIL-" + v.id, M.randomSalt()); invalidTotal++; if (!M.verifyProof(root, fake, p)) invalidRejected++;
    }
    const g = stats(tg), vv = stats(tv);
    const row = { experiment: "merkle_proof", voters: n, proofs: n, gen_mean_ms: f(g.mean, 4), gen_max_ms: f(g.max, 4), verify_mean_ms: f(vv.mean, 4), verify_max_ms: f(vv.max, 4), valid_success_rate_pct: f(100 * valid / n, 2), invalid_total: invalidTotal, invalid_rejected: invalidRejected, invalid_rejection_rate_pct: f(100 * invalidRejected / invalidTotal, 2), kind: "offchain" };
    merkle.push(row); proofSummary.push(row);
    console.log(`[proofs] n=${n} gen=${row.gen_mean_ms}ms verify=${row.verify_mean_ms}ms valid=${row.valid_success_rate_pct}% invalidRejected=${row.invalid_rejection_rate_pct}%`);
  }
  // on-chain verification (view call) for the largest size, sample of 100 valid + 100 invalid
  {
    const n = SIZES[SIZES.length - 1]; const ctx = await freshElection(n); let vOk = 0, iRej = 0; const S = Math.min(100, n); const tt = [];
    for (let i = 0; i < S; i++) { const v = ctx.voters[i]; const t0 = now(); if (await ctx.voting.verifyEligibility(1, v.c, M.proofOf(ctx.tree, v.c))) vOk++; tt.push(now() - t0); const fake = M.commitment(1, "EVIL" + i, M.randomSalt()); if (!(await ctx.voting.verifyEligibility(1, fake, M.proofOf(ctx.tree, v.c)))) iRej++; }
    merkle.push({ experiment: "onchain_proof_verification_view", voters: n, proofs: S, verify_mean_ms: f(stats(tt).mean), valid_success_rate_pct: f(100 * vOk / S, 2), invalid_total: S, invalid_rejected: iRej, invalid_rejection_rate_pct: f(100 * iRej / S, 2), kind: "real_evm_call" });
    console.log(`[on-chain proof view] n=${n} sample=${S} valid=${vOk}/${S} invalidRejected=${iRej}/${S}`);
  }
  csv("merkle_benchmarks.csv", merkle.map((r) => ({ experiment: r.experiment, voters: r.voters, repetitions_or_proofs: r.repetitions ?? r.proofs, mean_ms: r.mean_ms ?? r.gen_mean_ms ?? "", min_ms: r.min_ms ?? "", max_ms: r.max_ms ?? r.gen_max_ms ?? "", std_ms: r.std_ms ?? "", verify_mean_ms: r.verify_mean_ms ?? "", valid_success_rate_pct: r.valid_success_rate_pct ?? "", invalid_total: r.invalid_total ?? "", invalid_rejected: r.invalid_rejected ?? "", invalid_rejection_rate_pct: r.invalid_rejection_rate_pct ?? "", kind: r.kind })));

  /* Exp 3: transaction performance (100 votes or smallest size >=50) */
  const txN = SIZES.includes(100) ? 100 : SIZES[0];
  const txCtx = await freshElection(txN);
  const tx = await castAll(txCtx, txCtx.voters, "transaction_performance");
  const gas = stats(tx.rows.filter((r) => r.status === "success").map((r) => r.gas_used));
  const sub = stats(tx.rows.filter((r) => r.status === "success").map((r) => r.submit_ms)); const conf = stats(tx.rows.filter((r) => r.status === "success").map((r) => r.confirm_ms));
  console.log(`[tx] n=${txN} ok=${tx.ok} failed=${tx.failed} gas mean=${Math.round(gas.mean)} confirm mean=${f(conf.mean)}ms`);
  let txRows = [...tx.rows];

  /* Exp 4: double voting. Every voter who voted tries again (same + different candidate). */
  const dup = []; let attempts = 0, rejected = 0, accepted = 0; const reasons = {};
  for (let i = 0; i < txCtx.voters.length; i++) {
    const v = txCtx.voters[i]; const proof = M.proofOf(txCtx.tree, v.c);
    for (const cand of [((i % 5) + 1), ((i + 1) % 5) + 1]) {
      attempts++; const t0 = now(); let outcome = "accepted_UNEXPECTED", reason = "";
      try { const t = await txCtx.asRelayer.castVote(1, cand, v.n, v.c, proof); await t.wait(); accepted++; }
      catch (e) { rejected++; outcome = "rejected"; try { reason = txCtx.voting.interface.parseError(e.data || e.error?.data)?.name || e.shortMessage; } catch { reason = e.shortMessage || "revert"; } reasons[reason] = (reasons[reason] || 0) + 1; }
      dup.push({ voter_index: i + 1, attempt_candidate: cand, outcome, revert_reason: reason, elapsed_ms: f(now() - t0), kind: "real_evm_tx" });
    }
  }
  csv("double_voting_tests.csv", dup);
  const finalVotes = Number((await txCtx.voting.getElection(1)).totalVotes);
  console.log(`[double vote] attempts=${attempts} rejected=${rejected} unexpectedlyAccepted=${accepted} totalVotesOnChain=${finalVotes} (expected ${txN})`);
  txRows = txRows.concat([]);
  csv("transaction_benchmarks.csv", txRows);

  /* Exp 5: scalability (real sequential txs per size) + Exp 6 end-to-end */
  const scal = [], e2e = [];
  for (const n of SIZES) {
    const tTotal = now();
    const tr0 = now(); const voters = mkVoters(1, n); const tReg = now() - tr0; // commitments only (bcrypt measured separately above)
    const [owner, relayer] = await ethers.getSigners();
    const voting = await (await ethers.getContractFactory("Voting")).deploy(owner.address, relayer.address); await voting.createElection("E2E"); for (let i = 1; i <= 5; i++) await voting.addCandidate(1, `C${i}`);
    const tm0 = now(); const tree = M.buildTree(voters.map((v) => v.c)); const root = M.rootOf(tree); await (await voting.setMerkleRoot(1, root)).wait(); const tMerkle = now() - tm0;
    await (await voting.startElection(1)).wait();
    const te0 = now(); let elOk = 0; for (const v of voters) { const p = M.proofOf(tree, v.c); if (M.verifyProof(root, v.c, p)) elOk++; } const tElig = now() - te0;
    const ctx = { asRelayer: voting.connect(relayer), tree };
    const tv0 = now(); const res = await castAll(ctx, voters, `scalability_${n}`); const tVote = now() - tv0;
    const tc0 = now(); await (await voting.closeElection(1)).wait(); const tClose = now() - tc0;
    const tq0 = now(); const counts = (await voting.getResults(1)).map(Number); const tRes = now() - tq0;
    const sum = counts.reduce((a, b) => a + b, 0); const g = stats(res.rows.filter((r) => r.status === "success").map((r) => r.gas_used));
    scal.push({ voters: n, votes_attempted: n, votes_succeeded: res.ok, votes_failed: res.failed, total_vote_time_ms: f(tVote), throughput_tx_per_s: f(res.ok / (tVote / 1000)), mean_gas_per_vote: Math.round(g.mean), max_gas_per_vote: g.max, mean_confirm_ms: f(stats(res.rows.filter((r) => r.status === "success").map((r) => r.confirm_ms)).mean), tally_matches_successes: sum === res.ok, kind: "real_evm_tx_sequential" });
    e2e.push({ voters: n, registration_commitments_ms: f(tReg), merkle_build_and_publish_ms: f(tMerkle), eligibility_verification_ms: f(tElig), voting_ms: f(tVote), close_election_ms: f(tClose), result_calculation_ms: f(tRes), total_ms: f(now() - tTotal), eligible_verified: elOk, votes_on_chain: sum });
    console.log(`[scalability] n=${n} ok=${res.ok} failed=${res.failed} time=${f(tVote, 0)}ms throughput=${scal[scal.length - 1].throughput_tx_per_s} tx/s`);
  }
  csv("scalability_results.csv", scal);

  /* Summaries */
  fs.writeFileSync(path.join(OUT, "election_summary.json"), JSON.stringify({ meta: meta0, note: "End-to-end timings per election size. Registration here = commitment generation only; bcrypt hashing is in registration_results.csv. No MongoDB I/O is included.", endToEnd: e2e }, null, 2));
  const bench = { meta: meta0,
    experiments: {
      "1_merkle_generation": merkle.filter((r) => r.experiment === "merkle_generation"),
      "2_merkle_proofs": merkle.filter((r) => r.experiment !== "merkle_generation"),
      "3_transactions": { voters: txN, successful: tx.ok, failed: tx.failed, gas: { mean: Math.round(gas.mean), min: gas.min, max: gas.max }, submit_ms: { mean: f(sub.mean), min: f(sub.min), max: f(sub.max) }, confirm_ms: { mean: f(conf.mean), min: f(conf.min), max: f(conf.max) }, kind: "real_evm_tx" },
      "4_double_voting": { total_duplicate_attempts: attempts, rejected, unexpectedly_accepted: accepted, revert_reasons: reasons, votes_on_chain_after: finalVotes, expected_votes: txN },
      "5_scalability": scal, "6_end_to_end": e2e },
    limitations: ["Hardhat in-process EVM has zero network latency and instant mining; real-network confirmation times will be far higher.", "Transactions are sequential from a single relayer; concurrency/mempool behaviour is not measured.", "MongoDB and HTTP overhead are not included.", "Gas figures are for this contract on EVM cancun with optimizer runs=200."] };
  fs.writeFileSync(path.join(OUT, "benchmark_summary.json"), JSON.stringify(bench, null, 2));
  console.log("\nSaved results to research/results/");
})().catch((e) => { console.error(e); process.exit(1); });
