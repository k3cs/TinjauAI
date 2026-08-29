// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {INativeQueryVerifier, NativeQueryVerifierLib} from "usc/INativeQueryVerifier.sol";
import {EvmV1Decoder} from "usc/EvmV1Decoder.sol";

/// @title GroundedFacts
/// @notice Facts about ERC-8004 agents and their reviewers, admitted only through Attestcoin proofs
///         of Ethereum transactions. No editorial score: consumers pass their own thresholds.
/// @dev Every admitted proof also proves activity of the tx sender (used for reviewer seniority).
contract GroundedFacts {
    using EvmV1Decoder for bytes;

    // ---- constants -------------------------------------------------------------------------
    INativeQueryVerifier internal constant VERIFIER = INativeQueryVerifier(NativeQueryVerifierLib.PRECOMPILE);
    uint64 public constant BUCKET_BLOCKS = 216_000; // ~30 days on Ethereum (12 s blocks)
    /// @dev facts() iterates reviewers; cap keeps on-chain consumers (escrow.quote) within block gas. Agents with
    ///      more proven reviewers than this report `truncated` and consumers should paginate off-chain.
    uint256 public constant MAX_CLIENTS_PER_QUERY = 256;

    bytes32 public constant SIG_NEW_FEEDBACK =
        keccak256("NewFeedback(uint256,address,uint64,int128,uint8,string,string,string,string,string,bytes32)");
    bytes32 public constant SIG_FEEDBACK_REVOKED = keccak256("FeedbackRevoked(uint256,address,uint64)");
    bytes32 public constant SIG_REGISTERED = keccak256("Registered(uint256,string,address)");
    bytes32 public constant SIG_TRANSFER = keccak256("Transfer(address,address,uint256)");

    // ---- types -----------------------------------------------------------------------------
    struct Proof {
        uint64 chainKey;
        uint64 height;
        bytes encodedTx;
        INativeQueryVerifier.MerkleProof merkle;
        INativeQueryVerifier.ContinuityProof continuity;
    }

    struct FeedbackRec {
        bool exists;
        bool revoked;
        int128 value;
        uint8 decimals;
        uint64 height;
    }

    struct PairRec {
        bool known;
        uint64 maxIndex; // highest proven feedbackIndex
        uint64 provenCount; // number of distinct proven indices
        uint64 negatives; // proven, non-revoked, value < 0
        uint64 firstFeedbackHeight; // lowest proven feedback height
    }

    struct AgentRec {
        bool exists;
        address owner; // current owner as far as proven (Registered, then Transfer)
        address registrant; // sender of the Registered tx (robust to factory / token-bound-account patterns)
        bytes32 uriHash;
        uint64 registeredHeight;
        bytes32 txKey; // (chainKey,height,txIndex) of the Registered tx
        uint64 transfersProven;
    }

    struct Facts {
        uint64 breadthRaw;
        uint64 breadthGrounded;
        uint64 breadthIndependent;
        uint64 gapCount;
        uint64 negatives;
        uint64 cloneDensityLB; // other proven agents with the same current owner
        uint64 registrantSiblings; // other proven agents registered by the same tx sender
        uint64 uriSiblings;
        uint64 sameTxSiblings;
        uint64 firstRegisteredHeight; // earliest proven registration for the agent's URI
        bool truncated; // true when more than MAX_CLIENTS_PER_QUERY reviewers are proven; counts cover the first 256
    }

    // ---- storage ---------------------------------------------------------------------------
    /// chainKey => official registry addresses (source-chain contracts whose logs are admitted)
    mapping(uint64 => address) public identityRegistry;
    mapping(uint64 => address) public reputationRegistry;

    mapping(bytes32 => bool) public txSeen; // keccak(chainKey,height,txIndex)
    mapping(bytes32 => uint64) public txRegisteredCount; // txKey => # Registered logs in that tx

    // feedback: key(chainKey,agentId,client,index) / pair key(chainKey,agentId,client)
    mapping(bytes32 => FeedbackRec) public feedbacks;
    mapping(bytes32 => PairRec) public pairs;
    mapping(bytes32 => address[]) internal _clients; // agentKey => distinct reviewers

    // activity: key(chainKey,addr)
    mapping(bytes32 => uint64) public oldestHeight; // 0 = nothing proven
    mapping(bytes32 => uint32) public bucketCount;
    mapping(bytes32 => mapping(uint64 => bool)) public bucketSeen;

    // identity: agentKey(chainKey,agentId)
    mapping(bytes32 => AgentRec) public agents;
    mapping(bytes32 => uint64) public ownerAgentCount; // key(chainKey,owner)
    mapping(bytes32 => uint64) public registrantAgentCount; // key(chainKey,registrant)
    mapping(bytes32 => uint64) public uriCount; // key(chainKey,uriHash)
    mapping(bytes32 => uint64) public uriFirstHeight; // key(chainKey,uriHash) => earliest proven Registered height

    // ---- events ----------------------------------------------------------------------------
    event TxAdmitted(uint64 indexed chainKey, uint64 indexed height, uint64 txIndex, address from);
    event FeedbackRecorded(uint64 indexed chainKey, uint256 indexed agentId, address indexed client, uint64 index, int128 value);
    event FeedbackRevokedRecorded(uint64 indexed chainKey, uint256 indexed agentId, address indexed client, uint64 index);
    event AgentRecorded(uint64 indexed chainKey, uint256 indexed agentId, address indexed owner, bytes32 uriHash);
    event AgentTransferred(uint64 indexed chainKey, uint256 indexed agentId, address from, address to);
    event ActivityRecorded(uint64 indexed chainKey, address indexed who, uint64 height);

    error ProofRejected(uint64 chainKey, uint64 height);
    error UnknownChain(uint64 chainKey);

    constructor() {
        // Ethereum mainnet (Attestcoin chainKey 3)
        identityRegistry[3] = 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432;
        reputationRegistry[3] = 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63;
        // Ethereum Sepolia (Attestcoin chainKey 1)
        identityRegistry[1] = 0x8004A818BFB912233c491871b3d84c89A494BD9e;
        reputationRegistry[1] = 0x8004B663056A597Dffe9eCcC1965A193B7388713;
    }

    // ---- keys ------------------------------------------------------------------------------
    function agentKey(uint64 chainKey, uint256 agentId) public pure returns (bytes32) {
        return keccak256(abi.encode("agent", chainKey, agentId));
    }

    function pairKey(uint64 chainKey, uint256 agentId, address client) public pure returns (bytes32) {
        return keccak256(abi.encode("pair", chainKey, agentId, client));
    }

    function feedbackKey(uint64 chainKey, uint256 agentId, address client, uint64 index) public pure returns (bytes32) {
        return keccak256(abi.encode("fb", chainKey, agentId, client, index));
    }

    function addrKey(uint64 chainKey, address who) public pure returns (bytes32) {
        return keccak256(abi.encode("addr", chainKey, who));
    }

    function uriKey(uint64 chainKey, bytes32 uriHash) public pure returns (bytes32) {
        return keccak256(abi.encode("uri", chainKey, uriHash));
    }

    function txKeyOf(uint64 chainKey, uint64 height, uint64 txIndex) public pure returns (bytes32) {
        return keccak256(abi.encode("tx", chainKey, height, txIndex));
    }

    // ---- record ----------------------------------------------------------------------------
    /// @notice Admit one or more proven Ethereum transactions. Anyone may call.
    /// @return admitted number of transactions newly admitted (already-seen ones are skipped, not reverted)
    function record(Proof[] calldata proofs) external returns (uint256 admitted) {
        for (uint256 i; i < proofs.length; i++) {
            if (_recordOne(proofs[i])) admitted++;
        }
    }

    function _recordOne(Proof calldata p) internal returns (bool) {
        if (identityRegistry[p.chainKey] == address(0)) revert UnknownChain(p.chainKey);
        if (!VERIFIER.verify(p.chainKey, p.height, p.encodedTx, p.merkle, p.continuity)) {
            revert ProofRejected(p.chainKey, p.height);
        }
        uint64 txIndex = VERIFIER.calculateTxIndex(p.merkle);
        bytes32 txKey = txKeyOf(p.chainKey, p.height, txIndex);
        if (txSeen[txKey]) return false;
        txSeen[txKey] = true;

        EvmV1Decoder.CommonTxFields memory common = EvmV1Decoder.decodeCommonTxFields(p.encodedTx);
        _recordActivity(p.chainKey, common.from, p.height);
        emit TxAdmitted(p.chainKey, p.height, txIndex, common.from);

        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(p.encodedTx);
        if (receipt.receiptStatus != 1) return true; // failed tx still proves sender activity, nothing else

        address idReg = identityRegistry[p.chainKey];
        address repReg = reputationRegistry[p.chainKey];
        uint64 registeredInTx;
        EvmV1Decoder.LogEntry[] memory logs = receipt.receiptLogs;
        for (uint256 j; j < logs.length; j++) {
            EvmV1Decoder.LogEntry memory log = logs[j];
            if (log.topics.length == 0) continue;
            bytes32 sig = log.topics[0];
            if (log.address_ == repReg) {
                if (sig == SIG_NEW_FEEDBACK && log.topics.length >= 3) _onNewFeedback(p.chainKey, p.height, log);
                else if (sig == SIG_FEEDBACK_REVOKED && log.topics.length == 4) _onRevoked(p.chainKey, log);
            } else if (log.address_ == idReg) {
                if (sig == SIG_REGISTERED && log.topics.length == 3) {
                    _onRegistered(p.chainKey, p.height, txKey, common.from, log);
                    registeredInTx++;
                } else if (sig == SIG_TRANSFER && log.topics.length == 4) {
                    _onTransfer(p.chainKey, log);
                }
            }
        }
        if (registeredInTx > 0) txRegisteredCount[txKey] = registeredInTx;
        return true;
    }

    function _recordActivity(uint64 chainKey, address who, uint64 height) internal {
        bytes32 k = addrKey(chainKey, who);
        uint64 oldest = oldestHeight[k];
        if (oldest == 0 || height < oldest) oldestHeight[k] = height;
        uint64 bucket = height / BUCKET_BLOCKS;
        if (!bucketSeen[k][bucket]) {
            bucketSeen[k][bucket] = true;
            bucketCount[k] += 1;
        }
        emit ActivityRecorded(chainKey, who, height);
    }

    function _onNewFeedback(uint64 chainKey, uint64 height, EvmV1Decoder.LogEntry memory log) internal {
        uint256 agentId = uint256(log.topics[1]);
        address client = address(uint160(uint256(log.topics[2])));
        (uint64 index, int128 value, uint8 decimals,,,,,) =
            abi.decode(log.data, (uint64, int128, uint8, string, string, string, string, bytes32));

        bytes32 fk = feedbackKey(chainKey, agentId, client, index);
        if (feedbacks[fk].exists) return;
        feedbacks[fk] = FeedbackRec({exists: true, revoked: false, value: value, decimals: decimals, height: height});

        bytes32 pk = pairKey(chainKey, agentId, client);
        PairRec storage pr = pairs[pk];
        if (!pr.known) {
            pr.known = true;
            _clients[agentKey(chainKey, agentId)].push(client);
        }
        if (index > pr.maxIndex) pr.maxIndex = index;
        pr.provenCount += 1;
        if (value < 0) pr.negatives += 1;
        if (pr.firstFeedbackHeight == 0 || height < pr.firstFeedbackHeight) pr.firstFeedbackHeight = height;
        emit FeedbackRecorded(chainKey, agentId, client, index, value);
    }

    function _onRevoked(uint64 chainKey, EvmV1Decoder.LogEntry memory log) internal {
        uint256 agentId = uint256(log.topics[1]);
        address client = address(uint160(uint256(log.topics[2])));
        uint64 index = uint64(uint256(log.topics[3]));
        bytes32 fk = feedbackKey(chainKey, agentId, client, index);
        FeedbackRec storage f = feedbacks[fk];
        if (!f.exists) {
            // revocation proven before the feedback itself: record the tombstone so a later
            // feedback proof cannot count it.
            f.exists = true;
            f.revoked = true;
            PairRec storage pr0 = pairs[pairKey(chainKey, agentId, client)];
            if (!pr0.known) {
                pr0.known = true;
                _clients[agentKey(chainKey, agentId)].push(client);
            }
            if (index > pr0.maxIndex) pr0.maxIndex = index;
            pr0.provenCount += 1;
            emit FeedbackRevokedRecorded(chainKey, agentId, client, index);
            return;
        }
        if (f.revoked) return;
        f.revoked = true;
        if (f.value < 0) pairs[pairKey(chainKey, agentId, client)].negatives -= 1;
        emit FeedbackRevokedRecorded(chainKey, agentId, client, index);
    }

    function _onRegistered(uint64 chainKey, uint64 height, bytes32 txKey, address registrant, EvmV1Decoder.LogEntry memory log)
        internal
    {
        uint256 agentId = uint256(log.topics[1]);
        address owner = address(uint160(uint256(log.topics[2])));
        (string memory uri) = abi.decode(log.data, (string));
        bytes32 uriHash = keccak256(bytes(uri));
        bytes32 ak = agentKey(chainKey, agentId);
        AgentRec storage a = agents[ak];
        if (a.exists) return;
        a.exists = true;
        a.owner = owner;
        a.registrant = registrant;
        a.uriHash = uriHash;
        a.registeredHeight = height;
        a.txKey = txKey;
        ownerAgentCount[addrKey(chainKey, owner)] += 1;
        registrantAgentCount[addrKey(chainKey, registrant)] += 1;
        bytes32 uk = uriKey(chainKey, uriHash);
        uriCount[uk] += 1;
        if (uriFirstHeight[uk] == 0 || height < uriFirstHeight[uk]) uriFirstHeight[uk] = height;
        emit AgentRecorded(chainKey, agentId, owner, uriHash);
    }

    function _onTransfer(uint64 chainKey, EvmV1Decoder.LogEntry memory log) internal {
        address from = address(uint160(uint256(log.topics[1])));
        address to = address(uint160(uint256(log.topics[2])));
        uint256 agentId = uint256(log.topics[3]);
        if (from == address(0)) return; // mint is covered by Registered
        AgentRec storage a = agents[agentKey(chainKey, agentId)];
        if (!a.exists) return; // ownership history only tracked for proven registrations
        a.transfersProven += 1;
        if (a.owner == from) {
            ownerAgentCount[addrKey(chainKey, from)] -= 1;
            ownerAgentCount[addrKey(chainKey, to)] += 1;
            a.owner = to;
        }
        emit AgentTransferred(chainKey, agentId, from, to);
    }

    // ---- views -----------------------------------------------------------------------------
    function clientsOf(uint64 chainKey, uint256 agentId) external view returns (address[] memory) {
        return _clients[agentKey(chainKey, agentId)];
    }

    function reviewerOwnsAgents(uint64 chainKey, address client) public view returns (uint64) {
        return ownerAgentCount[addrKey(chainKey, client)];
    }

    /// @notice Reviewer seniority facts. `age` is 0 when nothing older than the first feedback is proven.
    function reviewerSeniority(uint64 chainKey, uint256 agentId, address client)
        public
        view
        returns (uint64 age, uint32 depth)
    {
        bytes32 k = addrKey(chainKey, client);
        uint64 oldest = oldestHeight[k];
        uint64 first = pairs[pairKey(chainKey, agentId, client)].firstFeedbackHeight;
        if (oldest != 0 && first > oldest) age = first - oldest;
        depth = bucketCount[k];
    }

    /// @notice Facts for one agent under consumer-chosen thresholds. Pure aggregation, no weights.
    /// @param minAge   minimum blocks between the reviewer's oldest proven tx and its first feedback
    /// @param minDepth minimum number of distinct ~30-day activity buckets proven for the reviewer
    function facts(uint64 chainKey, uint256 agentId, uint64 minAge, uint32 minDepth)
        external
        view
        returns (Facts memory f)
    {
        bytes32 ak = agentKey(chainKey, agentId);
        AgentRec storage a = agents[ak];
        address[] storage cl = _clients[ak];
        f.breadthRaw = uint64(cl.length);
        uint256 n = cl.length;
        if (n > MAX_CLIENTS_PER_QUERY) { n = MAX_CLIENTS_PER_QUERY; f.truncated = true; }
        for (uint256 i; i < n; i++) {
            address c = cl[i];
            PairRec storage pr = pairs[pairKey(chainKey, agentId, c)];
            if (pr.maxIndex > pr.provenCount) f.gapCount += 1;
            f.negatives += pr.negatives;
            (uint64 age, uint32 depth) = reviewerSeniority(chainKey, agentId, c);
            bool grounded = age >= minAge && depth >= minDepth && (minAge == 0 || age > 0);
            if (grounded) f.breadthGrounded += 1;
            if (reviewerOwnsAgents(chainKey, c) == 0 && (!a.exists || c != a.owner)) f.breadthIndependent += 1;
        }
        if (a.exists) {
            uint64 sameOwner = ownerAgentCount[addrKey(chainKey, a.owner)];
            f.cloneDensityLB = sameOwner > 0 ? sameOwner - 1 : 0;
            uint64 sameReg = registrantAgentCount[addrKey(chainKey, a.registrant)];
            f.registrantSiblings = sameReg > 0 ? sameReg - 1 : 0;
            bytes32 uk = uriKey(chainKey, a.uriHash);
            uint64 uc = uriCount[uk];
            f.uriSiblings = uc > 0 ? uc - 1 : 0;
            f.firstRegisteredHeight = uriFirstHeight[uk];
            uint64 inTx = txRegisteredCount[a.txKey];
            f.sameTxSiblings = inTx > 0 ? inTx - 1 : 0;
        }
    }
}
