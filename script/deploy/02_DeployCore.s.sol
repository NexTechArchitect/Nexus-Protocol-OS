// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PerpsVault} from "../../src/core/PerpsVault.sol";
import {PositionManager} from "../../src/core/PositionManager.sol";
import {LiquidationEngine} from "../../src/core/LiquidationEngine.sol";

contract DeployCore is Script {
    function run() public returns (PerpsVault vault, PositionManager posManager, LiquidationEngine engine) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        address oracleAddress = vm.envAddress("PRICE_ORACLE_ADDRESS"); 
        address wethAddress = vm.envAddress("WETH_ADDRESS");
        address wbtcAddress = vm.envAddress("WBTC_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);
        console.log("--- Starting PRODUCTION Core Deployment ---");
        
        // 1. Deploy Vault
        vault = new PerpsVault(usdcAddress);
        console.log("1. PerpsVault deployed at:", address(vault));

        // 2. Deploy PositionManager
        uint256 maxLeverage = 50 * 1e18;
        posManager = new PositionManager(address(vault), oracleAddress, maxLeverage);
        console.log("2. PositionManager deployed at:", address(posManager));

        // 3. Link Contracts & Whitelist Assets (WETH/WBTC for trading)
        vault.setPositionManager(address(posManager));
        posManager.addAsset(wethAddress);
        posManager.addAsset(wbtcAddress);
        console.log("3. Vault linked & Trading assets whitelisted!");

        // 4. Deploy Liquidation Engine
        engine = new LiquidationEngine(address(posManager));
        console.log("4. LiquidationEngine deployed at:", address(engine));

        vm.stopBroadcast();
        console.log("--- Core Deployment Complete! ---");
    }
}