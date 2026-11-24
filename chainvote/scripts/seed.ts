import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../lib/server/db";
import { VoterModel, ElectionModel, EligibilityModel, VoteRecordModel, AuditLogModel } from "../lib/server/models";
import { createVoter, createElection, generateMerkle } from "../lib/server/services";

async function main() {
  await connectDB();
  await Promise.all([VoterModel, ElectionModel, EligibilityModel, VoteRecordModel, AuditLogModel].map((m: any) => m.deleteMany({})));
  console.log("Cleared collections.");
  for (let i = 1; i <= 50; i++) await createVoter(`Synthetic Voter ${i}`, String(9000000000 + i), "voter123", true);
  console.log("Created 50 synthetic voters VTR-00001 .. VTR-00050 (password: voter123)");
  const el: any = await createElection("Student Council Election 2026", "Demonstration election (synthetic data)", ["Aarav Sharma", "Diya Patel", "Kabir Singh", "Meera Nair", "Rohan Verma"]);
  console.log(`Created election #${el.chainId} with 5 candidates on-chain`);
  const m = await generateMerkle(el.chainId);
  console.log(`Merkle root ${m.root} published (${m.eligible} eligible voters, tx ${m.txHash})`);
  console.log("Admin credentials come from .env (default admin / Admin@12345). Election is NOT started - start it from the admin dashboard.");
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
