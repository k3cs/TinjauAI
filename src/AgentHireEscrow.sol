// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {GroundedFacts} from "./GroundedFacts.sol";

/// @title AgentHireEscrow
/// @notice Example consumer of GroundedFacts: hiring escrow with a dynamic premium.
///         premiumBps = base + (max - base) * risk, risk = 1 - min(1, breadthGrounded/k) * c/(c + cloneDensityLB).
///         The premium is paid to the agent owner (incentive to earn senior, independent reviews and keep
///         clean provenance); there is no reserve waiting for a trigger. Gate only on gapCount > 0.
contract AgentHireEscrow {
    GroundedFacts public immutable facts;

    struct Params {
        uint64 minAge; // blocks between reviewer's oldest proven tx and its first feedback
        uint32 minDepth; // distinct ~30-day activity buckets
        uint64 k; // reviewers needed for full coverage
        uint64 c; // clone tolerance: risk factor c/(c+cloneDensityLB)
        uint16 baseBps;
        uint16 maxBps;
    }

    struct Job {
        address hirer;
        address agentOwner;
        uint64 chainKey;
        uint256 agentId;
        uint256 escrowed;
        uint256 premiumPaid;
        uint64 deadline;
        bool closed;
    }

    Job[] public jobs;

    event Hired(uint256 indexed jobId, uint64 chainKey, uint256 indexed agentId, address indexed hirer, uint256 escrowed, uint256 premium, uint16 premiumBps);
    event Released(uint256 indexed jobId, uint256 amount);
    event Refunded(uint256 indexed jobId, uint256 amount);

    error Gated(uint64 gapCount);
    error UnknownAgent();
    error NotHirer();
    error Closed();
    error TooEarly();
    error BadParams();
    error BadDeadline();

    constructor(GroundedFacts facts_) {
        facts = facts_;
    }

    /// @notice Risk and premium for hiring `agentId` under the consumer's thresholds.
    function quote(uint64 chainKey, uint256 agentId, Params memory p)
        public
        view
        returns (uint256 riskBps, uint16 premiumBps, uint64 gapCount, GroundedFacts.Facts memory f)
    {
        if (p.k == 0 || p.maxBps < p.baseBps || p.maxBps > 10_000) revert BadParams();
        f = facts.facts(chainKey, agentId, p.minAge, p.minDepth);
        uint256 coverage = uint256(f.breadthGrounded) * 10_000 / p.k;
        if (coverage > 10_000) coverage = 10_000;
        uint256 cloneFactor = p.c == 0 ? (f.cloneDensityLB == 0 ? 10_000 : 0) : uint256(p.c) * 10_000 / (uint256(p.c) + f.cloneDensityLB);
        riskBps = 10_000 - coverage * cloneFactor / 10_000;
        // safe: baseBps <= maxBps <= 10_000 and riskBps <= 10_000, so the result is <= 10_000
        // forge-lint: disable-next-line(unsafe-typecast)
        premiumBps = uint16(uint256(p.baseBps) + (uint256(p.maxBps) - p.baseBps) * riskBps / 10_000);
        gapCount = f.gapCount;
    }

    /// @notice Open a job. msg.value = task payment; the premium is deducted and paid to the agent owner now.
    function hire(uint64 chainKey, uint256 agentId, Params calldata p, uint64 deadline) external payable returns (uint256 jobId) {
        if (deadline <= block.timestamp) revert BadDeadline();
        (, uint16 premiumBps, uint64 gapCount,) = quote(chainKey, agentId, p);
        if (gapCount > 0) revert Gated(gapCount);
        (bool exists, address owner,,,,,) = facts.agents(facts.agentKey(chainKey, agentId));
        if (!exists || owner == address(0)) revert UnknownAgent();
        uint256 premium = msg.value * premiumBps / 10_000;
        uint256 escrowed = msg.value - premium;
        jobId = jobs.length;
        jobs.push(Job({
            hirer: msg.sender,
            agentOwner: owner,
            chainKey: chainKey,
            agentId: agentId,
            escrowed: escrowed,
            premiumPaid: premium,
            deadline: deadline,
            closed: false
        }));
        if (premium > 0) _pay(owner, premium);
        emit Hired(jobId, chainKey, agentId, msg.sender, escrowed, premium, premiumBps);
    }

    function release(uint256 jobId) external {
        Job storage j = jobs[jobId];
        if (msg.sender != j.hirer) revert NotHirer();
        if (j.closed) revert Closed();
        j.closed = true;
        _pay(j.agentOwner, j.escrowed);
        emit Released(jobId, j.escrowed);
    }

    function refund(uint256 jobId) external {
        Job storage j = jobs[jobId];
        if (msg.sender != j.hirer) revert NotHirer();
        if (j.closed) revert Closed();
        if (block.timestamp < j.deadline) revert TooEarly();
        j.closed = true;
        _pay(j.hirer, j.escrowed);
        emit Refunded(jobId, j.escrowed);
    }

    function jobCount() external view returns (uint256) {
        return jobs.length;
    }

    function _pay(address to, uint256 amount) internal {
        (bool ok,) = to.call{value: amount}("");
        require(ok, "pay failed");
    }
}
