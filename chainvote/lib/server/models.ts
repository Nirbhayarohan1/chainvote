import mongoose, { Schema, models, model } from "mongoose";

const Voter = new Schema({
  voterId: { type: String, unique: true, required: true },
  name: String,
  phone: { type: String, required: true },
  passwordHash: { type: String, required: true },
  verified: { type: Boolean, default: false }, // OTP verified
  synthetic: { type: Boolean, default: true },
}, { timestamps: true });

const Election = new Schema({
  chainId: { type: Number, unique: true, required: true }, // electionId on the contract
  name: String,
  description: String,
  status: { type: String, enum: ["created", "active", "closed"], default: "created" },
  candidates: [{ cid: Number, name: String }],
  merkleRoot: String,
  eligibleCount: { type: Number, default: 0 },
  txHashes: { type: Object, default: {} }, // admin tx hashes: create/root/start/close
}, { timestamps: true });

// Election-specific eligibility: salted commitment per (election, voter). Salt never leaves the server.
const Eligibility = new Schema({
  chainId: { type: Number, index: true },
  voterId: String,
  salt: String,
  commitment: String,
  hasVoted: { type: Boolean, default: false },
});
Eligibility.index({ chainId: 1, voterId: 1 }, { unique: true });

const VoteRecord = new Schema({
  chainId: Number,
  voterId: String,
  candidateId: Number,
  nullifier: String,
  txHash: String,
  blockNumber: Number,
  gasUsed: String,
  submitMs: Number,
  confirmMs: Number,
}, { timestamps: true });
VoteRecord.index({ chainId: 1, voterId: 1 }, { unique: true });

const AuditLog = new Schema({
  chainId: Number,
  voterId: String,
  type: String, // vote_ok | duplicate_rejected | invalid_proof | tx_failed | admin_action
  detail: String,
}, { timestamps: true });

export const VoterModel: mongoose.Model<any> = (models.Voter as mongoose.Model<any>) || model("Voter", Voter);
export const ElectionModel: mongoose.Model<any> = (models.Election as mongoose.Model<any>) || model("Election", Election);
export const EligibilityModel: mongoose.Model<any> = (models.Eligibility as mongoose.Model<any>) || model("Eligibility", Eligibility);
export const VoteRecordModel: mongoose.Model<any> = (models.VoteRecord as mongoose.Model<any>) || model("VoteRecord", VoteRecord);
export const AuditLogModel: mongoose.Model<any> = (models.AuditLog as mongoose.Model<any>) || model("AuditLog", AuditLog);
