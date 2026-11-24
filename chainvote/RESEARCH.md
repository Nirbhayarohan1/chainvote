# Research data
Run `npm run benchmark && npm run charts`; outputs go to `research/results/`.

| Experiment | File | Nature |
|---|---|---|
| Registration cost (bcrypt cost 8 + commitments) | `registration_results.csv` | simulated, no DB I/O |
| 1 Merkle generation (50/100/500/1000) | `merkle_benchmarks.csv` | off-chain, mean/min/max/std over reps |
| 2 Proof gen/verify, valid success & invalid rejection | `merkle_benchmarks.csv` | off-chain + on-chain `verifyEligibility` view sample |
| 3 Per-vote gas, submit & confirm time | `transaction_benchmarks.csv` | real EVM transactions |
| 4 Double voting | `double_voting_tests.csv` | real EVM calls; expected 0 accepted |
| 5 Scalability (sequential votes) | `scalability_results.csv` | real EVM transactions |
| 6 End-to-end election | `election_summary.json` | mixed (see `note` field) |
| Summary + metadata + limitations | `benchmark_summary.json` | |

**Cite carefully.** Hardhat's in-process EVM has no network latency and instant block time, so confirmation times and throughput are upper bounds not representative of public chains. Gas is deterministic for this contract and is the most transferable figure. First measurements in a run include JIT warm-up (a small size can appear slower than a larger one). If a size cannot run on your machine, set `BENCH_SIZES` and report the limitation rather than extrapolating.
