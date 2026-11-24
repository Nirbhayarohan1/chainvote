// Shared Merkle / commitment helpers (CommonJS so Hardhat tests, scripts and Next.js can all use it).
const { ethers } = require("ethers");
const { MerkleTree } = require("merkletreejs");

const coder = ethers.AbiCoder.defaultAbiCoder();
const keccakBuf = (b) => Buffer.from(ethers.getBytes(ethers.keccak256(b)));

/** Election-specific salted commitment. voterId is never put on-chain. */
function commitment(electionId, voterId, salt) {
  return ethers.keccak256(coder.encode(["uint256", "string", "bytes32"], [electionId, voterId, salt]));
}

/** Election-specific nullifier derived from the voter's secret salt (not from the commitment). */
function nullifier(electionId, salt) {
  return ethers.keccak256(coder.encode(["string", "uint256", "bytes32"], ["nullifier", electionId, salt]));
}

/** Leaf matches Voting.sol: keccak256(abi.encode(bytes32 commitment)) == keccak256(commitment). */
const leafOf = (c) => ethers.keccak256(c);

function buildTree(commitments) {
  const leaves = commitments.map((c) => Buffer.from(ethers.getBytes(leafOf(c))));
  const tree = new MerkleTree(leaves, keccakBuf, { sortPairs: true });
  return tree;
}

const rootOf = (tree) => tree.getHexRoot();
const proofOf = (tree, c) => tree.getHexProof(Buffer.from(ethers.getBytes(leafOf(c))));
function verifyProof(root, c, proof) {
  return MerkleTree.verify(proof, Buffer.from(ethers.getBytes(leafOf(c))), root, keccakBuf, { sortPairs: true });
}
const randomSalt = () => ethers.hexlify(ethers.randomBytes(32));

module.exports = { commitment, nullifier, buildTree, rootOf, proofOf, verifyProof, randomSalt, leafOf };
