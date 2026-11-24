import { ethers } from "ethers";
import fs from "fs";
import path from "path";

const artifact = () => require("../../artifacts/contracts/Voting.sol/Voting.json");
export function contractAddress(): string {
  if (process.env.CONTRACT_ADDRESS) return process.env.CONTRACT_ADDRESS;
  const f = path.join(process.cwd(), "deployment.json");
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8")).address;
  throw new Error("Contract not deployed. Run `npm run deploy` (with `npm run node` running).");
}
export const provider = () => new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
/** Admin/owner-signed contract (server side only). */
// Singletons so one NonceManager serialises nonces across concurrent requests (survives Next.js hot reload via global).
const g = global as any;
export const ownerContract = () => (g._ownerC ||= new ethers.Contract(contractAddress(), artifact().abi, new ethers.NonceManager(new ethers.Wallet(process.env.OWNER_PRIVATE_KEY!, provider()))));
/** Relayer-signed contract: pays gas on behalf of voters. */
export const relayerContract = () => (g._relayerC ||= new ethers.Contract(contractAddress(), artifact().abi, new ethers.NonceManager(new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY!, provider()))));
export const readContract = () => new ethers.Contract(contractAddress(), artifact().abi, provider());
export const iface = () => new ethers.Interface(artifact().abi);

/** Decode a revert into a readable custom error name. */
export function revertReason(e: any): string {
  const data = e?.data || e?.error?.data || e?.info?.error?.data;
  try { if (data) return iface().parseError(data)?.name || "Reverted"; } catch {}
  return e?.shortMessage || e?.message || "Transaction failed";
}
