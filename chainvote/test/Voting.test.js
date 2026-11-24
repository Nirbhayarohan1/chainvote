const { expect } = require("chai");
const { ethers } = require("hardhat");
const M = require("../lib/core/merkle");

async function setup(n = 8) {
  const [owner, relayer, other] = await ethers.getSigners();
  const voting = await (await ethers.getContractFactory("Voting")).deploy(owner.address, relayer.address);
  await voting.createElection("Test");
  for (const c of ["A", "B", "C"]) await voting.addCandidate(1, c);
  const voters = Array.from({ length: n }, (_, i) => {
    const salt = M.randomSalt();
    return { id: `V${i}`, salt, c: M.commitment(1, `V${i}`, salt), n: M.nullifier(1, salt) };
  });
  const tree = M.buildTree(voters.map((v) => v.c));
  await voting.setMerkleRoot(1, M.rootOf(tree));
  return { voting, owner, relayer, other, voters, tree };
}

describe("Voting.sol", () => {
  it("deploys with owner and relayer", async () => {
    const { voting, owner, relayer } = await setup();
    expect(await voting.owner()).to.equal(owner.address);
    expect(await voting.relayer()).to.equal(relayer.address);
  });

  it("creates candidates", async () => {
    const { voting } = await setup();
    expect(await voting.getCandidate(1, 2)).to.equal("B");
    expect((await voting.getElection(1)).candidateCount).to.equal(3n);
  });

  it("verifies valid Merkle proof and rejects invalid one", async () => {
    const { voting, voters, tree } = await setup();
    const v = voters[3];
    expect(await voting.verifyEligibility(1, v.c, M.proofOf(tree, v.c))).to.equal(true);
    const outsider = M.commitment(1, "EVIL", M.randomSalt());
    expect(await voting.verifyEligibility(1, outsider, M.proofOf(tree, v.c))).to.equal(false);
  });

  it("accepts a valid vote and emits event without voter id", async () => {
    const { voting, relayer, voters, tree } = await setup();
    await voting.startElection(1);
    const v = voters[0];
    await expect(voting.connect(relayer).castVote(1, 2, v.n, v.c, M.proofOf(tree, v.c)))
      .to.emit(voting, "VoteCast").withArgs(1, 2, v.n);
    expect(await voting.nullifierUsed(1, v.n)).to.equal(true);
  });

  it("rejects an ineligible voter (invalid proof)", async () => {
    const { voting, relayer, voters, tree } = await setup();
    await voting.startElection(1);
    const fake = M.commitment(1, "EVIL", M.randomSalt());
    await expect(voting.connect(relayer).castVote(1, 1, M.nullifier(1, M.randomSalt()), fake, M.proofOf(tree, voters[0].c)))
      .to.be.revertedWithCustomError(voting, "InvalidProof");
  });

  it("rejects duplicate vote", async () => {
    const { voting, relayer, voters, tree } = await setup();
    await voting.startElection(1);
    const v = voters[1];
    await voting.connect(relayer).castVote(1, 1, v.n, v.c, M.proofOf(tree, v.c));
    await expect(voting.connect(relayer).castVote(1, 3, v.n, v.c, M.proofOf(tree, v.c)))
      .to.be.revertedWithCustomError(voting, "NullifierAlreadyUsed");
  });

  it("rejects invalid candidate", async () => {
    const { voting, relayer, voters, tree } = await setup();
    await voting.startElection(1);
    const v = voters[2];
    await expect(voting.connect(relayer).castVote(1, 99, v.n, v.c, M.proofOf(tree, v.c)))
      .to.be.revertedWithCustomError(voting, "InvalidCandidate");
    await expect(voting.connect(relayer).castVote(1, 0, v.n, v.c, M.proofOf(tree, v.c)))
      .to.be.revertedWithCustomError(voting, "InvalidCandidate");
  });

  it("rejects votes from non-relayer", async () => {
    const { voting, other, voters, tree } = await setup();
    await voting.startElection(1);
    const v = voters[0];
    await expect(voting.connect(other).castVote(1, 1, v.n, v.c, M.proofOf(tree, v.c)))
      .to.be.revertedWithCustomError(voting, "NotRelayer");
  });

  it("rejects voting before start and after closure", async () => {
    const { voting, relayer, voters, tree } = await setup();
    const [a, b] = voters;
    await expect(voting.connect(relayer).castVote(1, 1, a.n, a.c, M.proofOf(tree, a.c)))
      .to.be.revertedWithCustomError(voting, "WrongStatus");
    await voting.startElection(1);
    await voting.closeElection(1);
    await expect(voting.connect(relayer).castVote(1, 1, b.n, b.c, M.proofOf(tree, b.c)))
      .to.be.revertedWithCustomError(voting, "WrongStatus");
  });

  it("calculates results only after close", async () => {
    const { voting, relayer, voters, tree } = await setup();
    await voting.startElection(1);
    const picks = [1, 1, 2, 3, 1];
    for (let i = 0; i < picks.length; i++) {
      const v = voters[i];
      await voting.connect(relayer).castVote(1, picks[i], v.n, v.c, M.proofOf(tree, v.c));
    }
    await expect(voting.getResults(1)).to.be.revertedWithCustomError(voting, "WrongStatus");
    await voting.closeElection(1);
    expect((await voting.getResults(1)).map(Number)).to.deep.equal([3, 1, 1]);
    expect((await voting.getElection(1)).totalVotes).to.equal(5n);
  });

  it("only owner can administer; cannot start without root/candidates", async () => {
    const { voting, other } = await setup();
    await expect(voting.connect(other).startElection(1)).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount");
    await voting.createElection("Empty");
    await expect(voting.startElection(2)).to.be.revertedWithCustomError(voting, "RootNotSet");
  });
});

describe("Voting.sol candidate editing", () => {
  it("renames candidates only before activation", async () => {
    const { voting } = await setup();
    await voting.renameCandidate(1, 1, "Alpha");
    expect(await voting.getCandidate(1, 1)).to.equal("Alpha");
    await voting.startElection(1);
    await expect(voting.renameCandidate(1, 1, "X")).to.be.revertedWithCustomError(voting, "WrongStatus");
  });
});
