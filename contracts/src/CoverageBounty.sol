// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {GroundedFacts} from "./GroundedFacts.sol";
import {IAgentFacts} from "./interfaces/IAgentFacts.sol";

/// @title CoverageBounty
/// @notice Pays whoever submits proofs that change a consumer's decision about an agent, in either
/// direction. Evidence that hurts an agent pays the same as evidence that helps it; evidence that
/// changes nothing pays nothing.
contract CoverageBounty {
    struct Bounty {
        address funder;
        uint64 chainKey;
        uint64 minAge;
        uint32 minDepth;
        uint64 k;
        uint64 c;
        uint64 expiry;
        bool closed;
        uint256 agentId;
        uint256 amount;
        bytes32 decision;
    }

    GroundedFacts public immutable FACTS;
    Bounty[] internal _bounties;

    event Funded(uint256 indexed id, uint64 chainKey, uint256 indexed agentId, uint256 amount, bytes32 decision, uint64 expiry);
    event Claimed(uint256 indexed id, address indexed claimant, uint256 amount, bytes32 newDecision);
    event Withdrawn(uint256 indexed id, uint256 amount);

    error BadExpiry();
    error NoValue();
    error NoChange();
    error Closed();
    error Expired();
    error NotFunder();
    error TooEarly();
    error TransferFailed();

    constructor(GroundedFacts facts_) {
        FACTS = facts_;
    }

    /// @notice The consumer's decision tuple: (grounded ≥ k, no gaps, clones ≥ c, any negatives).
    function decisionOf(uint64 chainKey, uint256 agentId, uint64 minAge, uint32 minDepth, uint64 k, uint64 c)
        public
        view
        returns (bytes32)
    {
        IAgentFacts.Facts memory f = FACTS.facts(chainKey, agentId, minAge, minDepth);
        return keccak256(abi.encode(f.breadthGrounded >= k, f.gapCount == 0, f.cloneDensityLB >= c, f.negatives > 0));
    }

    function fund(uint64 chainKey, uint256 agentId, uint64 minAge, uint32 minDepth, uint64 k, uint64 c, uint64 expiry)
        external
        payable
        returns (uint256 id)
    {
        if (msg.value == 0) revert NoValue();
        if (expiry <= block.timestamp) revert BadExpiry();
        bytes32 d = decisionOf(chainKey, agentId, minAge, minDepth, k, c);
        id = _bounties.length;
        _bounties.push(Bounty(msg.sender, chainKey, minAge, minDepth, k, c, expiry, false, agentId, msg.value, d));
        emit Funded(id, chainKey, agentId, msg.value, d, expiry);
    }

    /// @notice Admit `proofs` into the bureau and get paid if the consumer's decision changed.
    function proveAndClaim(uint256 id, GroundedFacts.Proof[] calldata proofs) external {
        Bounty storage b = _bounties[id];
        if (b.closed) revert Closed();
        if (block.timestamp > b.expiry) revert Expired();
        // Pay only for a change caused by these proofs. Comparing with the snapshot taken at
        // funding would let anyone claim with zero proofs after someone else moved the facts.
        bytes32 before = decisionOf(b.chainKey, b.agentId, b.minAge, b.minDepth, b.k, b.c);
        FACTS.record(proofs);
        bytes32 d = decisionOf(b.chainKey, b.agentId, b.minAge, b.minDepth, b.k, b.c);
        if (d == before) revert NoChange();
        b.closed = true;
        emit Claimed(id, msg.sender, b.amount, d);
        _send(msg.sender, b.amount);
    }

    function withdraw(uint256 id) external {
        Bounty storage b = _bounties[id];
        if (b.funder != msg.sender) revert NotFunder();
        if (b.closed) revert Closed();
        if (block.timestamp <= b.expiry) revert TooEarly();
        b.closed = true;
        emit Withdrawn(id, b.amount);
        _send(msg.sender, b.amount);
    }

    function bountyOf(uint256 id) external view returns (Bounty memory) {
        return _bounties[id];
    }

    function bountyCount() external view returns (uint256) {
        return _bounties.length;
    }

    function _send(address to, uint256 amount) internal {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
