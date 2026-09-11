// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {GroundedFacts} from "../src/GroundedFacts.sol";
import {AgentHireEscrow} from "../src/AgentHireEscrow.sol";
import {CoverageBounty} from "../src/CoverageBounty.sol";
import {IAgentFacts} from "../src/interfaces/IAgentFacts.sol";
import {Base} from "./utils/Base.sol";

contract ConsumersTest is Base {
    AgentHireEscrow internal escrow;
    CoverageBounty internal bounty;

    address internal hirer = makeAddr("hirer");
    address internal agentOwner = makeAddr("agentOwner");
    address internal scout = makeAddr("scout");
    address internal r1 = makeAddr("r1");
    address internal r2 = makeAddr("r2");
    address internal r3 = makeAddr("r3");

    uint256 internal constant GOOD = 22771;
    uint256 internal constant WEAK = 50283;

    function setUp() public override {
        super.setUp();
        escrow = new AgentHireEscrow(IAgentFacts(address(facts)));
        bounty = new CoverageBounty(facts);
        vm.deal(hirer, 100 ether);

        // GOOD: three senior reviewers, one owner, no clones
        _register(1_000, agentOwner, GOOD, "ipfs://good", agentOwner);
        address[3] memory rs = [r1, r2, r3];
        for (uint256 i; i < 3; ++i) {
            _activity(10, rs[i]);
            _activity(300_000, rs[i]);
            _review(900_000, GOOD, rs[i], 1, 90);
        }
    }

    function _params() internal pure returns (AgentHireEscrow.Params memory p) {
        p = AgentHireEscrow.Params({
            minAge: 500_000, minDepth: 2, k: 3, c: 5, baseBps: 100, maxBps: 2_000, minAttestors: 0, maxStaleness: 0
        });
    }

    /// WEAK: one reviewer who owns agents, owner holds 6 agents (5 clone siblings), a hidden review.
    function _seedWeak() internal {
        address farm = makeAddr("farm");
        for (uint256 i; i < 6; ++i) {
            _register(uint64(2_000 + i), farm, WEAK + i, "", farm);
        }
        _activity(10, farm);
        _activity(300_000, farm);
        _record(_proof(MAIN, 900_000, _encodeTx(farm, 1, _logs1(_feedbackLog(REP_MAIN, WEAK, farm, 2, 95)))));
    }

    // ------------------------------------------------------------ quote

    function test_quote_seniorReviewersGetBasePremium() public view {
        (uint256 risk, uint256 premium, IAgentFacts.Facts memory f,) = escrow.quote(MAIN, GOOD, _params());
        assertEq(f.breadthGrounded, 3);
        assertEq(risk, 0);
        assertEq(premium, 100);
    }

    function test_quote_cloneDensityAndThinCoverage() public {
        _seedWeak();
        // make the lone reviewer grounded and the index gap closed, to isolate the pricing math
        _record(_proof(MAIN, 899_000, _encodeTx(makeAddr("farm"), 1, _logs1(_feedbackLog(REP_MAIN, WEAK, makeAddr("farm"), 1, 95)))));
        (uint256 risk, uint256 premium, IAgentFacts.Facts memory f,) = escrow.quote(MAIN, WEAK, _params());
        assertEq(f.breadthGrounded, 1);
        assertEq(f.cloneDensityLB, 5);
        // coverage = 1/3 = 3333 bps; cloneFactor = 5/(5+5) = 5000 bps; risk = 10000 - 1666 = 8334
        assertEq(risk, 8_334);
        // premium = 100 + 1900 * 8334 / 10000 = 1683
        assertEq(premium, 1_683);
    }

    function test_quote_rejectsBadParams() public {
        AgentHireEscrow.Params memory p = _params();
        p.k = 0;
        vm.expectRevert(AgentHireEscrow.BadParams.selector);
        escrow.quote(MAIN, GOOD, p);
        p = _params();
        p.baseBps = 3_000;
        vm.expectRevert(AgentHireEscrow.BadParams.selector);
        escrow.quote(MAIN, GOOD, p);
    }

    // ------------------------------------------------------------ hire

    function test_hire_paysPremiumToOwnerAndHoldsRest() public {
        vm.prank(hirer);
        uint256 id = escrow.hire{value: 1 ether}(MAIN, GOOD, _params(), uint64(block.timestamp + 1 days));
        assertEq(agentOwner.balance, 0.01 ether);
        AgentHireEscrow.Job memory j = escrow.jobOf(id);
        assertEq(j.held, 0.99 ether);
        assertEq(j.payee, agentOwner);
        assertEq(j.premiumBps, 100);

        vm.prank(hirer);
        escrow.release(id);
        assertEq(agentOwner.balance, 1 ether);
        vm.prank(hirer);
        vm.expectRevert(AgentHireEscrow.Closed.selector);
        escrow.release(id);
    }

    function test_hire_gatedByHiddenReview() public {
        _seedWeak();
        vm.prank(hirer);
        vm.expectRevert(abi.encodeWithSelector(AgentHireEscrow.Gated.selector, uint64(1)));
        escrow.hire{value: 1 ether}(MAIN, WEAK, _params(), uint64(block.timestamp + 1 days));
    }

    function test_hire_unknownAgentAndBadDeadline() public {
        vm.startPrank(hirer);
        vm.expectRevert(AgentHireEscrow.UnknownAgent.selector);
        escrow.hire{value: 1 ether}(MAIN, 424242, _params(), uint64(block.timestamp + 1 days));
        vm.expectRevert(AgentHireEscrow.BadDeadline.selector);
        escrow.hire{value: 1 ether}(MAIN, GOOD, _params(), uint64(block.timestamp));
        vm.stopPrank();
    }

    function test_hire_thinQuorumAndStaleness() public {
        AgentHireEscrow.Params memory p = _params();
        p.minAttestors = 5; // facts were admitted while 4 attestors were bonded
        vm.prank(hirer);
        vm.expectRevert(abi.encodeWithSelector(AgentHireEscrow.ThinQuorum.selector, uint32(4), uint32(5)));
        escrow.hire{value: 1 ether}(MAIN, GOOD, p, uint64(block.timestamp + 1 days));

        p = _params();
        p.maxStaleness = 50_000;
        chainInfo.setTip(MAIN, 1_000_000); // coveredThrough = 900_000 -> lag 100_000
        vm.prank(hirer);
        vm.expectRevert(abi.encodeWithSelector(AgentHireEscrow.Stale.selector, uint64(100_000), uint64(50_000)));
        escrow.hire{value: 1 ether}(MAIN, GOOD, p, uint64(block.timestamp + 1 days));

        p.maxStaleness = 200_000;
        vm.prank(hirer);
        escrow.hire{value: 1 ether}(MAIN, GOOD, p, uint64(block.timestamp + 1 days));
    }

    function test_refund_onlyAfterDeadlineOnlyHirer() public {
        vm.prank(hirer);
        uint256 id = escrow.hire{value: 1 ether}(MAIN, GOOD, _params(), uint64(block.timestamp + 1 days));
        vm.prank(hirer);
        vm.expectRevert(AgentHireEscrow.TooEarly.selector);
        escrow.refund(id);
        vm.warp(block.timestamp + 2 days);
        vm.prank(agentOwner);
        vm.expectRevert(AgentHireEscrow.NotHirer.selector);
        escrow.refund(id);
        uint256 before = hirer.balance;
        vm.prank(hirer);
        escrow.refund(id);
        assertEq(hirer.balance - before, 0.99 ether, "premium is not refunded");
    }

    // ------------------------------------------------------------ bounty

    function test_bounty_paysEvidenceThatChangesDecision() public {
        _seedWeak();
        vm.prank(hirer);
        uint256 id = bounty.fund{value: 0.05 ether}(MAIN, WEAK, 500_000, 2, 3, 5, uint64(block.timestamp + 7 days));

        // proof of the missing index 1 closes the gap: (gap == 0) flips -> decision changes
        GroundedFacts.Proof[] memory ps = new GroundedFacts.Proof[](1);
        ps[0] = _proof(MAIN, 899_000, _encodeTx(makeAddr("farm"), 1, _logs1(_feedbackLog(REP_MAIN, WEAK, makeAddr("farm"), 1, 95))));
        vm.prank(scout);
        bounty.proveAndClaim(id, ps);
        assertEq(scout.balance, 0.05 ether);
        assertTrue(bounty.bountyOf(id).closed);
    }

    function test_bounty_hurtingEvidencePaysToo() public {
        vm.prank(hirer);
        uint256 id = bounty.fund{value: 0.05 ether}(MAIN, GOOD, 500_000, 2, 3, 5, uint64(block.timestamp + 7 days));
        // a negative review flips (negatives > 0)
        GroundedFacts.Proof[] memory ps = new GroundedFacts.Proof[](1);
        address critic = makeAddr("critic");
        ps[0] = _proof(MAIN, 950_000, _encodeTx(critic, 1, _logs1(_feedbackLog(REP_MAIN, GOOD, critic, 1, -80))));
        vm.prank(scout);
        bounty.proveAndClaim(id, ps);
        assertEq(scout.balance, 0.05 ether);
    }

    function test_bounty_cannotFreeRideOnSomeoneElsesProof() public {
        _seedWeak();
        vm.prank(hirer);
        uint256 id = bounty.fund{value: 0.05 ether}(MAIN, WEAK, 500_000, 2, 3, 5, uint64(block.timestamp + 7 days));
        // someone admits the decisive proof directly, not through the bounty
        _record(_proof(MAIN, 899_000, _encodeTx(makeAddr("farm"), 1, _logs1(_feedbackLog(REP_MAIN, WEAK, makeAddr("farm"), 1, 95)))));
        GroundedFacts.Proof[] memory none;
        vm.prank(scout);
        vm.expectRevert(CoverageBounty.NoChange.selector);
        bounty.proveAndClaim(id, none);
    }

    function test_hire_truncatedFactsAreRefused() public {
        for (uint256 i; i < facts.MAX_REVIEWERS(); ++i) {
            _review(950_000, GOOD, address(uint160(0x5000 + i)), 1, 90);
        }
        vm.prank(hirer);
        vm.expectRevert(AgentHireEscrow.Truncated.selector);
        escrow.hire{value: 1 ether}(MAIN, GOOD, _params(), uint64(block.timestamp + 1 days));
    }

    function test_bounty_noChangeNoPay() public {
        vm.prank(hirer);
        uint256 id = bounty.fund{value: 0.05 ether}(MAIN, GOOD, 500_000, 2, 3, 5, uint64(block.timestamp + 7 days));
        GroundedFacts.Proof[] memory ps = new GroundedFacts.Proof[](1);
        ps[0] = _proof(MAIN, 950_000, _encodeTx(makeAddr("fan"), 1, _logs1(_feedbackLog(REP_MAIN, GOOD, makeAddr("fan"), 1, 99))));
        vm.prank(scout);
        vm.expectRevert(CoverageBounty.NoChange.selector);
        bounty.proveAndClaim(id, ps);
    }

    function test_bounty_expiryAndWithdraw() public {
        vm.prank(hirer);
        uint256 id = bounty.fund{value: 0.05 ether}(MAIN, GOOD, 500_000, 2, 3, 5, uint64(block.timestamp + 7 days));
        vm.prank(hirer);
        vm.expectRevert(CoverageBounty.TooEarly.selector);
        bounty.withdraw(id);
        vm.warp(block.timestamp + 8 days);
        GroundedFacts.Proof[] memory ps;
        vm.prank(scout);
        vm.expectRevert(CoverageBounty.Expired.selector);
        bounty.proveAndClaim(id, ps);
        vm.prank(scout);
        vm.expectRevert(CoverageBounty.NotFunder.selector);
        bounty.withdraw(id);
        uint256 before = hirer.balance;
        vm.prank(hirer);
        bounty.withdraw(id);
        assertEq(hirer.balance - before, 0.05 ether);
    }

    function test_bounty_rejectsEmptyAndPastExpiry() public {
        vm.startPrank(hirer);
        vm.expectRevert(CoverageBounty.NoValue.selector);
        bounty.fund(MAIN, GOOD, 0, 0, 1, 1, uint64(block.timestamp + 1));
        vm.expectRevert(CoverageBounty.BadExpiry.selector);
        bounty.fund{value: 1}(MAIN, GOOD, 0, 0, 1, 1, uint64(block.timestamp));
        vm.stopPrank();
    }
}
