// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {GroundedFacts} from "./GroundedFacts.sol";

/// @title CoverageBounty
/// @notice A consumer funds a bounty on one agent together with its thresholds. Whoever submits proofs
///         that change the consumer's *decision tuple* (breadthGrounded >= k, gapCount == 0,
///         cloneDensityLB >= c, negatives > 0) is paid. Proofs that do not change the decision are not paid,
///         so incremental or repeated evidence cannot drain the bounty. Evidence that hurts the agent pays
///         the same as evidence that helps it.
contract CoverageBounty {
    GroundedFacts public immutable facts;

    struct Bounty {
        address funder;
        uint64 chainKey;
        uint256 agentId;
        uint64 minAge;
        uint32 minDepth;
        uint64 k;
        uint64 c;
        uint256 amount;
        uint64 expiry;
        bytes32 decision;
        bool open;
    }

    Bounty[] public bounties;

    event Funded(uint256 indexed bountyId, uint64 chainKey, uint256 indexed agentId, uint256 amount, bytes32 decision);
    event Claimed(uint256 indexed bountyId, address indexed prover, uint256 admitted, bytes32 oldDecision, bytes32 newDecision);
    event Withdrawn(uint256 indexed bountyId, uint256 amount);

    error NotOpen();
    error NoChange();
    error NotFunder();
    error NotExpired();
    error BadExpiry();

    constructor(GroundedFacts facts_) {
        facts = facts_;
    }

    function decisionOf(uint64 chainKey, uint256 agentId, uint64 minAge, uint32 minDepth, uint64 k, uint64 c)
        public
        view
        returns (bytes32)
    {
        GroundedFacts.Facts memory f = facts.facts(chainKey, agentId, minAge, minDepth);
        return keccak256(abi.encode(f.breadthGrounded >= k, f.gapCount == 0, f.cloneDensityLB >= c, f.negatives > 0));
    }

    function fund(uint64 chainKey, uint256 agentId, uint64 minAge, uint32 minDepth, uint64 k, uint64 c, uint64 expiry)
        external
        payable
        returns (uint256 id)
    {
        if (expiry <= block.timestamp) revert BadExpiry();
        bytes32 d = decisionOf(chainKey, agentId, minAge, minDepth, k, c);
        id = bounties.length;
        bounties.push(Bounty(msg.sender, chainKey, agentId, minAge, minDepth, k, c, msg.value, expiry, d, true));
        emit Funded(id, chainKey, agentId, msg.value, d);
    }

    /// @notice Submit proofs and claim the bounty in one transaction if they change the decision tuple.
    function proveAndClaim(uint256 bountyId, GroundedFacts.Proof[] calldata proofs) external {
        Bounty storage b = bounties[bountyId];
        if (!b.open) revert NotOpen();
        uint256 admitted = facts.record(proofs);
        bytes32 d = decisionOf(b.chainKey, b.agentId, b.minAge, b.minDepth, b.k, b.c);
        if (d == b.decision) revert NoChange();
        b.open = false;
        bytes32 old = b.decision;
        b.decision = d;
        uint256 amount = b.amount;
        b.amount = 0;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "pay failed");
        emit Claimed(bountyId, msg.sender, admitted, old, d);
    }

    function withdraw(uint256 bountyId) external {
        Bounty storage b = bounties[bountyId];
        if (msg.sender != b.funder) revert NotFunder();
        if (!b.open) revert NotOpen();
        if (block.timestamp < b.expiry) revert NotExpired();
        b.open = false;
        uint256 amount = b.amount;
        b.amount = 0;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "pay failed");
        emit Withdrawn(bountyId, amount);
    }

    function bountyCount() external view returns (uint256) {
        return bounties.length;
    }
}
