# Architecture
**Contract (`contracts/Voting.sol`)** — one contract, many elections. Owner (admin server key) creates elections/candidates, sets the Merkle root, starts/closes. Only the configured **relayer** may call `castVote(electionId, candidateId, nullifier, commitment, proof)`. Checks: election active → Merkle proof for leaf `keccak256(abi.encode(commitment))` → nullifier unused for that election → candidate valid. Then it stores the nullifier, increments the tally, emits `VoteCast(electionId, candidateId, nullifier)`. `getResults` reverts unless the election is closed.

**Eligibility** — for each verified voter and election the server creates a random 32-byte salt and `commitment = keccak256(abi.encode(electionId, voterId, salt))`. Leaves are `keccak256(commitment)`; the tree uses sorted-pair hashing (OpenZeppelin-compatible). Raw voter IDs/phones never go on-chain. The nullifier is `keccak256("nullifier", electionId, salt)`, so it is election-specific and unlinkable to the commitment by outsiders (the server can link them).

**Backend (`app/api`, `lib/server`)** — JWT (httpOnly cookie or Bearer), role guards, Zod validation. `castVoteViaRelayer` dry-runs with `staticCall` so the contract itself reports duplicates/invalid proofs without spending gas, then submits and records receipt, gas and timings in MongoDB. Results/audit read from the chain.

**Shared core (`lib/core/merkle.js`)** — used by the app, tests and benchmarks so they cannot diverge.

**Data (MongoDB)** — voters, elections, eligibility (salts), vote records, audit log.
