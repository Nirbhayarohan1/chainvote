const { ethers } = require("hardhat");
const fs = require("fs");
async function main() {
  const [owner, relayer] = await ethers.getSigners();
  const v = await (await ethers.getContractFactory("Voting")).deploy(owner.address, relayer.address);
  await v.waitForDeployment();
  const address = await v.getAddress();
  fs.writeFileSync("deployment.json", JSON.stringify({ address, owner: owner.address, relayer: relayer.address, deployedAt: new Date().toISOString() }, null, 2));
  console.log("Voting deployed to", address, "\nowner  ", owner.address, "\nrelayer", relayer.address);
}
main().catch((e) => { console.error(e); process.exit(1); });
