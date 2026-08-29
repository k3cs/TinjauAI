// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {GroundedFacts} from "../src/GroundedFacts.sol";
import {AgentHireEscrow} from "../src/AgentHireEscrow.sol";
import {CoverageBounty} from "../src/CoverageBounty.sol";

/// forge script script/Deploy.s.sol --rpc-url cc3 --broadcast --private-key $PRIVATE_KEY
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        GroundedFacts facts = new GroundedFacts();
        AgentHireEscrow escrow = new AgentHireEscrow(facts);
        CoverageBounty bounty = new CoverageBounty(facts);
        vm.stopBroadcast();
        console.log("GroundedFacts  ", address(facts));
        console.log("AgentHireEscrow", address(escrow));
        console.log("CoverageBounty ", address(bounty));
    }
}
