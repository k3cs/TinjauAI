// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Fixtures} from "./Fixtures.sol";
import {GroundedFacts} from "../src/GroundedFacts.sol";
import {AgentHireEscrow} from "../src/AgentHireEscrow.sol";
import {CoverageBounty} from "../src/CoverageBounty.sol";

contract ConsumersTest is Fixtures {
    GroundedFacts gf;
    AgentHireEscrow esc;
    CoverageBounty bounty;
    uint256 constant AGENT_REG = 50609;
    address constant TBA_REG = 0x960F5A2283289008d2ED02D49E08163E7f3651a5;
    uint256 constant AGENT_FB = 50286;

    address hirer = address(0x1111);
    address prover = address(0x2222);

    function setUp() public {
        gf = new GroundedFacts();
        esc = new AgentHireEscrow(gf);
        bounty = new CoverageBounty(gf);
        mockVerifierTrue();
        vm.deal(hirer, 10 ether);
        vm.deal(prover, 1 ether);
    }

    function load(string memory name) internal returns (GroundedFacts.Proof memory p) {
        p = loadProof(name);
        mockTxIndex(p, fixtureTxIndex(name));
    }

    function params() internal pure returns (AgentHireEscrow.Params memory p) {
        p = AgentHireEscrow.Params({minAge: 0, minDepth: 1, k: 3, c: 5, baseBps: 100, maxBps: 2000});
    }

    function test_quote_noEvidence_isMaxPremium() public {
        gf.record(one(load("registered_mainnet")));
        (uint256 risk, uint16 premiumBps, uint64 gap,) = esc.quote(3, AGENT_REG, params());
        assertEq(risk, 10_000);
        assertEq(premiumBps, 2000);
        assertEq(gap, 0);
    }

    function test_hire_paysPremiumToOwner_thenRelease() public {
        gf.record(one(load("registered_mainnet")));
        uint256 ownerBefore = TBA_REG.balance;
        vm.prank(hirer);
        uint256 jobId = esc.hire{value: 1 ether}(3, AGENT_REG, params(), uint64(block.timestamp + 1 days));
        // premium 20% at max risk, paid immediately to the agent owner
        assertEq(TBA_REG.balance - ownerBefore, 0.2 ether);
        vm.prank(hirer);
        esc.release(jobId);
        assertEq(TBA_REG.balance - ownerBefore, 1 ether);
    }

    function test_hire_unknownAgent_reverts() public {
        vm.prank(hirer);
        vm.expectRevert(AgentHireEscrow.UnknownAgent.selector);
        esc.hire{value: 1 ether}(3, 424242, params(), uint64(block.timestamp + 1 days));
    }

    function test_refund_afterDeadline() public {
        gf.record(one(load("registered_mainnet")));
        vm.prank(hirer);
        uint256 jobId = esc.hire{value: 1 ether}(3, AGENT_REG, params(), uint64(block.timestamp + 1 days));
        vm.prank(hirer);
        vm.expectRevert(AgentHireEscrow.TooEarly.selector);
        esc.refund(jobId);
        vm.warp(block.timestamp + 2 days);
        uint256 before = hirer.balance;
        vm.prank(hirer);
        esc.refund(jobId);
        assertEq(hirer.balance - before, 0.8 ether);
    }

    function test_bounty_paidOnlyWhenDecisionChanges() public {
        // consumer funds a bounty on agent 50286 before any evidence; decision tuple = (false,true,false,false)
        vm.prank(hirer);
        uint256 id = bounty.fund{value: 0.5 ether}(3, AGENT_FB, 0, 0, 1, 1, uint64(block.timestamp + 7 days));
        // proving one feedback flips breadthGrounded>=1 (minAge=0,minDepth=0 -> every proven reviewer counts)
        uint256 before = prover.balance;
        vm.prank(prover);
        bounty.proveAndClaim(id, one(load("feedback_mainnet")));
        assertEq(prover.balance - before, 0.5 ether);
        (, , , , , , , uint256 amount, , , bool open) = bounty.bounties(id);
        assertEq(amount, 0);
        assertFalse(open);
    }

    function test_bounty_noChange_reverts() public {
        // evidence that does not touch the agent's decision tuple is not paid
        vm.prank(hirer);
        uint256 id = bounty.fund{value: 0.5 ether}(3, AGENT_FB, 0, 0, 1, 1, uint64(block.timestamp + 7 days));
        vm.prank(prover);
        vm.expectRevert(CoverageBounty.NoChange.selector);
        bounty.proveAndClaim(id, one(load("registered_mainnet")));
    }

    function test_hire_pastDeadline_reverts() public {
        gf.record(one(load("registered_mainnet")));
        vm.prank(hirer);
        vm.expectRevert(AgentHireEscrow.BadDeadline.selector);
        esc.hire{value: 1 ether}(3, AGENT_REG, params(), uint64(block.timestamp));
    }

    function test_bounty_pastExpiry_reverts() public {
        vm.prank(hirer);
        vm.expectRevert(CoverageBounty.BadExpiry.selector);
        bounty.fund{value: 0.5 ether}(3, AGENT_FB, 0, 0, 1, 1, uint64(block.timestamp));
    }

    function test_bounty_withdrawAfterExpiry() public {
        vm.prank(hirer);
        uint256 id = bounty.fund{value: 0.5 ether}(3, AGENT_FB, 0, 0, 1, 1, uint64(block.timestamp + 7 days));
        vm.warp(block.timestamp + 8 days);
        uint256 before = hirer.balance;
        vm.prank(hirer);
        bounty.withdraw(id);
        assertEq(hirer.balance - before, 0.5 ether);
    }
}
