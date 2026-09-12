// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {EvmV1Decoder} from "usc/EvmV1Decoder.sol";
import {INativeQueryVerifier} from "usc/INativeQueryVerifier.sol";
import {IAgentFacts} from "./interfaces/IAgentFacts.sol";
import {IChainInfo, IAttestorStash, Precompiles} from "./interfaces/IPrecompiles.sol";

/// @title GroundedFacts
/// @notice Credit bureau for AI agents. Admits facts about ERC-8004 agents and their reviewers
/// only through Attestcoin proofs of Ethereum transactions. No scores, no weights, no admin.
contract GroundedFacts is IAgentFacts {
    /// @notice One Attestcoin proof, as returned by the CC3 prover API (`proof-by-tx`).
    struct Proof {
        uint64 chainKey;
        uint64 height;
        bytes encodedTx;
        INativeQueryVerifier.MerkleProof merkleProof;
        INativeQueryVerifier.ContinuityProof continuityProof;
    }

    /// @notice Several proofs sharing one continuity proof, as returned by `proof-batch-by-tx`.
    /// The precompile checks the members together and rejects the whole batch if any one fails
    /// (verified live: one flipped byte in one member reverts the batch), so a batch is admitted
    /// as a unit. Members within the same attestation window share the continuity roots, which is
    /// where the gas saving comes from: measured 167,344 gas for two members against 227,904 for
    /// the same two proven one by one (27% at n = 2, more as n grows).
    struct Batch {
        uint64 chainKey;
        uint64[] heights;
        bytes[] encodedTxs;
        INativeQueryVerifier.MerkleProof[] merkleProofs;
        INativeQueryVerifier.ContinuityProof continuityProof;
    }

    /// @notice ERC-8004 registry pair accepted for one Attestcoin source chain.
    struct Registry {
        uint64 chainKey;
        address identity;
        address reputation;
    }

    struct Activity {
        uint64 oldest;
        uint32 buckets;
    }

    /// @dev One (agent, reviewer) pair. `known` counts distinct review indices proven by either a
    /// review or a revocation, so `maxIndex - known` is the number of holes below the top index.
    struct Pair {
        uint64 maxIndex;
        uint64 known;
        uint64 active;
        uint64 firstHeight;
        bool listed;
    }

    struct Agent {
        address owner;
        address registrant;
        bytes32 uriHash;
        bytes32 txKey;
        uint64 registeredHeight;
        uint128 lastOwnerUpdate;
        uint32 transfersProven;
    }

    struct Meta {
        uint64 coveredThrough;
        uint32 minAttestors;
        bool seen;
    }

    // keccak256 of the ERC-8004 event signatures (erc-8004/erc-8004-contracts, master, 11 Sep 2026)
    bytes32 internal constant NEW_FEEDBACK =
        keccak256("NewFeedback(uint256,address,uint64,int128,uint8,string,string,string,string,string,bytes32)");
    bytes32 internal constant FEEDBACK_REVOKED = keccak256("FeedbackRevoked(uint256,address,uint64)");
    bytes32 internal constant REGISTERED = keccak256("Registered(uint256,string,address)");
    bytes32 internal constant TRANSFER = keccak256("Transfer(address,address,uint256)");

    uint8 internal constant SEEN = 1;
    uint8 internal constant NEGATIVE = 2;
    uint8 internal constant REVOKED = 4;

    /// @notice Activity bucket size in source blocks (~30 days on Ethereum).
    uint64 public constant BUCKET = 216_000;
    /// @notice Reviewers examined per `facts` call; beyond this `truncated` is set.
    uint256 public constant MAX_REVIEWERS = 256;

    INativeQueryVerifier internal constant VERIFIER = INativeQueryVerifier(Precompiles.BLOCK_PROVER);

    mapping(uint64 chainKey => Registry) internal _registries;
    uint64[] internal _chainKeys;

    mapping(bytes32 txKey => bool) public admittedTx;

    mapping(uint64 chainKey => mapping(address => Activity)) internal _activity;
    mapping(uint64 chainKey => mapping(address => mapping(uint256 word => uint256 bits))) internal _bucketBits;

    mapping(bytes32 pairKey => Pair) internal _pairs;
    mapping(bytes32 pairKey => mapping(uint64 index => uint8 state)) internal _reviewState;
    mapping(bytes32 agentKey => address[]) internal _clients;
    mapping(bytes32 agentKey => uint64) internal _negatives;

    mapping(bytes32 agentKey => Agent) internal _agents;
    mapping(bytes32 agentKey => Meta) internal _meta;
    mapping(uint64 chainKey => mapping(address => uint64)) internal _ownerCount;
    mapping(uint64 chainKey => mapping(address => uint64)) internal _registrantCount;
    mapping(uint64 chainKey => mapping(bytes32 uriHash => uint64)) internal _uriCount;
    mapping(bytes32 txKey => uint64) internal _txRegisteredCount;

    event TxAdmitted(uint64 indexed chainKey, uint64 indexed height, uint64 txIndex, address indexed from, uint32 attestors);
    event ReviewProven(uint64 indexed chainKey, uint256 indexed agentId, address indexed client, uint64 feedbackIndex, int128 value);
    event ReviewRevoked(uint64 indexed chainKey, uint256 indexed agentId, address indexed client, uint64 feedbackIndex);
    event AgentProven(uint64 indexed chainKey, uint256 indexed agentId, address indexed owner, address registrant);
    event OwnerUpdated(uint64 indexed chainKey, uint256 indexed agentId, address indexed owner);

    error UnknownChain(uint64 chainKey);
    error ProofRejected(uint256 index);
    error BadRegistry();
    error BadBatch();

    /// @param registries ERC-8004 registries per Attestcoin chainKey. Fixed forever: no admin.
    constructor(Registry[] memory registries) {
        for (uint256 i; i < registries.length; ++i) {
            Registry memory r = registries[i];
            if (r.identity == address(0) || r.reputation == address(0) || _registries[r.chainKey].identity != address(0)) {
                revert BadRegistry();
            }
            _registries[r.chainKey] = r;
            _chainKeys.push(r.chainKey);
        }
    }

    // ------------------------------------------------------------------ writes

    /// @notice Admit proven Ethereum transactions. Anyone may call; trust comes from the proof.
    /// @return admitted Number of proofs that were new (duplicates are skipped, not reverted).
    function record(Proof[] calldata proofs) external returns (uint256 admitted) {
        for (uint256 i; i < proofs.length; ++i) {
            Proof calldata p = proofs[i];
            Registry memory reg = _registry(p.chainKey);
            bool ok;
            try VERIFIER.verify(p.chainKey, p.height, p.encodedTx, p.merkleProof, p.continuityProof) returns (bool v) {
                ok = v;
            } catch {}
            if (!ok) revert ProofRejected(i);
            if (_admitVerified(reg, p.chainKey, p.height, p.encodedTx, p.merkleProof)) ++admitted;
        }
    }

    /// @notice Admit proven transactions that share one continuity proof. One precompile call
    /// checks every member; the batch is rejected whole if any member fails (`ProofRejected(0)`).
    /// Duplicates inside the batch are skipped like anywhere else. Anyone may call.
    /// @return admitted Number of members that were new.
    function recordBatch(Batch calldata b) external returns (uint256 admitted) {
        uint256 n = b.heights.length;
        if (n == 0 || b.encodedTxs.length != n || b.merkleProofs.length != n) revert BadBatch();
        Registry memory reg = _registry(b.chainKey);

        bool ok;
        try VERIFIER.verify(b.chainKey, b.heights, b.encodedTxs, b.merkleProofs, b.continuityProof) returns (bool v) {
            ok = v;
        } catch {}
        if (!ok) revert ProofRejected(0);

        for (uint256 i; i < n; ++i) {
            if (_admitVerified(reg, b.chainKey, b.heights[i], b.encodedTxs[i], b.merkleProofs[i])) ++admitted;
        }
    }

    function _registry(uint64 chainKey) internal view returns (Registry memory reg) {
        reg = _registries[chainKey];
        if (reg.identity == address(0)) revert UnknownChain(chainKey);
    }

    /// @dev Everything after the precompile said yes: dedup, decode, facts. Shared by both paths.
    function _admitVerified(
        Registry memory reg,
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTx,
        INativeQueryVerifier.MerkleProof calldata merkleProof
    ) internal returns (bool) {
        uint64 txIndex = VERIFIER.calculateTxIndex(merkleProof);
        bytes32 txKey = keccak256(abi.encode(chainKey, height, txIndex));
        if (admittedTx[txKey]) return false;
        admittedTx[txKey] = true;

        bytes memory enc = encodedTx;
        address from = EvmV1Decoder.decodeCommonTxFields(enc).from;
        _recordActivity(chainKey, from, height);

        uint32 attestors = _attestorsNow(chainKey);
        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(enc);
        // The precompile proves inclusion, not success: logs of a reverted tx are never used.
        if (receipt.receiptStatus == 1) {
            Ctx memory ctx = Ctx(chainKey, height, txIndex, txKey, from, attestors);
            EvmV1Decoder.LogEntry[] memory logs = receipt.receiptLogs;
            for (uint256 j; j < logs.length; ++j) {
                EvmV1Decoder.LogEntry memory lg = logs[j];
                if (lg.topics.length == 0) continue;
                if (lg.address_ == reg.reputation) {
                    _onReputationLog(ctx, lg);
                } else if (lg.address_ == reg.identity) {
                    _onIdentityLog(ctx, lg, j);
                }
            }
        }
        emit TxAdmitted(chainKey, height, txIndex, from, attestors);
        return true;
    }

    struct Ctx {
        uint64 chainKey;
        uint64 height;
        uint64 txIndex;
        bytes32 txKey;
        address from;
        uint32 attestors;
    }

    function _recordActivity(uint64 chainKey, address who, uint64 height) internal {
        Activity storage a = _activity[chainKey][who];
        if (a.oldest == 0 || height < a.oldest) a.oldest = height;
        uint256 b = height / BUCKET;
        uint256 bit = 1 << (b & 255);
        mapping(uint256 => uint256) storage bits = _bucketBits[chainKey][who];
        uint256 word = bits[b >> 8];
        if (word & bit == 0) {
            bits[b >> 8] = word | bit;
            ++a.buckets;
        }
    }

    function _onReputationLog(Ctx memory ctx, EvmV1Decoder.LogEntry memory lg) internal {
        bytes32 sig = lg.topics[0];
        if (sig == NEW_FEEDBACK && lg.topics.length >= 3 && lg.data.length >= 64) {
            uint256 agentId = uint256(lg.topics[1]);
            address client = address(uint160(uint256(lg.topics[2])));
            (uint64 index, int128 value) = abi.decode(lg.data, (uint64, int128));
            _onReview(ctx, agentId, client, index, value);
        } else if (sig == FEEDBACK_REVOKED && lg.topics.length >= 4) {
            uint256 agentId = uint256(lg.topics[1]);
            address client = address(uint160(uint256(lg.topics[2])));
            uint64 index = uint64(uint256(lg.topics[3]));
            _onRevoke(ctx, agentId, client, index);
        }
    }

    function _onReview(Ctx memory ctx, uint256 agentId, address client, uint64 index, int128 value) internal {
        bytes32 aKey = _agentKey(ctx.chainKey, agentId);
        bytes32 pKey = _pairKey(ctx.chainKey, agentId, client);
        Pair storage pair = _pairs[pKey];
        uint8 state = _reviewState[pKey][index];
        if (state & SEEN != 0) return;

        if (state == 0) ++pair.known;
        uint8 next = state | SEEN | (value < 0 ? NEGATIVE : 0);
        _reviewState[pKey][index] = next;
        if (next & REVOKED == 0) {
            ++pair.active;
            if (value < 0) ++_negatives[aKey];
        }
        if (index > pair.maxIndex) pair.maxIndex = index;
        if (pair.firstHeight == 0 || ctx.height < pair.firstHeight) pair.firstHeight = ctx.height;
        _list(aKey, pair, client);
        _touch(aKey, ctx);
        emit ReviewProven(ctx.chainKey, agentId, client, index, value);
    }

    function _onRevoke(Ctx memory ctx, uint256 agentId, address client, uint64 index) internal {
        bytes32 aKey = _agentKey(ctx.chainKey, agentId);
        bytes32 pKey = _pairKey(ctx.chainKey, agentId, client);
        Pair storage pair = _pairs[pKey];
        uint8 state = _reviewState[pKey][index];
        if (state & REVOKED != 0) return;

        if (state == 0) ++pair.known;
        if (state & SEEN != 0) {
            --pair.active;
            if (state & NEGATIVE != 0) --_negatives[aKey];
        }
        _reviewState[pKey][index] = state | REVOKED;
        if (index > pair.maxIndex) pair.maxIndex = index;
        _list(aKey, pair, client);
        _touch(aKey, ctx);
        emit ReviewRevoked(ctx.chainKey, agentId, client, index);
    }

    function _onIdentityLog(Ctx memory ctx, EvmV1Decoder.LogEntry memory lg, uint256 logIndex) internal {
        bytes32 sig = lg.topics[0];
        if (sig == REGISTERED && lg.topics.length >= 3) {
            uint256 agentId = uint256(lg.topics[1]);
            address owner = address(uint160(uint256(lg.topics[2])));
            string memory uri = abi.decode(lg.data, (string));
            _onRegistered(ctx, agentId, owner, bytes(uri).length == 0 ? bytes32(0) : keccak256(bytes(uri)), logIndex);
        } else if (sig == TRANSFER && lg.topics.length >= 4) {
            address from = address(uint160(uint256(lg.topics[1])));
            if (from == address(0)) return; // mint: the Registered log carries the owner
            address to = address(uint160(uint256(lg.topics[2])));
            _onTransfer(ctx, uint256(lg.topics[3]), to, logIndex);
        }
    }

    function _onRegistered(Ctx memory ctx, uint256 agentId, address owner, bytes32 uriHash, uint256 logIndex) internal {
        bytes32 aKey = _agentKey(ctx.chainKey, agentId);
        Agent storage ag = _agents[aKey];
        if (ag.registeredHeight != 0) return;
        ag.owner = owner;
        ag.registrant = ctx.from;
        ag.uriHash = uriHash;
        ag.txKey = ctx.txKey;
        ag.registeredHeight = ctx.height;
        ag.lastOwnerUpdate = _order(ctx, logIndex);
        ++_ownerCount[ctx.chainKey][owner];
        ++_registrantCount[ctx.chainKey][ctx.from];
        if (uriHash != bytes32(0)) ++_uriCount[ctx.chainKey][uriHash];
        ++_txRegisteredCount[ctx.txKey];
        _touch(aKey, ctx);
        emit AgentProven(ctx.chainKey, agentId, owner, ctx.from);
    }

    /// @dev The newest proven transfer wins, whatever order proofs arrive in. Transfers of agents
    /// whose registration is not proven yet are ignored (conservative: ownership stays unknown).
    function _onTransfer(Ctx memory ctx, uint256 agentId, address to, uint256 logIndex) internal {
        bytes32 aKey = _agentKey(ctx.chainKey, agentId);
        Agent storage ag = _agents[aKey];
        if (ag.registeredHeight == 0) return;
        uint128 ord = _order(ctx, logIndex);
        if (ord <= ag.lastOwnerUpdate) return;
        ag.lastOwnerUpdate = ord;
        ++ag.transfersProven;
        address prev = ag.owner;
        if (prev != to) {
            --_ownerCount[ctx.chainKey][prev];
            ++_ownerCount[ctx.chainKey][to];
            ag.owner = to;
        }
        _touch(aKey, ctx);
        emit OwnerUpdated(ctx.chainKey, agentId, to);
    }

    function _list(bytes32 aKey, Pair storage pair, address client) internal {
        if (!pair.listed) {
            pair.listed = true;
            _clients[aKey].push(client);
        }
    }

    function _touch(bytes32 aKey, Ctx memory ctx) internal {
        Meta storage m = _meta[aKey];
        if (ctx.height > m.coveredThrough) m.coveredThrough = ctx.height;
        if (!m.seen || ctx.attestors < m.minAttestors) m.minAttestors = ctx.attestors;
        m.seen = true;
    }

    function _attestorsNow(uint64 chainKey) internal view returns (uint32) {
        try IAttestorStash(Precompiles.ATTESTOR_STASH).getAttestorsCount(chainKey) returns (uint256 c) {
            return c > type(uint32).max ? type(uint32).max : uint32(c);
        } catch {
            return 0;
        }
    }

    function _order(Ctx memory ctx, uint256 logIndex) internal pure returns (uint128) {
        // Safe: txIndex and logIndex are far below 2^32 in any real block, so fields never overlap.
        // forge-lint: disable-next-line(unsafe-typecast)
        return (uint128(ctx.height) << 64) | (uint128(ctx.txIndex) << 32) | uint128(uint32(logIndex));
    }

    function _agentKey(uint64 chainKey, uint256 agentId) internal pure returns (bytes32) {
        return keccak256(abi.encode(chainKey, agentId));
    }

    function _pairKey(uint64 chainKey, uint256 agentId, address client) internal pure returns (bytes32) {
        return keccak256(abi.encode(chainKey, agentId, client));
    }

    // ------------------------------------------------------------------ reads

    /// @inheritdoc IAgentFacts
    function facts(uint64 chainKey, uint256 agentId, uint64 minAge, uint32 minDepth)
        external
        view
        returns (Facts memory f)
    {
        bytes32 aKey = _agentKey(chainKey, agentId);
        address[] storage clients = _clients[aKey];
        uint256 n = clients.length;
        if (n > MAX_REVIEWERS) {
            n = MAX_REVIEWERS;
            f.truncated = true;
        }
        for (uint256 i; i < n; ++i) {
            address client = clients[i];
            Pair storage pair = _pairs[_pairKey(chainKey, agentId, client)];
            if (pair.maxIndex > pair.known) ++f.gapCount;
            if (pair.active == 0) continue;
            ++f.breadthRaw;
            if (_ownerCount[chainKey][client] == 0) ++f.breadthIndependent;
            Activity storage a = _activity[chainKey][client];
            // A reviewer is grounded only when every one of their review indices is proven (so
            // firstHeight is their real first review) and their proven activity is old and spread
            // enough before it. Reviews sent through a relayer or smart account leave no activity
            // for `client`, so such reviewers stay ungrounded. Omission never helps.
            if (
                pair.maxIndex == pair.known && a.oldest != 0 && a.oldest <= pair.firstHeight
                    && pair.firstHeight - a.oldest >= minAge && a.buckets >= minDepth
            ) {
                ++f.breadthGrounded;
            }
        }
        f.negatives = _negatives[aKey];

        Agent storage ag = _agents[aKey];
        if (ag.registeredHeight != 0) {
            f.cloneDensityLB = _minusOne(_ownerCount[chainKey][ag.owner]);
            f.registrantSiblings = _minusOne(_registrantCount[chainKey][ag.registrant]);
            f.uriSiblings = ag.uriHash == bytes32(0) ? 0 : _minusOne(_uriCount[chainKey][ag.uriHash]);
            f.sameTxSiblings = _minusOne(_txRegisteredCount[ag.txKey]);
            f.firstRegisteredHeight = ag.registeredHeight;
        }
        Meta storage m = _meta[aKey];
        f.coveredThrough = m.coveredThrough;
        f.minAttestors = m.minAttestors;
    }

    function _minusOne(uint64 x) internal pure returns (uint64) {
        return x == 0 ? 0 : x - 1;
    }

    /// @inheritdoc IAgentFacts
    function ownerOf(uint64 chainKey, uint256 agentId) external view returns (address) {
        return _agents[_agentKey(chainKey, agentId)].owner;
    }

    /// @inheritdoc IAgentFacts
    function isRegistered(uint64 chainKey, uint256 agentId) external view returns (bool) {
        return _agents[_agentKey(chainKey, agentId)].registeredHeight != 0;
    }

    /// @inheritdoc IAgentFacts
    function attestedTip(uint64 chainKey) external view returns (uint64) {
        try IChainInfo(Precompiles.CHAIN_INFO).get_latest_attestation_height_and_hash(chainKey) returns (
            IChainInfo.HeightHashResult memory r
        ) {
            return r.exists ? r.height : 0;
        } catch {
            return 0;
        }
    }

    function agentOf(uint64 chainKey, uint256 agentId) external view returns (Agent memory) {
        return _agents[_agentKey(chainKey, agentId)];
    }

    function pairOf(uint64 chainKey, uint256 agentId, address client) external view returns (Pair memory) {
        return _pairs[_pairKey(chainKey, agentId, client)];
    }

    function clientsOf(uint64 chainKey, uint256 agentId) external view returns (address[] memory) {
        return _clients[_agentKey(chainKey, agentId)];
    }

    function reviewerSeniority(uint64 chainKey, address reviewer) external view returns (Activity memory) {
        return _activity[chainKey][reviewer];
    }

    /// @notice Agents currently held by `owner` among proven registrations (lower bound).
    function reviewerOwnsAgents(uint64 chainKey, address owner) external view returns (uint64) {
        return _ownerCount[chainKey][owner];
    }

    function registryOf(uint64 chainKey) external view returns (Registry memory) {
        return _registries[chainKey];
    }

    function chainKeys() external view returns (uint64[] memory) {
        return _chainKeys;
    }
}
