// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PriceOracle} from "../../src/oracles/PriceOracle.sol";

contract DeployOracles is Script {
    function run() public returns (PriceOracle oracle) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        address wethAddress = vm.envAddress("WETH_ADDRESS");
        address wbtcAddress = vm.envAddress("WBTC_ADDRESS");
        address ethUsdFeed = vm.envAddress("CHAINLINK_ETH_USD_FEED");
        address btcUsdFeed = vm.envAddress("CHAINLINK_BTC_USD_FEED");

        vm.startBroadcast(deployerPrivateKey);
        console.log("--- Starting PRODUCTION Oracle Deployment ---");

        oracle = new PriceOracle();
        console.log("PriceOracle deployed at:", address(oracle));

        // ETH/USD linking
        oracle.setAsset(wethAddress, ethUsdFeed, 86400); 
        console.log("ETH/USD feed linked successfully!");

        // BTC/USD linking
        oracle.setAsset(wbtcAddress, btcUsdFeed, 86400);
        console.log("BTC/USD feed linked successfully!");

        vm.stopBroadcast();
        console.log("--- Oracle Deployment Complete! ---");
    }
}