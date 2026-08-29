// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {GroundedFacts} from "../src/GroundedFacts.sol";
import {INativeQueryVerifier} from "usc/INativeQueryVerifier.sol";

abstract contract Fixtures is Test {
    struct Sib {
        bytes32 hash;
        bool isLeft;
    }

    /// Load a CC3 prover-API response (proof-by-tx) into a GroundedFacts.Proof.
    function loadProof(string memory name) internal view returns (GroundedFacts.Proof memory p) {
        string memory json = vm.readFile(string.concat("test/fixtures/", name, ".json"));
        p.chainKey = uint64(vm.parseJsonUint(json, ".chainKey"));
        p.height = uint64(vm.parseJsonUint(json, ".headerNumber"));
        p.encodedTx = vm.parseJsonBytes(json, ".txBytes");
        p.merkle.root = vm.parseJsonBytes32(json, ".merkleProof.root");
        Sib[] memory sibs = abi.decode(vm.parseJson(json, ".merkleProof.siblings"), (Sib[]));
        p.merkle.siblings = new INativeQueryVerifier.MerkleProofEntry[](sibs.length);
        for (uint256 i; i < sibs.length; i++) {
            p.merkle.siblings[i] = INativeQueryVerifier.MerkleProofEntry({hash: sibs[i].hash, isLeft: sibs[i].isLeft});
        }
        p.continuity.lowerEndpointDigest = vm.parseJsonBytes32(json, ".continuityProof.lowerEndpointDigest");
        p.continuity.roots = vm.parseJsonBytes32Array(json, ".continuityProof.roots");
    }

    address constant PRECOMPILE = 0x0000000000000000000000000000000000000FD2;
    bytes4 constant SEL_VERIFY = bytes4(keccak256("verify(uint64,uint64,bytes,(bytes32,(bytes32,bool)[]),(bytes32,bytes32[]))"));
    bytes4 constant SEL_TXINDEX = bytes4(keccak256("calculateTxIndex((bytes32,(bytes32,bool)[]))"));

    /// The BlockProver precompile is native to Creditcoin and cannot be emulated by Foundry.
    /// For unit tests we etch a stub and mock `verify` -> true and `calculateTxIndex` -> fixture txIndex.
    function mockVerifierTrue() internal {
        vm.etch(PRECOMPILE, hex"00");
        vm.mockCall(PRECOMPILE, abi.encodeWithSelector(SEL_VERIFY), abi.encode(true));
    }

    function mockVerifierFalse() internal {
        vm.etch(PRECOMPILE, hex"00");
        vm.mockCall(PRECOMPILE, abi.encodeWithSelector(SEL_VERIFY), abi.encode(false));
    }

    function mockTxIndex(GroundedFacts.Proof memory p, uint64 txIndex) internal {
        vm.mockCall(PRECOMPILE, abi.encodeWithSelector(SEL_TXINDEX, p.merkle), abi.encode(txIndex));
    }

    function fixtureTxIndex(string memory name) internal view returns (uint64) {
        string memory json = vm.readFile(string.concat("test/fixtures/", name, ".json"));
        return uint64(vm.parseJsonUint(json, ".txIndex"));
    }

    function one(GroundedFacts.Proof memory p) internal pure returns (GroundedFacts.Proof[] memory arr) {
        arr = new GroundedFacts.Proof[](1);
        arr[0] = p;
    }
}
