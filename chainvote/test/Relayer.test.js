// Gasless voting: the voter never holds a key or ETH; only the relayer account pays gas.
const { expect } = require("chai");
const { ethers } = require("hardhat");
const M = require("../lib/core/merkle");

describe("Relayer (gasless voting)", () => {
  async function setup() {
    const [owner, relayer] = await ethers.getSigners();
    const voting = await (await ethers.getContractFactory("Voting")).deploy(owner.address, relayer.address);
    await voting.createElection("R"); await voting.addCandidate(1, "A"); await voting.addCandidate(1, "B");
    const voters = Array.from({ length: 4 }, (_, i) => { const salt = M.randomSalt(); return { c: M.commitment(1, `V${i}`, salt), n: M.nullifier(1, salt) }; });
    const tree = M.buildTree(voters.map((v) => v.c));
    await voting.setMerkleRoot(1, M.rootOf(tree)); await voting.startElection(1);
    return { voting, relayer, voters, tree };
  }
  it("relayer submits the tx and pays the gas; returns hash and receipt", async () => {
    const { voting, relayer, voters, tree } = await setup();
    const before = await ethers.provider.getBalance(relayer.address);
    const tx = await voting.connect(relayer).castVote(1, 1, voters[0].n, voters[0].c, M.proofOf(tree, voters[0].c));
    const rc = await tx.wait();
    expect(tx.hash).to.match(/^0x[0-9a-f]{64}$/); expect(rc.status).to.equal(1);
    expect(await ethers.provider.getBalance(relayer.address)).to.be.lt(before);
  });
  it("dry-run (staticCall) surfaces the contract's duplicate rejection without spending gas", async () => {
    const { voting, relayer, voters, tree } = await setup();
    const v = voters[1]; const p = M.proofOf(tree, v.c);
    await (await voting.connect(relayer).castVote(1, 1, v.n, v.c, p)).wait();
    const bal = await ethers.provider.getBalance(relayer.address);
    await expect(voting.connect(relayer).castVote.staticCall(1, 2, v.n, v.c, p)).to.be.revertedWithCustomError(voting, "NullifierAlreadyUsed");
    expect(await ethers.provider.getBalance(relayer.address)).to.equal(bal);
  });
  it("a failed vote does not change tallies", async () => {
    const { voting, relayer, voters, tree } = await setup();
    const v = voters[2];
    await expect(voting.connect(relayer).castVote(1, 9, v.n, v.c, M.proofOf(tree, v.c))).to.be.reverted;
    expect((await voting.getElection(1)).totalVotes).to.equal(0n);
  });
});
