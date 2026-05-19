// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/GiveawayFactory.sol";

contract Deploy is Script {
    function run() external returns (address) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        // Network-stable token entrants pay to enter (e.g. BUSDT on BSC, USDC on Base)
        address entryToken = vm.envAddress("ENTRY_TOKEN_ADDRESS");
        require(entryToken != address(0), "ENTRY_TOKEN_ADDRESS not set");

        vm.startBroadcast(deployerKey);
        GiveawayFactory factory = new GiveawayFactory(entryToken);
        vm.stopBroadcast();

        return address(factory);
    }
}
