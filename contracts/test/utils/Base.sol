// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {EvmV1Decoder} from "usc/EvmV1Decoder.sol";
import {INativeQueryVerifier} from "usc/INativeQueryVerifier.sol";
import {GroundedFacts} from "../../src/GroundedFacts.sol";
import {IChainInfo, Precompiles} from "../../src/interfaces/IPrecompiles.sol";

/// @dev Stand-in for the BlockProver precompile. Foundry cannot run the real one, so tests use
/// real prover txBytes (fixtures) or synthetic ones with this mock; live behaviour is checked on
/// CC3 testnet. `root == REJECT` fails verification; the tx index is the low 32 bits of the root.
contract MockBlockProver {
    bytes32 public constant REJECT = bytes32(type(uint256).max);

    function verify(
        uint64,
        uint64,
        bytes calldata,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata
    ) external pure returns (bool) {
        if (merkleProof.root == REJECT) revert("invalid proof");
        return true;
    }

    function calculateTxIndex(INativeQueryVerifier.MerkleProof calldata merkleProof) external pure returns (uint64) {
        return uint64(uint32(uint256(merkleProof.root)));
    }
}

contract MockChainInfo {
    mapping(uint64 => uint64) public tip;

    function setTip(uint64 chainKey, uint64 height) external {
        tip[chainKey] = height;
    }

    function get_latest_attestation_height_and_hash(uint64 chainKey)
        external
        view
        returns (IChainInfo.HeightHashResult memory r)
    {
        r.height = tip[chainKey];
        r.exists = r.height != 0;
        r.isAttestation = true;
    }
}

contract MockAttestorStash {
    mapping(uint64 => uint256) public count;

    function setCount(uint64 chainKey, uint256 c) external {
        count[chainKey] = c;
    }

    function getAttestorsCount(uint64 chainKey) external view returns (uint256) {
        return count[chainKey];
    }

    function getMinBondRequirement(uint64) external pure returns (uint256) {
        return 100 ether;
    }
}

