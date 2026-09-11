// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IAgentFacts} from "./interfaces/IAgentFacts.sol";

/// @title AgentHireEscrow
/// @notice Example consumer of the Tinjau bureau: hires an ERC-8004 agent and prices the hire from
/// proven facts. The premium is the agent's cost of credit, paid to the agent's current owner.
/// The hirer brings every threshold; the contract holds no opinion of its own.
contract AgentHireEscrow {
    struct Params {
        uint64 minAge; // blocks a reviewer must have been active before reviewing
        uint32 minDepth; // distinct activity buckets a reviewer needs
        uint64 k; // grounded reviewers for full coverage
        uint64 c; // clone tolerance: cloneFactor = c / (c + cloneDensityLB)
        uint16 baseBps; // premium at zero risk
        uint16 maxBps; // premium at full risk
        uint32 minAttestors; // 0 = off; else fewest bonded attestors accepted
        uint64 maxStaleness; // 0 = off; else max blocks between attested tip and coveredThrough
    }

    struct Job {
        address hirer;
        address payee;
        uint64 chainKey;
        uint64 deadline;
        uint16 premiumBps;
        bool closed;
        uint256 agentId;
        uint256 held;
    }

    IAgentFacts public immutable FACTS;
    Job[] internal _jobs;

    event Hired(uint256 indexed jobId, uint64 chainKey, uint256 indexed agentId, address indexed payee, uint256 premiumBps, uint256 premium, uint256 held);
    event Released(uint256 indexed jobId, uint256 amount);
    event Refunded(uint256 indexed jobId, uint256 amount);

    error BadParams();
    error BadDeadline();
    error UnknownAgent();
    error Gated(uint64 gapCount);
    error Truncated();
    error ThinQuorum(uint32 have, uint32 want);
    error Stale(uint64 lag, uint64 max);
    error NotHirer();
    error Closed();
    error TooEarly();
    error TransferFailed();

    constructor(IAgentFacts facts_) {
        FACTS = facts_;
    }

    /// @notice Price a hire. risk = 1 − coverage·cloneFactor, premium = base + (max − base)·risk.
    function quote(uint64 chainKey, uint256 agentId, Params calldata p)
        public
        view
        returns (uint256 riskBps, uint256 premiumBps, IAgentFacts.Facts memory f, uint64 staleness)
    {
        if (p.k == 0 || p.baseBps > p.maxBps || p.maxBps > 10_000) revert BadParams();
        f = FACTS.facts(chainKey, agentId, p.minAge, p.minDepth);

        uint256 coverage = uint256(f.breadthGrounded) * 10_000 / p.k;
        if (coverage > 10_000) coverage = 10_000;
        uint256 cloneFactor = p.c == 0
            ? (f.cloneDensityLB == 0 ? 10_000 : 0)
            : uint256(p.c) * 10_000 / (uint256(p.c) + f.cloneDensityLB);
        riskBps = 10_000 - coverage * cloneFactor / 10_000;
        premiumBps = p.baseBps + (uint256(p.maxBps) - p.baseBps) * riskBps / 10_000;

        uint64 tip = FACTS.attestedTip(chainKey);
        staleness = tip > f.coveredThrough ? tip - f.coveredThrough : 0;
    }

    /// @notice Hire `agentId`. `msg.value` = premium (paid now) + amount held until release/refund.
    function hire(uint64 chainKey, uint256 agentId, Params calldata p, uint64 deadline)
        external
        payable
        returns (uint256 jobId)
    {
        if (deadline <= block.timestamp) revert BadDeadline();
        if (!FACTS.isRegistered(chainKey, agentId)) revert UnknownAgent();
        (, uint256 premiumBps, IAgentFacts.Facts memory f, uint64 staleness) = quote(chainKey, agentId, p);
        if (f.gapCount > 0) revert Gated(f.gapCount);
        // Reviewers past the iteration cap were not examined, so hidden gaps could exist there.
        if (f.truncated) revert Truncated();
        if (p.minAttestors > 0 && f.minAttestors < p.minAttestors) revert ThinQuorum(f.minAttestors, p.minAttestors);
        if (p.maxStaleness > 0 && staleness > p.maxStaleness) revert Stale(staleness, p.maxStaleness);

        address payee = FACTS.ownerOf(chainKey, agentId);
        uint256 premium = msg.value * premiumBps / 10_000;
        uint256 held = msg.value - premium;
        jobId = _jobs.length;
        _jobs.push(Job(msg.sender, payee, chainKey, deadline, uint16(premiumBps), false, agentId, held));
        emit Hired(jobId, chainKey, agentId, payee, premiumBps, premium, held);
        _send(payee, premium);
    }

    /// @notice Hirer confirms the work: the held amount goes to the payee recorded at hire time.
    function release(uint256 jobId) external {
        Job storage j = _open(jobId);
        j.closed = true;
        emit Released(jobId, j.held);
        _send(j.payee, j.held);
    }

    /// @notice After the deadline the hirer can take the held amount back. The premium is not refunded.
    function refund(uint256 jobId) external {
        Job storage j = _open(jobId);
        if (block.timestamp <= j.deadline) revert TooEarly();
        j.closed = true;
        emit Refunded(jobId, j.held);
        _send(j.hirer, j.held);
    }

    function jobOf(uint256 jobId) external view returns (Job memory) {
        return _jobs[jobId];
    }

    function jobCount() external view returns (uint256) {
        return _jobs.length;
    }

    function _open(uint256 jobId) internal view returns (Job storage j) {
        j = _jobs[jobId];
        if (j.hirer != msg.sender) revert NotHirer();
        if (j.closed) revert Closed();
    }

    function _send(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
