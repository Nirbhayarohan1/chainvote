// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title ChainVote Voting
/// @notice MVP baseline. Eligibility = Merkle membership; double voting = per-election nullifier.
/// @dev Votes are recorded TRANSPARENTLY (candidate visible next to nullifier). No ballot secrecy,
///      no coercion resistance. Votes can only be submitted by the trusted relayer (gasless model).
contract Voting is Ownable {
    enum Status { Created, Active, Closed }

    struct Election {
        string name;
        bytes32 merkleRoot;
        Status status;
        uint256 candidateCount;
        uint256 totalVotes;
        bool exists;
    }

    uint256 public electionCount;
    address public relayer;

    mapping(uint256 => Election) private elections;
    mapping(uint256 => mapping(uint256 => string)) private candidateNames;
    mapping(uint256 => mapping(uint256 => uint256)) private tallies;
    mapping(uint256 => mapping(bytes32 => bool)) public nullifierUsed;

    event ElectionCreated(uint256 indexed electionId, string name);
    event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId, string name);
    event MerkleRootSet(uint256 indexed electionId, bytes32 merkleRoot);
    event ElectionStarted(uint256 indexed electionId);
    event ElectionClosed(uint256 indexed electionId, uint256 totalVotes);
    event VoteCast(uint256 indexed electionId, uint256 indexed candidateId, bytes32 indexed nullifier);
    event RelayerChanged(address relayer);

    error NotRelayer();
    error UnknownElection();
    error WrongStatus();
    error InvalidCandidate();
    error InvalidProof();
    error NullifierAlreadyUsed();
    error RootNotSet();
    error NoCandidates();

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert NotRelayer();
        _;
    }

    modifier exists(uint256 id) {
        if (!elections[id].exists) revert UnknownElection();
        _;
    }

    constructor(address initialOwner, address initialRelayer) Ownable(initialOwner) {
        relayer = initialRelayer;
        emit RelayerChanged(initialRelayer);
    }

    function setRelayer(address newRelayer) external onlyOwner {
        relayer = newRelayer;
        emit RelayerChanged(newRelayer);
    }

    function createElection(string calldata name) external onlyOwner returns (uint256 id) {
        id = ++electionCount;
        elections[id].name = name;
        elections[id].exists = true;
        emit ElectionCreated(id, name);
    }

    function addCandidate(uint256 id, string calldata name) external onlyOwner exists(id) returns (uint256 cid) {
        if (elections[id].status != Status.Created) revert WrongStatus();
        cid = ++elections[id].candidateCount;
        candidateNames[id][cid] = name;
        emit CandidateAdded(id, cid, name);
    }

    function renameCandidate(uint256 id, uint256 cid, string calldata name) external onlyOwner exists(id) {
        if (elections[id].status != Status.Created) revert WrongStatus();
        if (cid == 0 || cid > elections[id].candidateCount) revert InvalidCandidate();
        candidateNames[id][cid] = name;
        emit CandidateAdded(id, cid, name);
    }

    function setMerkleRoot(uint256 id, bytes32 root) external onlyOwner exists(id) {
        if (elections[id].status != Status.Created) revert WrongStatus();
        elections[id].merkleRoot = root;
        emit MerkleRootSet(id, root);
    }

    function startElection(uint256 id) external onlyOwner exists(id) {
        Election storage e = elections[id];
        if (e.status != Status.Created) revert WrongStatus();
        if (e.merkleRoot == bytes32(0)) revert RootNotSet();
        if (e.candidateCount == 0) revert NoCandidates();
        e.status = Status.Active;
        emit ElectionStarted(id);
    }

    function closeElection(uint256 id) external onlyOwner exists(id) {
        Election storage e = elections[id];
        if (e.status != Status.Active) revert WrongStatus();
        e.status = Status.Closed;
        emit ElectionClosed(id, e.totalVotes);
    }

    /// @notice Leaf = keccak256(abi.encode(commitment)) where commitment is an off-chain salted hash.
    function castVote(uint256 id, uint256 candidateId, bytes32 nullifier, bytes32 commitment, bytes32[] calldata proof)
        external
        onlyRelayer
        exists(id)
    {
        Election storage e = elections[id];
        if (e.status != Status.Active) revert WrongStatus();
        if (!MerkleProof.verifyCalldata(proof, e.merkleRoot, keccak256(abi.encode(commitment)))) revert InvalidProof();
        if (nullifierUsed[id][nullifier]) revert NullifierAlreadyUsed();
        if (candidateId == 0 || candidateId > e.candidateCount) revert InvalidCandidate();

        nullifierUsed[id][nullifier] = true;
        tallies[id][candidateId] += 1;
        e.totalVotes += 1;
        emit VoteCast(id, candidateId, nullifier);
    }

    function getElection(uint256 id)
        external view exists(id)
        returns (string memory name, bytes32 merkleRoot, Status status, uint256 candidateCount, uint256 totalVotes)
    {
        Election storage e = elections[id];
        return (e.name, e.merkleRoot, e.status, e.candidateCount, e.totalVotes);
    }

    function getCandidate(uint256 id, uint256 cid) external view exists(id) returns (string memory) {
        if (cid == 0 || cid > elections[id].candidateCount) revert InvalidCandidate();
        return candidateNames[id][cid];
    }

    /// @notice Results are only readable once the election is closed.
    function getResults(uint256 id) external view exists(id) returns (uint256[] memory counts) {
        if (elections[id].status != Status.Closed) revert WrongStatus();
        uint256 n = elections[id].candidateCount;
        counts = new uint256[](n);
        for (uint256 i = 1; i <= n; i++) counts[i - 1] = tallies[id][i];
    }

    function verifyEligibility(uint256 id, bytes32 commitment, bytes32[] calldata proof)
        external view exists(id) returns (bool)
    {
        return MerkleProof.verifyCalldata(proof, elections[id].merkleRoot, keccak256(abi.encode(commitment)));
    }
}
