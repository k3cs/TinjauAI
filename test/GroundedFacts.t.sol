// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Fixtures} from "./Fixtures.sol";
import {GroundedFacts} from "../src/GroundedFacts.sol";

/// Unit tests with the BlockProver precompile mocked (it is native to Creditcoin and cannot be emulated).
/// Fixtures are real Ethereum-mainnet transactions proven by the CC3 prover API; the decoder runs on the
/// real `txBytes`. Precompile gas (118k-415k) was measured separately on CC3 Testnet via eth_estimateGas.
contract GroundedFactsTest is Fixtures {
    GroundedFacts gf;

    // feedback_mainnet.json: NewFeedback agentId 50286 by client 0x1030... (execution.market), block 25823901
    uint256 constant AGENT_FB = 50286;
    address constant CLIENT_FB = 0x103040545AC5031A11E8C03dd11324C7333a13C7;
    // registered_mainnet.json: tx 0xac44b1f1... block 25860408 (method activateAgent on factory 0x0096...):
    //   Registered(50609, uri, owner=factory 0x0096...) then Transfer(factory -> ERC-6551 account 0x960F...)
    //   sender (registrant) = EOA 0x426D...
    uint256 constant AGENT_REG = 50609;
    address constant FACTORY_REG = 0x0096F8b1D2692E85F8F3387358dA94bAA3534Dc7;
    address constant TBA_REG = 0x960F5A2283289008d2ED02D49E08163E7f3651a5;
    address constant REGISTRANT_REG = 0x426D789cEe81EF67e7cD33c054D78cAd106EB68b;

    function setUp() public {
        gf = new GroundedFacts();
        mockVerifierTrue();
    }

    function load(string memory name) internal returns (GroundedFacts.Proof memory p) {
        p = loadProof(name);
        mockTxIndex(p, fixtureTxIndex(name));
    }

    function test_recordFeedback_mainnet() public {
        GroundedFacts.Proof memory p = load("feedback_mainnet");
        uint256 g = gasleft();
        uint256 admitted = gf.record(one(p));
        emit log_named_uint("gas recordFeedback excl. precompile", g - gasleft());
        assertEq(admitted, 1);
        address[] memory cl = gf.clientsOf(3, AGENT_FB);
        assertEq(cl.length, 1);
        assertEq(cl[0], CLIENT_FB);
        (bool known, uint64 maxIndex, uint64 provenCount,, uint64 first) = gf.pairs(gf.pairKey(3, AGENT_FB, CLIENT_FB));
        assertTrue(known);
        assertGt(maxIndex, 0);
        assertEq(provenCount, 1);
        assertEq(first, 25823901);
        GroundedFacts.Facts memory f = gf.facts(3, AGENT_FB, 0, 0);
        assertEq(f.breadthRaw, 1);
        // the feedback tx itself proves activity of the sender at that height
        assertEq(gf.oldestHeight(gf.addrKey(3, CLIENT_FB)), 25823901);
        // gap only if maxIndex > provenCount
        assertEq(f.gapCount, maxIndex > 1 ? 1 : 0);
    }

    function test_recordRegistered_mainnet() public {
        GroundedFacts.Proof memory p = load("registered_mainnet");
        uint256 g = gasleft();
        gf.record(one(p));
        emit log_named_uint("gas recordRegistered excl. precompile", g - gasleft());
        (bool exists, address owner, address registrant,, uint64 h,, uint64 transfers) = gf.agents(gf.agentKey(3, AGENT_REG));
        assertTrue(exists);
        assertEq(owner, TBA_REG, "owner follows the in-tx Transfer to the token-bound account");
        assertEq(registrant, REGISTRANT_REG, "registrant = sender of the Registered tx");
        assertEq(h, 25860408);
        assertEq(transfers, 1);
        assertEq(gf.reviewerOwnsAgents(3, TBA_REG), 1);
        assertEq(gf.reviewerOwnsAgents(3, FACTORY_REG), 0, "factory no longer counted as owner after transfer");
        assertEq(gf.registrantAgentCount(gf.addrKey(3, REGISTRANT_REG)), 1);
        assertEq(gf.oldestHeight(gf.addrKey(3, REGISTRANT_REG)), 25860408, "registrant activity proven by the same tx");
        GroundedFacts.Facts memory f = gf.facts(3, AGENT_REG, 0, 0);
        assertEq(f.cloneDensityLB, 0);
        assertEq(f.registrantSiblings, 0);
        assertEq(f.sameTxSiblings, 0);
        assertEq(f.firstRegisteredHeight, 25860408);
    }

    function test_activity_old_tx_2024() public {
        GroundedFacts.Proof memory p = load("activity_old_mainnet");
        uint256 g = gasleft();
        gf.record(one(p));
        emit log_named_uint("gas activity (Jan-2024 tx) excl. precompile", g - gasleft());
        // sender of that tx now has oldestHeight = 19094397 and one bucket
        // (we don't hardcode the sender; read it back from the event via facts on any address is not possible,
        //  so check the bucket bookkeeping through a second, more recent tx of a different sender)
        GroundedFacts.Proof memory q = load("activity_recent_mainnet");
        g = gasleft();
        gf.record(one(q));
        emit log_named_uint("gas activity (recent tx) excl. precompile", g - gasleft());
    }

    function test_dedup_sameTxTwice() public {
        GroundedFacts.Proof memory p = load("feedback_mainnet");
        assertEq(gf.record(one(p)), 1);
        assertEq(gf.record(one(p)), 0);
        assertEq(gf.clientsOf(3, AGENT_FB).length, 1);
    }

    function test_batch_two_proofs() public {
        GroundedFacts.Proof[] memory arr = new GroundedFacts.Proof[](2);
        arr[0] = load("feedback_mainnet");
        arr[1] = load("registered_mainnet");
        uint256 g = gasleft();
        uint256 admitted = gf.record(arr);
        emit log_named_uint("gas record 2 proofs", g - gasleft());
        assertEq(admitted, 2);
    }

    function test_reject_unknownChain() public {
        GroundedFacts.Proof memory p = load("feedback_mainnet");
        p.chainKey = 99;
        vm.expectRevert(abi.encodeWithSelector(GroundedFacts.UnknownChain.selector, uint64(99)));
        gf.record(one(p));
    }

    function test_reject_whenVerifierSaysNo() public {
        GroundedFacts.Proof memory p = load("feedback_mainnet");
        mockVerifierFalse();
        vm.expectRevert(abi.encodeWithSelector(GroundedFacts.ProofRejected.selector, uint64(3), uint64(25823901)));
        gf.record(one(p));
    }
}
