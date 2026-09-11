// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title IAgentFacts
/// @notice Read interface of the Tinjau credit bureau for AI agents. Every number is derived only
/// from Ethereum transactions proven through the Attestcoin BlockProver precompile, and can be
/// recomputed off-chain from the same proofs. There is no score: the caller brings thresholds.
interface IAgentFacts {
    struct Facts {
        /// Distinct reviewers with at least one proven review of this agent.
        uint64 breadthRaw;
        /// Reviewers with all review indices proven, active for >= minAge blocks before their
        /// first review, in >= minDepth distinct activity buckets.
        uint64 breadthGrounded;
        /// Reviewers that own no agent (as far as proven).
        uint64 breadthIndependent;
        /// Reviewer pairs whose proven review indices have holes below the highest proven index.
        uint64 gapCount;
        /// Proven reviews with a negative value that were not revoked.
        uint64 negatives;
        /// Other agents held by this agent's current owner (lower bound).
        uint64 cloneDensityLB;
        /// Other agents registered by the same transaction sender (lower bound).
        uint64 registrantSiblings;
        /// Other agents registered with the same non-empty URI (lower bound).
        uint64 uriSiblings;
        /// Other agents registered in the same source transaction.
        uint64 sameTxSiblings;
        /// Source height of this agent's proven registration (0 if unproven).
        uint64 firstRegisteredHeight;
        /// Highest source height among proofs that touched this agent.
        uint64 coveredThrough;
        /// Fewest bonded attestors observed (AttestorStash) when this agent's facts were admitted.
        uint32 minAttestors;
        /// True if reviewers beyond the iteration cap were not examined.
        bool truncated;
    }

    function facts(uint64 chainKey, uint256 agentId, uint64 minAge, uint32 minDepth)
        external
        view
        returns (Facts memory);

    function ownerOf(uint64 chainKey, uint256 agentId) external view returns (address);

    function isRegistered(uint64 chainKey, uint256 agentId) external view returns (bool);

    /// Latest source height Creditcoin has attested for `chainKey` (ChainInfo precompile).
    function attestedTip(uint64 chainKey) external view returns (uint64);
}
