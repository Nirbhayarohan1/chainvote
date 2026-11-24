# ChainVote — Blockchain-Based Electronic Voting System (MVP)

Local, reproducible demo: Merkle-proof voter eligibility, election-specific nullifiers, gasless voting through a backend relayer, results read from chain, public audit page, automated tests and research benchmarks.

> **Baseline limitation:** votes are recorded **transparently** on-chain (candidate visible beside a nullifier). There is **no ballot secrecy and no coercion resistance**. Merkle proofs prove membership, not anonymity. Synthetic voter data only — no real Aadhaar/ID data.

## Stack
Next.js 14 (App Router) · React · TypeScript · Tailwind · Recharts · Lucide · Mongoose/MongoDB · Solidity 0.8.24 · Hardhat · OpenZeppelin 5 · ethers v6 · merkletreejs · bcryptjs · Zod · dotenv.
(shadcn/ui is **not** used: the UI uses plain Tailwind components. `bcryptjs` replaces native `bcrypt` to avoid build issues.)

## Architecture
```
Voter/Admin → Next.js UI → API routes (auth · eligibility · voting · relayer · results · audit)
            → MongoDB (voters, elections, salted commitments, vote receipts, audit log)
            → Relayer wallet → Voting.sol → Hardhat local chain
```
See `ARCHITECTURE.md`, `SECURITY.md`, `RESEARCH.md`.

## Install
```bash
npm install --legacy-peer-deps
cp .env.example .env        # defaults work for local demo
```
Requires Node 20+ and a running MongoDB (`mongodb://127.0.0.1:27017`). Install: https://www.mongodb.com/docs/manual/installation/ or `docker run -p 27017:27017 mongo:7`.

### Compiler note
`hardhat.config.js` compiles with the npm `solc` package (solc-js) so it works without downloading compilers. It is slower than native solc but needs no network after `npm install`.

## Demo workflow (4 terminals)
```bash
npm run node        # 1. local blockchain (keep running)
npm run deploy      # 2. deploy Voting.sol  → writes deployment.json
npm run seed        # 3. 50 synthetic voters + 5 candidates + election #1 + Merkle root on-chain
npm run dev         # 4. http://localhost:3000
```
Re-running `deploy` after restarting the node requires re-running `seed`.

1. Go to **/admin**, log in (`admin` / `Admin@12345`), open the election, click **Start election** (Merkle root already published by the seed; the button flow is *Generate tree → Start → End*).
2. Voter portal: **/login** with `VTR-00001` / `voter123` (seeded voters are pre-verified), or **/register** a new voter (OTP **123456**). Newly registered voters are only eligible if admin regenerates the Merkle tree *before* starting.
3. Open the election, pick a candidate, confirm → transaction hash and receipt.
4. Click **Attempt duplicate vote** → rejected by the contract.
5. Admin → **End election** → **/results/1** (read from chain). **/audit** verifies any tx hash; admin can download the audit report JSON.

## Credentials
| Role | Login |
|---|---|
| Admin | `admin` / `Admin@12345` (change in `.env`) |
| Voters | `VTR-00001`…`VTR-00050` / `voter123` |
| Mock OTP | `123456` |

## Tests
```bash
npm test          # Hardhat: Voting.sol (deploy, candidates, proofs, votes, duplicates, closure, results) + relayer
npm run test:api  # node:test: JWT/session/role authorisation
```
Not covered by automated tests: MongoDB-backed API flows and the UI (see Known limitations).

## Benchmarks / research data
```bash
npm run benchmark   # real txs on Hardhat's in-process EVM → research/results/*.csv|json
npm run charts      # PNG charts from the measured files (needs python3 + matplotlib)
```
Env: `BENCH_SIZES=50,100,500,1000`, `BENCH_REPS=10`. Output files: `registration_results.csv`, `merkle_benchmarks.csv`, `transaction_benchmarks.csv`, `scalability_results.csv`, `double_voting_tests.csv`, `election_summary.json`, `benchmark_summary.json`. Each has timestamp, hardware, software versions, config and a `kind` column (`real_evm_tx`, `offchain`, `simulated_no_db`). **Re-run on your own machine and cite those numbers.**

## Implemented
Voter register/OTP/login/logout · admin login · create election · add/edit candidates (before start) · synthetic voters (generate + CSV import) · Merkle tree + root published on-chain · Merkle proof eligibility on-chain · nullifier double-vote prevention · relayer gasless vote · results (only after close, from chain) · tx verification/audit page · audit report JSON · tx monitor · seed script · benchmarks · tests · docs.

## Known limitations / not done
- **MongoDB-backed API routes and the UI were type-checked and built but not executed end-to-end** in the environment this was written in (no MongoDB available). Run the demo workflow once before presenting.
- Relayer is a trusted server (sees votes, can censor). ERC-2771 meta-transactions not implemented.
- No ballot secrecy, no coercion resistance, no ZK proofs.
- The Merkle root can only be set before start; late-registered voters need a tree regeneration before activation. Voters are all OTP-verified voters (no per-election eligibility subsets).
- Candidate edits are renames only; no deletion.
- Benchmarks are in-process EVM: no network latency, sequential txs, no HTTP/DB overhead.
- Single admin account from `.env`; no rate limiting, CSRF tokens or audit-grade logging.
