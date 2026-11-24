import { ethers } from "ethers";
import bcrypt from "bcryptjs";
import * as M from "../core/merkle";
import { ElectionModel, EligibilityModel, VoterModel, VoteRecordModel, AuditLogModel } from "./models";
import { ownerContract, relayerContract, readContract, revertReason } from "./chain";

export const STATUS = ["created", "active", "closed"] as const;

/* ------------------------------ voters ------------------------------ */
export async function nextVoterId() {
  const n = await VoterModel.countDocuments();
  let i = n + 1, id: string;
  do { id = `VTR-${String(i++).padStart(5, "0")}`; } while (await VoterModel.exists({ voterId: id }));
  return id;
}
export async function createVoter(name: string, phone: string, password: string, verified = false) {
  const voterId = await nextVoterId();
  const passwordHash = await bcrypt.hash(password, 8);
  return VoterModel.create({ voterId, name, phone, passwordHash, verified, synthetic: true });
}

/* ----------------------------- elections ---------------------------- */
export async function createElection(name: string, description: string, candidates: string[]) {
  const c = ownerContract();
  const tx = await c.createElection(name);
  const rc = await tx.wait();
  const ev = rc.logs.map((l: any) => { try { return c.interface.parseLog(l); } catch { return null; } }).find((e: any) => e?.name === "ElectionCreated");
  const chainId = Number(ev.args.electionId);
  const cands: { cid: number; name: string }[] = [];
  for (const nm of candidates) cands.push(await addCandidate(chainId, nm, false));
  return ElectionModel.create({ chainId, name, description, candidates: cands, txHashes: { create: tx.hash } });
}
export async function addCandidate(chainId: number, name: string, persist = true) {
  const c = ownerContract();
  const rc = await (await c.addCandidate(chainId, name)).wait();
  const ev = rc.logs.map((l: any) => { try { return c.interface.parseLog(l); } catch { return null; } }).find((e: any) => e?.name === "CandidateAdded");
  const cand = { cid: Number(ev.args.candidateId), name };
  if (persist) await ElectionModel.updateOne({ chainId }, { $push: { candidates: cand } });
  return cand;
}
export async function renameCandidate(chainId: number, cid: number, name: string) {
  await (await ownerContract().renameCandidate(chainId, cid, name)).wait();
  await ElectionModel.updateOne({ chainId, "candidates.cid": cid }, { $set: { "candidates.$.name": name } });
}

/** Creates salted election-specific commitments for every OTP-verified voter and publishes the root on-chain. */
export async function generateMerkle(chainId: number) {
  const el = await ElectionModel.findOne({ chainId });
  if (!el) throw new Error("Election not found");
  if (el.status !== "created") throw new Error("Merkle root can only be set before the election starts");
  const voters = await VoterModel.find({ verified: true }).sort({ voterId: 1 });
  if (!voters.length) throw new Error("No verified voters registered");
  await EligibilityModel.deleteMany({ chainId });
  const rows = voters.map((v: any) => { const salt = M.randomSalt(); return { chainId, voterId: v.voterId, salt, commitment: M.commitment(chainId, v.voterId, salt) }; });
  await EligibilityModel.insertMany(rows);
  const t0 = performance.now();
  const tree = M.buildTree(rows.map((r) => r.commitment));
  const buildMs = performance.now() - t0;
  const root = M.rootOf(tree);
  const tx = await ownerContract().setMerkleRoot(chainId, root);
  await tx.wait();
  await ElectionModel.updateOne({ chainId }, { merkleRoot: root, eligibleCount: rows.length, "txHashes.root": tx.hash });
  return { root, eligible: rows.length, buildMs, txHash: tx.hash };
}
export async function setStatus(chainId: number, action: "start" | "end") {
  const c = ownerContract();
  const tx = action === "start" ? await c.startElection(chainId) : await c.closeElection(chainId);
  await tx.wait();
  await ElectionModel.updateOne({ chainId }, { status: action === "start" ? "active" : "closed", [`txHashes.${action}`]: tx.hash });
  return tx.hash as string;
}

/* ------------------------------- voting ------------------------------ */
const treeCache = new Map<string, any>();
async function treeFor(chainId: number, root: string) {
  const key = `${chainId}:${root}`;
  if (!treeCache.has(key)) {
    const rows = await EligibilityModel.find({ chainId }).lean();
    treeCache.set(key, M.buildTree(rows.map((r: any) => r.commitment)));
  }
  return treeCache.get(key);
}
export async function getProofFor(chainId: number, voterId: string) {
  const el = await ElectionModel.findOne({ chainId });
  const row: any = await EligibilityModel.findOne({ chainId, voterId });
  if (!el?.merkleRoot || !row) return null;
  const tree = await treeFor(chainId, el.merkleRoot);
  return { row, proof: M.proofOf(tree, row.commitment), root: el.merkleRoot };
}