abstract contract Base is Test {
    // ERC-8004 registries (docs/legacy/02-teknis.md §1; mainnet = chainKey 3, Sepolia = chainKey 1 on CC3 testnet)
    address internal constant ID_MAIN = 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432;
    address internal constant REP_MAIN = 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63;
    address internal constant ID_SEP = 0x8004A818BFB912233c491871b3d84c89A494BD9e;
    address internal constant REP_SEP = 0x8004B663056A597Dffe9eCcC1965A193B7388713;
    uint64 internal constant MAIN = 3;
    uint64 internal constant SEP = 1;

    bytes32 internal constant NEW_FEEDBACK =
        keccak256("NewFeedback(uint256,address,uint64,int128,uint8,string,string,string,string,string,bytes32)");
    bytes32 internal constant FEEDBACK_REVOKED = keccak256("FeedbackRevoked(uint256,address,uint64)");
    bytes32 internal constant REGISTERED = keccak256("Registered(uint256,string,address)");
    bytes32 internal constant TRANSFER = keccak256("Transfer(address,address,uint256)");

    GroundedFacts internal facts;
    MockChainInfo internal chainInfo;
    MockAttestorStash internal stash;
    uint32 internal nextTxIndex = 1;

    function setUp() public virtual {
        vm.etch(Precompiles.BLOCK_PROVER, address(new MockBlockProver()).code);
        vm.etch(Precompiles.CHAIN_INFO, address(new MockChainInfo()).code);
        vm.etch(Precompiles.ATTESTOR_STASH, address(new MockAttestorStash()).code);
        chainInfo = MockChainInfo(Precompiles.CHAIN_INFO);
        stash = MockAttestorStash(Precompiles.ATTESTOR_STASH);
        stash.setCount(MAIN, 4);
        stash.setCount(SEP, 7);

        GroundedFacts.Registry[] memory regs = new GroundedFacts.Registry[](2);
        regs[0] = GroundedFacts.Registry(SEP, ID_SEP, REP_SEP);
        regs[1] = GroundedFacts.Registry(MAIN, ID_MAIN, REP_MAIN);
        facts = new GroundedFacts(regs);
    }

    // ----------------------------------------------------------- tx builders

    function _encodeTx(address from, uint8 status, EvmV1Decoder.LogEntryTuple[] memory logs)
        internal
        pure
        returns (bytes memory)
    {
        bytes[] memory chunks = new bytes[](3);
        chunks[0] = abi.encode(uint64(1), uint64(100_000), from, false, address(0xBEEF), uint256(0), bytes(""));
        EvmV1Decoder.AccessListEntryBytes32[] memory al;
        chunks[1] = abi.encode(uint64(1), uint128(1), uint128(1), al, uint8(0), bytes32(0), bytes32(0));
        chunks[2] = abi.encode(status, uint64(100_000), logs, bytes(""));
        return abi.encode(uint8(2), chunks);
    }

    function _proof(uint64 chainKey, uint64 height, bytes memory encodedTx)
        internal
        returns (GroundedFacts.Proof memory p)
    {
        p.chainKey = chainKey;
        p.height = height;
        p.encodedTx = encodedTx;
        p.merkleProof.root = bytes32(uint256(nextTxIndex++));
    }

    function _record(GroundedFacts.Proof memory p) internal returns (uint256) {
        GroundedFacts.Proof[] memory ps = new GroundedFacts.Proof[](1);
        ps[0] = p;
        return facts.record(ps);
    }

    function _logs1(EvmV1Decoder.LogEntryTuple memory a) internal pure returns (EvmV1Decoder.LogEntryTuple[] memory l) {
        l = new EvmV1Decoder.LogEntryTuple[](1);
        l[0] = a;
    }

    function _noLogs() internal pure returns (EvmV1Decoder.LogEntryTuple[] memory l) {}

    function _feedbackLog(address rep, uint256 agentId, address client, uint64 index, int128 value)
        internal
        pure
        returns (EvmV1Decoder.LogEntryTuple memory l)
    {
        l.address_ = rep;
        l.topics = new bytes32[](4);
        l.topics[0] = NEW_FEEDBACK;
        l.topics[1] = bytes32(agentId);
        l.topics[2] = bytes32(uint256(uint160(client)));
        l.topics[3] = keccak256("starred");
        l.data = abi.encode(index, value, uint8(0), "starred", "", "https://agent.example", "ipfs://fb", bytes32(0));
    }

    function _revokeLog(address rep, uint256 agentId, address client, uint64 index)
        internal
        pure
        returns (EvmV1Decoder.LogEntryTuple memory l)
    {
        l.address_ = rep;
        l.topics = new bytes32[](4);
        l.topics[0] = FEEDBACK_REVOKED;
        l.topics[1] = bytes32(agentId);
        l.topics[2] = bytes32(uint256(uint160(client)));
        l.topics[3] = bytes32(uint256(index));
    }

    function _registeredLog(address id, uint256 agentId, string memory uri, address owner)
        internal
        pure
        returns (EvmV1Decoder.LogEntryTuple memory l)
    {
        l.address_ = id;
        l.topics = new bytes32[](3);
        l.topics[0] = REGISTERED;
        l.topics[1] = bytes32(agentId);
        l.topics[2] = bytes32(uint256(uint160(owner)));
        l.data = abi.encode(uri);
    }

    function _transferLog(address id, address from, address to, uint256 agentId)
        internal
        pure
        returns (EvmV1Decoder.LogEntryTuple memory l)
    {
        l.address_ = id;
        l.topics = new bytes32[](4);
        l.topics[0] = TRANSFER;
        l.topics[1] = bytes32(uint256(uint160(from)));
        l.topics[2] = bytes32(uint256(uint160(to)));
        l.topics[3] = bytes32(agentId);
    }

    // ----------------------------------------------------------- scenario helpers

    function _review(uint64 height, uint256 agentId, address client, uint64 index, int128 value) internal {
        _record(_proof(MAIN, height, _encodeTx(client, 1, _logs1(_feedbackLog(REP_MAIN, agentId, client, index, value)))));
    }

    function _activity(uint64 height, address who) internal {
        _record(_proof(MAIN, height, _encodeTx(who, 1, _noLogs())));
    }

    function _register(uint64 height, address sender, uint256 agentId, string memory uri, address owner) internal {
        _record(_proof(MAIN, height, _encodeTx(sender, 1, _logs1(_registeredLog(ID_MAIN, agentId, uri, owner)))));
    }

    function _loadFixture(string memory name) internal view returns (GroundedFacts.Proof memory p) {
        bytes memory raw = vm.parseBytes(vm.readFile(string.concat("test/fixtures/", name, ".hex")));
        p = abi.decode(raw, (GroundedFacts.Proof));
    }
}
