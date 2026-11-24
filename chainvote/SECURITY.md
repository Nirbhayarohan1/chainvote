# Security notes (MVP)
**Trust assumptions.** The backend/relayer is trusted: it holds the owner and relayer keys, knows each voter's salt/nullifier, sees every vote, and can refuse to relay. Admin is trusted to publish an honest voter list.

**Provided.** Eligibility by Merkle membership; one vote per voter per election (nullifier, enforced on-chain); only the relayer can cast; owner-only administration; results hidden until close; no raw identifiers on-chain; bcrypt-hashed passwords; signed expiring JWTs; input validation.

**Not provided.** Ballot secrecy (candidate is public), coercion/receipt-freeness, voter anonymity against the server, verifiable tallying by voters, DoS protection, rate limiting, CSRF protection beyond SameSite=Lax, real identity proofing. The OTP is a fixed mock (`123456`).

**Secrets.** `.env.example` contains Hardhat's public test keys (accounts #0/#1) for local use only. Never reuse them on any real network. `.env` is git-ignored. Keys are only read server-side.

**Contract.** Custom errors, OpenZeppelin `Ownable` + `MerkleProof`, no external calls, no ETH handling. Not audited.