/** Gasless vote: the relayer signs & pays. Contract is the sole authority on eligibility and duplicates. */
export async function castVoteViaRelayer(chainId: number, voterId: string, candidateId: number) {
  const el: any = await ElectionModel.findOne({ chainId });
  if (!el) return { ok: false as const, status: 404, error: "Election not found" };
  if (el.status !== "active") return { ok: false as const, status: 409, error: "Election is not active" };
  const p = await getProofFor(chainId, voterId);
  if (!p) { await AuditLogModel.create({ chainId, voterId, type: "invalid_proof", detail: "Voter has no eligibility entry" }); return { ok: false as const, status: 403, error: "You are not eligible for this election" }; }
  const nullifier = M.nullifier(chainId, p.row.salt);
  const c = relayerContract();
  const args = [chainId, candidateId, nullifier, p.row.commitment, p.proof] as const;
  try { await c.castVote.staticCall(...args); } // dry-run: surfaces the contract's own rejection without spending gas
  catch (e: any) {
    const reason = revertReason(e);
    const type = reason === "NullifierAlreadyUsed" ? "duplicate_rejected" : reason === "InvalidProof" ? "invalid_proof" : "tx_failed";
    await AuditLogModel.create({ chainId, voterId, type, detail: reason });
    const status = reason === "NullifierAlreadyUsed" ? 409 : 400;
    return { ok: false as const, status, error: reason === "NullifierAlreadyUsed" ? "Duplicate vote rejected by the smart contract" : `Rejected by contract: ${reason}`, reason };
  }
  const t0 = performance.now();
  try {
    const tx = await c.castVote(...args);
    const t1 = performance.now();
    const rc = await tx.wait();
    const t2 = performance.now();
    const rec = await VoteRecordModel.create({ chainId, voterId, candidateId, nullifier, txHash: tx.hash, blockNumber: rc.blockNumber, gasUsed: rc.gasUsed.toString(), submitMs: t1 - t0, confirmMs: t2 - t0 });
    await EligibilityModel.updateOne({ chainId, voterId }, { hasVoted: true });
    await AuditLogModel.create({ chainId, voterId, type: "vote_ok", detail: tx.hash });
    return { ok: true as const, record: rec };
  } catch (e: any) {
    const reason = revertReason(e);
    await AuditLogModel.create({ chainId, voterId, type: reason === "NullifierAlreadyUsed" ? "duplicate_rejected" : "tx_failed", detail: reason });
    return { ok: false as const, status: reason === "NullifierAlreadyUsed" ? 409 : 502, error: `Transaction failed: ${reason}`, reason };
  }
}

/* ------------------------------- results ----------------------------- */
export async function resultsFor(chainId: number) {
  const el: any = await ElectionModel.findOne({ chainId }).lean();
  if (!el) throw new Error("Election not found");
  if (el.status !== "closed") return { published: false, name: el.name, status: el.status };
  const counts: bigint[] = await readContract().getResults(chainId); // from the chain, not from the DB
  const rows = el.candidates.map((c: any, i: number) => ({ cid: c.cid, name: c.name, votes: Number(counts[i]) }));
  const total = rows.reduce((s: number, r: any) => s + r.votes, 0);
  const top = Math.max(...rows.map((r: any) => r.votes));
  const winners = rows.filter((r: any) => r.votes === top && top > 0);
  const registered = await VoterModel.countDocuments();
  const txs = await VoteRecordModel.find({ chainId }).sort({ blockNumber: 1 }).lean();
  return { published: true, name: el.name, status: el.status, registered, eligible: el.eligibleCount, totalVotes: total, turnoutPct: el.eligibleCount ? +(100 * total / el.eligibleCount).toFixed(2) : 0, candidates: rows, winner: winners.length === 1 ? winners[0] : null, tie: winners.length > 1 ? winners : null, merkleRoot: el.merkleRoot, transactions: txs.map((t: any) => ({ txHash: t.txHash, blockNumber: t.blockNumber, nullifier: t.nullifier })) };
}

/* -------------------------------- audit ------------------------------ */
export async function verifyTx(txHash: string) {
  const provider = readContract().runner!.provider!;
  const rc = await provider.getTransactionReceipt(txHash);
  if (!rc) return { found: false };
  const blk = await provider.getBlock(rc.blockNumber);
  const c = readContract();
  let vote: any = null;
  for (const l of rc.logs) { try { const p = c.interface.parseLog(l); if (p?.name === "VoteCast") vote = { electionId: Number(p.args.electionId), candidateId: Number(p.args.candidateId), nullifier: p.args.nullifier }; } catch {} }
  let nullifierUsed = false, root: string | null = null, candidateName: string | null = null;
  if (vote) {
    nullifierUsed = await c.nullifierUsed(vote.electionId, vote.nullifier);
    root = (await c.getElection(vote.electionId)).merkleRoot;
    candidateName = await c.getCandidate(vote.electionId, vote.candidateId);
  }
  return { found: true, status: rc.status === 1 ? "success" : "failed", blockNumber: rc.blockNumber, timestamp: blk ? new Date(blk.timestamp * 1000).toISOString() : null, gasUsed: rc.gasUsed.toString(), voteEventFound: !!vote, vote: vote && { ...vote, candidateName }, nullifierUsed, merkleRoot: root };
}
export async function auditReport(chainId: number) {
  const el: any = await ElectionModel.findOne({ chainId }).lean();
  if (!el) throw new Error("Election not found");
  const votes = await VoteRecordModel.find({ chainId }).sort({ blockNumber: 1 }).lean();
  const dup = await AuditLogModel.countDocuments({ chainId, type: "duplicate_rejected" });
  const bad = await AuditLogModel.countDocuments({ chainId, type: { $in: ["invalid_proof", "tx_failed"] } });
  return { generatedAt: new Date().toISOString(), election: { chainId, name: el.name, description: el.description, status: el.status, candidates: el.candidates, merkleRoot: el.merkleRoot, adminTxHashes: el.txHashes }, totalRegisteredVoters: await VoterModel.countDocuments(), eligibleVoters: el.eligibleCount, totalVotes: votes.length, rejectedDuplicateAttempts: dup, otherRejectedAttempts: bad, transactionHashes: votes.map((v: any) => v.txHash), finalResults: await resultsFor(chainId), note: "Baseline MVP: votes are transparent on-chain. No ballot secrecy or coercion resistance." };
}
