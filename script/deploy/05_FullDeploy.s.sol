// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MessageReceiver} from "../../src/cross-chain/MessageReceiver.sol";
import {CrossChainRouter} from "../../src/cross-chain/CrossChainRouter.sol";

contract FullDeploy is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Load Addresses from .env
        address receiverAddr = vm.envAddress("MESSAGE_RECEIVER_ADDRESS");
        address routerAddr   = vm.envAddress("CROSS_CHAIN_ROUTER_ADDRESS");
        uint64  chainSelector = uint64(vm.envUint("SEPOLIA_CHAIN_SELECTOR"));

        vm.startBroadcast(deployerPrivateKey);

        console.log("--- Starting FINAL SYSTEM CONFIGURATION ---");

        // 1. CONFIG MESSAGE RECEIVER (Whitelist the sender)
        MessageReceiver receiver = MessageReceiver(receiverAddr);
        receiver.setWhitelistedSourceChain(chainSelector, true);
        receiver.setWhitelistedSender(routerAddr, true);
        console.log("1. MessageReceiver: Whitelisted Source Chain & Sender");

        // 2. CONFIG CROSS-CHAIN ROUTER (Destination Mapping)
        CrossChainRouter router = CrossChainRouter(routerAddr);
        router.setDestinationChain(chainSelector, receiverAddr);
        console.log("2. CrossChainRouter: Destination set to Receiver");

        vm.stopBroadcast();
        console.log("--- NEXUS PERPS IS NOW FULLY WIRED & OPERATIONAL! ---");
    }
}
