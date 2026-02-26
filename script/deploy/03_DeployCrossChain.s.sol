// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {CrossChainRouter} from "../../src/cross-chain/CrossChainRouter.sol";
import {MessageReceiver} from "../../src/cross-chain/MessageReceiver.sol";

contract DeployCrossChain is Script {
    function run() public returns (CrossChainRouter crossChainRouter, MessageReceiver messageReceiver) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Read required addresses from .env
        address posManagerAddress = vm.envAddress("POSITION_MANAGER_ADDRESS");
        address ccipRouterAddress = vm.envAddress("CCIP_ROUTER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        console.log("--- Starting PRODUCTION Cross-Chain Deployment on Sepolia ---");

        // 1. Deploy Cross-Chain Router (Sender) - Requires only CCIP Router
        crossChainRouter = new CrossChainRouter(ccipRouterAddress);
        console.log("1. CrossChainRouter deployed at:", address(crossChainRouter));

        // 2. Deploy Message Receiver - Requires CCIP Router & Position Manager
        messageReceiver = new MessageReceiver(ccipRouterAddress, posManagerAddress);
        console.log("2. MessageReceiver deployed at:", address(messageReceiver));

        vm.stopBroadcast();
        console.log("--- Cross-Chain Deployment Complete! ---");
    }
}