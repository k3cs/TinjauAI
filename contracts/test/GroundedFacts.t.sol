// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {EvmV1Decoder} from "usc/EvmV1Decoder.sol";
import {GroundedFacts} from "../src/GroundedFacts.sol";
import {IAgentFacts} from "../src/interfaces/IAgentFacts.sol";
import {Base, MockBlockProver} from "./utils/Base.sol";
import {Precompiles} from "../src/interfaces/IPrecompiles.sol";

contract GroundedFactsTest is Base {
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");
    address internal owner = makeAddr("owner");

    // ------------------------------------------------------------ proof path

    function test_rejectsUnknownChain() public {
        GroundedFacts.Proof memory p = _proof(9, 100, _encodeTx(alice, 1, _noLogs()));
        vm.expectRevert(abi.encodeWithSelector(GroundedFacts.UnknownChain.selector, uint64(9)));
        _record(p);
    }

    function test_rejectsInvalidProof() public {
        GroundedFacts.Proof memory p = _proof(MAIN, 100, _encodeTx(alice, 1, _noLogs()));
        p.merkleProof.root = MockBlockProver(address(0x0FD2)).REJECT();
        vm.expectRevert(abi.encodeWithSelector(GroundedFacts.ProofRejected.selector, uint256(0)));
        _record(p);
    }

    function test_duplicateIsSkippedNotReverted() public {
        GroundedFacts.Proof memory p = _proof(MAIN, 100, _encodeTx(alice, 1, _logs1(_feedbackLog(REP_MAIN, 7, alice, 1, 80))));
        assertEq(_record(p), 1);
        assertEq(_record(p), 0);
        assertEq(facts.pairOf(MAIN, 7, alice).known, 1);
    }

    function test_ignoresLogsFromOtherEmitters() public {
        address fake = makeAddr("fakeRegistry");
        _record(_proof(MAIN, 100, _encodeTx(alice, 1, _logs1(_feedbackLog(fake, 7, alice, 1, 80)))));
        assertEq(facts.facts(MAIN, 7, 0, 0).breadthRaw, 0);
        // a Sepolia registry log inside a mainnet proof is foreign too
        _record(_proof(MAIN, 101, _encodeTx(alice, 1, _logs1(_feedbackLog(REP_SEP, 7, alice, 1, 80)))));
        assertEq(facts.facts(MAIN, 7, 0, 0).breadthRaw, 0);
    }

    function test_revertedTxCountsActivityButNotLogs() public {
        _record(_proof(MAIN, 100, _encodeTx(alice, 0, _logs1(_feedbackLog(REP_MAIN, 7, alice, 1, 80)))));
        assertEq(facts.facts(MAIN, 7, 0, 0).breadthRaw, 0);
        assertEq(facts.reviewerSeniority(MAIN, alice).oldest, 100);
    }

    // ------------------------------------------------------------ reviews

    function test_gapBelowHighestIndex() public {
        _review(100, 7, alice, 1, 80);
        _review(300, 7, alice, 3, 90);
        IAgentFacts.Facts memory f = facts.facts(MAIN, 7, 0, 0);
        assertEq(f.breadthRaw, 1);
        assertEq(f.gapCount, 1);
        _review(200, 7, alice, 2, 70);
        assertEq(facts.facts(MAIN, 7, 0, 0).gapCount, 0);
    }

    function test_negativeThenRevoke() public {
        _review(100, 7, alice, 1, -50);
        assertEq(facts.facts(MAIN, 7, 0, 0).negatives, 1);
        _record(_proof(MAIN, 110, _encodeTx(alice, 1, _logs1(_revokeLog(REP_MAIN, 7, alice, 1)))));
        IAgentFacts.Facts memory f = facts.facts(MAIN, 7, 0, 0);
        assertEq(f.negatives, 0);
        assertEq(f.breadthRaw, 0);
        assertEq(f.gapCount, 0);
    }

    function test_revokeProvenBeforeReview() public {
        _record(_proof(MAIN, 110, _encodeTx(alice, 1, _logs1(_revokeLog(REP_MAIN, 7, alice, 2)))));
        // index 2 known via the revocation; index 1 missing -> gap
        assertEq(facts.facts(MAIN, 7, 0, 0).gapCount, 1);
        _review(100, 7, alice, 2, -10);
        IAgentFacts.Facts memory f = facts.facts(MAIN, 7, 0, 0);
        assertEq(f.negatives, 0, "revoked review is not negative");
        assertEq(f.breadthRaw, 0);
        assertEq(facts.pairOf(MAIN, 7, alice).known, 1, "same index counted once");
    }

    // ------------------------------------------------------------ seniority

    function test_groundedRequiresEveryIndexProven() public {
        _activity(1_000, alice);
        _activity(300_000, alice);
        _review(900_000, 7, alice, 2, 80); // index 1 unproven
        assertEq(facts.facts(MAIN, 7, 500_000, 2).breadthGrounded, 0);
        _review(850_000, 7, alice, 1, 80);
        assertEq(facts.facts(MAIN, 7, 500_000, 2).breadthGrounded, 1);
    }

    function test_groundedNeedsAgeAndDepth() public {
        _activity(1_000, alice); // bucket 0
        _activity(300_000, alice); // bucket 1
        _review(700_000, 7, alice, 1, 80); // bucket 3
        _review(700_000, 7, bob, 1, 80); // bob: no history before the review

        IAgentFacts.Facts memory f = facts.facts(MAIN, 7, 500_000, 3);
        assertEq(f.breadthRaw, 2);
        assertEq(f.breadthGrounded, 1);
        assertEq(facts.facts(MAIN, 7, 500_000, 4).breadthGrounded, 0, "depth 3 buckets only");
        assertEq(facts.facts(MAIN, 7, 800_000, 1).breadthGrounded, 0, "not old enough");
    }

    function test_reviewViaRelayerStaysUngrounded() public {
        address relayer = makeAddr("relayer");
        _activity(1_000, relayer);
        _record(_proof(MAIN, 700_000, _encodeTx(relayer, 1, _logs1(_feedbackLog(REP_MAIN, 7, alice, 1, 80)))));
        IAgentFacts.Facts memory f = facts.facts(MAIN, 7, 0, 0);
        assertEq(f.breadthRaw, 1);
        assertEq(f.breadthGrounded, 0);
    }

    function test_oldestIsMinimumAcrossProofOrder() public {
        _activity(500_000, alice);
        _activity(10, alice);
        _activity(400_000, alice);
        GroundedFacts.Activity memory a = facts.reviewerSeniority(MAIN, alice);
        assertEq(a.oldest, 10);
        assertEq(a.buckets, 3, "heights 10, 400k, 500k fall in buckets 0, 1, 2");
        _activity(420_000, alice);
        assertEq(facts.reviewerSeniority(MAIN, alice).buckets, 3, "same bucket counted once");
    }

    // ------------------------------------------------------------ provenance

    function test_registrationAndCloneDensity() public {
        _register(100, alice, 1, "ipfs://a", owner);
        _register(101, alice, 2, "ipfs://a", owner);
        _register(102, bob, 3, "", owner);
        IAgentFacts.Facts memory f = facts.facts(MAIN, 1, 0, 0);
        assertEq(f.cloneDensityLB, 2);
        assertEq(f.registrantSiblings, 1);
        assertEq(f.uriSiblings, 1);
        assertEq(f.sameTxSiblings, 0);
        assertEq(f.firstRegisteredHeight, 100);
        assertEq(facts.facts(MAIN, 3, 0, 0).uriSiblings, 0, "empty URI is not a sibling signal");
        assertEq(facts.reviewerOwnsAgents(MAIN, owner), 3);
        assertTrue(facts.isRegistered(MAIN, 3));
        assertFalse(facts.isRegistered(MAIN, 4));
    }

    function test_mintTransferIgnoredRegisteredCarriesOwner() public {
        EvmV1Decoder.LogEntryTuple[] memory l = new EvmV1Decoder.LogEntryTuple[](2);
        l[0] = _transferLog(ID_MAIN, address(0), owner, 5);
        l[1] = _registeredLog(ID_MAIN, 5, "ipfs://x", owner);
        _record(_proof(MAIN, 100, _encodeTx(alice, 1, l)));
        assertEq(facts.ownerOf(MAIN, 5), owner);
        assertEq(facts.agentOf(MAIN, 5).registrant, alice);
        assertEq(facts.agentOf(MAIN, 5).transfersProven, 0);
    }

    function test_factoryPatternFollowsFinalOwner() public {
        address factory = makeAddr("factory");
        address tba = makeAddr("tba");
        EvmV1Decoder.LogEntryTuple[] memory l = new EvmV1Decoder.LogEntryTuple[](3);
        l[0] = _transferLog(ID_MAIN, address(0), factory, 5);
        l[1] = _registeredLog(ID_MAIN, 5, "ipfs://x", factory);
        l[2] = _transferLog(ID_MAIN, factory, tba, 5);
        _record(_proof(MAIN, 100, _encodeTx(alice, 1, l)));
        assertEq(facts.ownerOf(MAIN, 5), tba);
        assertEq(facts.reviewerOwnsAgents(MAIN, factory), 0);
        assertEq(facts.reviewerOwnsAgents(MAIN, tba), 1);
    }

    function test_newestTransferWinsWhateverTheProofOrder() public {
        _register(100, alice, 5, "ipfs://x", alice);
        // alice -> bob at 200, bob -> alice at 300; prove the later one first
        _record(_proof(MAIN, 300, _encodeTx(bob, 1, _logs1(_transferLog(ID_MAIN, bob, alice, 5)))));
        _record(_proof(MAIN, 200, _encodeTx(alice, 1, _logs1(_transferLog(ID_MAIN, alice, bob, 5)))));
        assertEq(facts.ownerOf(MAIN, 5), alice);
        assertEq(facts.reviewerOwnsAgents(MAIN, bob), 0);
        assertEq(facts.reviewerOwnsAgents(MAIN, alice), 1);
    }

    function test_transferBeforeRegistrationIsIgnored() public {
        _record(_proof(MAIN, 200, _encodeTx(alice, 1, _logs1(_transferLog(ID_MAIN, alice, bob, 5)))));
        assertFalse(facts.isRegistered(MAIN, 5));
        assertEq(facts.reviewerOwnsAgents(MAIN, bob), 0);
    }

    function test_reviewerWhoOwnsAgentsIsNotIndependent() public {
        _register(100, alice, 1, "", alice);
        _review(200, 9, alice, 1, 80);
        _review(200, 9, bob, 1, 80);
        IAgentFacts.Facts memory f = facts.facts(MAIN, 9, 0, 0);
        assertEq(f.breadthRaw, 2);
        assertEq(f.breadthIndependent, 1);
    }

    // ------------------------------------------------------------ attestation context

    function test_coveredThroughAndWeakestAttestorSet() public {
        _review(1_000, 7, alice, 1, 80);
        stash.setCount(MAIN, 2);
        _review(2_000, 7, bob, 1, 80);
        stash.setCount(MAIN, 9);
        _review(1_500, 7, carol, 1, 80);
        IAgentFacts.Facts memory f = facts.facts(MAIN, 7, 0, 0);
        assertEq(f.coveredThrough, 2_000);
        assertEq(f.minAttestors, 2);
    }

    function test_attestedTip() public {
        chainInfo.setTip(MAIN, 25_955_030);
        assertEq(facts.attestedTip(MAIN), 25_955_030);
        assertEq(facts.attestedTip(SEP), 0);
    }

    function test_truncatesAfterCap() public {
        uint256 n = facts.MAX_REVIEWERS() + 1;
        for (uint256 i; i < n; ++i) {
            _review(100, 7, address(uint160(0x1000 + i)), 1, 80);
        }
        IAgentFacts.Facts memory f = facts.facts(MAIN, 7, 0, 0);
        assertTrue(f.truncated);
        assertEq(f.breadthRaw, facts.MAX_REVIEWERS());
    }

    function test_constructorRejectsDuplicateChainKey() public {
        GroundedFacts.Registry[] memory regs = new GroundedFacts.Registry[](2);
        regs[0] = GroundedFacts.Registry(MAIN, ID_MAIN, REP_MAIN);
        regs[1] = GroundedFacts.Registry(MAIN, ID_SEP, REP_SEP);
        vm.expectRevert(GroundedFacts.BadRegistry.selector);
        new GroundedFacts(regs);
    }

    // ------------------------------------------------------------ real prover txBytes

    function test_fixture_mainnetFeedback() public {
        GroundedFacts.Proof memory p = _loadFixture("mainnet-feedback");
        assertEq(p.chainKey, 3);
        assertEq(p.height, 25_823_901);
        assertEq(_record(p), 1);
        address client = 0x103040545AC5031A11E8C03dd11324C7333a13C7;
        GroundedFacts.Pair memory pair = facts.pairOf(MAIN, 50286, client);
        assertEq(pair.maxIndex, 24);
        assertEq(pair.known, 1);
        assertEq(pair.active, 1);
        IAgentFacts.Facts memory f = facts.facts(MAIN, 50286, 0, 0);
        assertEq(f.breadthRaw, 1);
        assertEq(f.gapCount, 1, "indices 1..23 unproven");
        assertEq(f.minAttestors, 4);
        assertEq(facts.reviewerSeniority(MAIN, client).oldest, 25_823_901);
    }

    function test_fixture_oldActivityGroundsReviewer() public {
        _record(_loadFixture("mainnet-feedback"));
        _record(_loadFixture("mainnet-activity-old"));
        address client = 0x103040545AC5031A11E8C03dd11324C7333a13C7;
        assertEq(facts.reviewerSeniority(MAIN, client).oldest, 23_779_699);
        // Only index 24 of this reviewer is proven (1..23 missing), so the reviewer is not grounded
        // however old the wallet is: the proven review may not be their first.
        assertEq(facts.facts(MAIN, 50286, 0, 0).breadthGrounded, 0);
    }

    function test_fixture_massRegistration() public {
        uint256 gasBefore = gasleft();
        _record(_loadFixture("mainnet-mass-registration"));
        emit log_named_uint("gas: record 52 KB mass-registration tx (precompile mocked)", gasBefore - gasleft());
        address holder = 0xde152AfB7db5373F34876E1499fbD893A82dD336;
        address sender = 0x99d4022C46DFd73f65Bc2a25F301158881394592;
        assertEq(facts.ownerOf(MAIN, 41885), holder);
        assertEq(facts.agentOf(MAIN, 41885).registrant, sender);
        IAgentFacts.Facts memory f = facts.facts(MAIN, 41885, 0, 0);
        assertEq(f.sameTxSiblings, 9);
        assertEq(f.cloneDensityLB, 9);
        assertEq(f.registrantSiblings, 9);
        assertEq(facts.reviewerOwnsAgents(MAIN, holder), 10);
    }

    function test_fixture_sepoliaFeedback() public {
        _record(_loadFixture("sepolia-feedback"));
        GroundedFacts.Pair memory pair = facts.pairOf(SEP, 9865, 0x3f65A7CD469eeC1aFbA48083cC3D08910a20ed95);
        assertEq(pair.maxIndex, 5);
        assertEq(facts.facts(SEP, 9865, 0, 0).minAttestors, 7);
        assertEq(facts.facts(MAIN, 9865, 0, 0).breadthRaw, 0, "chainKeys are separate namespaces");
    }

    // ------------------------------------------------------------ batch path (CON-13)

    function _twoMembers() internal returns (uint64[] memory heights, bytes[] memory encs) {
        heights = new uint64[](2);
        encs = new bytes[](2);
        heights[0] = 25_000_000;
        heights[1] = 25_000_500;
        encs[0] = _encodeTx(owner, 1, _logs1(_registeredLog(ID_MAIN, 777, "ipfs://a", owner)));
        encs[1] = _encodeTx(alice, 1, _logs1(_feedbackLog(REP_MAIN, 777, alice, 1, 5)));
    }

    function test_batch_admitsMembersAsUnit() public {
        (uint64[] memory heights, bytes[] memory encs) = _twoMembers();
        GroundedFacts.Batch memory b = _batch(MAIN, heights, encs);
        assertEq(facts.recordBatch(b), 2);
        assertTrue(facts.isRegistered(MAIN, 777));
        assertEq(facts.ownerOf(MAIN, 777), owner);
        IAgentFacts.Facts memory f = facts.facts(MAIN, 777, 0, 0);
        assertEq(f.breadthRaw, 1);
        assertEq(f.firstRegisteredHeight, 25_000_000);
        assertEq(f.coveredThrough, 25_000_500);
        assertEq(facts.reviewerSeniority(MAIN, alice).oldest, 25_000_500, "member activity recorded");
    }

    function test_batch_oneBadMemberRejectsWhole() public {
        (uint64[] memory heights, bytes[] memory encs) = _twoMembers();
        GroundedFacts.Batch memory b = _batch(MAIN, heights, encs);
        bytes32 goodRoot = b.merkleProofs[0].root;
        b.merkleProofs[1].root = MockBlockProver(Precompiles.BLOCK_PROVER).REJECT();
        vm.expectRevert(abi.encodeWithSelector(GroundedFacts.ProofRejected.selector, uint256(0)));
        facts.recordBatch(b);
        // Nothing from the batch leaked in: the good member is still unknown.
        uint64 idx = uint64(uint32(uint256(goodRoot)));
        assertFalse(facts.admittedTx(keccak256(abi.encode(MAIN, heights[0], idx))));
        assertFalse(facts.isRegistered(MAIN, 777));
    }

    function test_batch_duplicateInsideBatchSkipped() public {
        (uint64[] memory heights, bytes[] memory encs) = _twoMembers();
        GroundedFacts.Batch memory b = _batch(MAIN, heights, encs);
        b.heights[1] = b.heights[0];
        b.encodedTxs[1] = b.encodedTxs[0];
        b.merkleProofs[1].root = b.merkleProofs[0].root;
        assertEq(facts.recordBatch(b), 1, "same tx twice counts once");
    }

    function test_batch_thenSingleIsDuplicate() public {
        (uint64[] memory heights, bytes[] memory encs) = _twoMembers();
        GroundedFacts.Batch memory b = _batch(MAIN, heights, encs);
        assertEq(facts.recordBatch(b), 2);
        GroundedFacts.Proof memory p = _proof(MAIN, heights[0], encs[0]);
        p.merkleProof.root = b.merkleProofs[0].root;
        assertEq(_record(p), 0, "dedup key is shared by both paths");
    }

    function test_batch_lengthMismatchReverts() public {
        (uint64[] memory heights, bytes[] memory encs) = _twoMembers();
        GroundedFacts.Batch memory b = _batch(MAIN, heights, encs);
        bytes[] memory one = new bytes[](1);
        one[0] = encs[0];
        b.encodedTxs = one;
        vm.expectRevert(GroundedFacts.BadBatch.selector);
        facts.recordBatch(b);
    }

    function test_batch_emptyReverts() public {
        GroundedFacts.Batch memory b = _batch(MAIN, new uint64[](0), new bytes[](0));
        vm.expectRevert(GroundedFacts.BadBatch.selector);
        facts.recordBatch(b);
    }

    function test_batch_unknownChainReverts() public {
        (uint64[] memory heights, bytes[] memory encs) = _twoMembers();
        GroundedFacts.Batch memory b = _batch(9, heights, encs);
        vm.expectRevert(abi.encodeWithSelector(GroundedFacts.UnknownChain.selector, uint64(9)));
        facts.recordBatch(b);
    }

    /// Real batch from the CC3 prover (`proof-batch-by-tx/3`, 12 Sep 2026), two mainnet reputation
    /// txs sharing 87 continuity roots. The live precompile returned true for exactly these bytes.
    function test_fixture_batchMainnet2() public {
        GroundedFacts.Batch memory b = _loadBatchFixture("batch-mainnet-2");
        assertEq(b.chainKey, 3);
        assertEq(b.heights.length, 2);
        assertEq(b.heights[0], 25_949_114);
        assertEq(b.heights[1], 25_949_118);
        assertEq(b.continuityProof.roots.length, 87);
        assertEq(facts.recordBatch(b), 2);
        for (uint256 i; i < 2; ++i) {
            uint64 idx = uint64(uint32(uint256(b.merkleProofs[i].root)));
            assertTrue(facts.admittedTx(keccak256(abi.encode(uint64(3), b.heights[i], idx))), "member admitted");
        }
        // Both members are NewFeedback txs, so the bureau now knows at least one reviewer each.
        address from0 = EvmV1Decoder.decodeCommonTxFields(b.encodedTxs[0]).from;
        assertEq(facts.reviewerSeniority(MAIN, from0).oldest, 25_949_114, "sender activity from member 0");
    }
}
