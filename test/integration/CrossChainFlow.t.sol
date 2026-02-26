// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CrossChainRouter} from "../../src/cross-chain/CrossChainRouter.sol";
import {MessageReceiver} from "../../src/cross-chain/MessageReceiver.sol";
import {PositionManager} from "../../src/core/PositionManager.sol";
import {PerpsVault} from "../../src/core/PerpsVault.sol";
import {PriceOracle} from "../../src/oracles/PriceOracle.sol";
import {PerpsErrors} from "../../src/errors/PerpsErrors.sol";
import {IPerpsCore} from "../../src/interfaces/IPerpsCore.sol";
import {Client} from "@chainlink/contracts/ccip/libraries/Client.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ==========================================
// MOCKS FOR INTEGRATION
// ==========================================
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") { _mint(msg.sender, 10_000_000 * 1e6); }
    function decimals() public pure override returns (uint8) { return 6; }
}

contract MockAggregator {
    function decimals() external pure returns (uint8) { return 8; }
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, 2000 * 1e8, block.timestamp, block.timestamp, 1); // $2000
    }
}

contract MockCCIPRouter {
    function getFee(uint64, Client.EVM2AnyMessage memory) external pure returns (uint256) {
        return 0.01 ether; // Fake CCIP Fee
    }
    function ccipSend(uint64, Client.EVM2AnyMessage memory) external payable returns (bytes32) {
        return keccak256("fake_message_id");
    }
}

// Wrapper to expose the internal CCIP receive logic for testing
contract TestableMessageReceiver is MessageReceiver {
    constructor(address _ccipRouter, address _positionManager) MessageReceiver(_ccipRouter, _positionManager) {}
    function simulateCcipReceive(Client.Any2EVMMessage memory message) external {
        _ccipReceive(message);
    }
}

// ==========================================
// INTEGRATION TEST SUITE
// ==========================================
contract CrossChainIntegrationFlowTest is Test {
    // Hub Chain (Base/Arbitrum) Contracts
    PositionManager public posManager;
    PerpsVault public vault;
    PriceOracle public oracle;
    TestableMessageReceiver public destReceiver;

    // Spoke Chain (Optimism/Polygon) Contracts
    CrossChainRouter public sourceRouter;
    MockCCIPRouter public mockCcip;

    MockUSDC public usdc;
    MockAggregator public ethFeed;

    address public owner = makeAddr("owner");
    address public alice = makeAddr("alice"); // Cross-chain trader
    
    uint64 public constant DEST_CHAIN_SELECTOR = 1234567890;
    uint256 public constant MAX_LEVERAGE = 50 * 1e18;

    function setUp() public {
        vm.startPrank(owner);
        
        // 1. Deploy Mocks & Tokens
        usdc = new MockUSDC();
        ethFeed = new MockAggregator();
        mockCcip = new MockCCIPRouter();

        // 2. Deploy Hub Infrastructure (Real Contracts)
        oracle = new PriceOracle();
        oracle.setAsset(address(usdc), address(ethFeed), 3600);

        vault = new PerpsVault(address(usdc));
        posManager = new PositionManager(address(vault), address(oracle), MAX_LEVERAGE);
        
        posManager.addAsset(address(usdc));
        vault.setPositionManager(address(posManager));

        destReceiver = new TestableMessageReceiver(address(mockCcip), address(posManager));
        posManager.setCrossChainReceiver(address(destReceiver)); // Authorize Receiver

        // 3. Deploy Spoke Infrastructure
        sourceRouter = new CrossChainRouter(address(mockCcip));

        // 4. Setup Cross-Chain Whitelists
        sourceRouter.setDestinationChain(DEST_CHAIN_SELECTOR, address(destReceiver));
        destReceiver.setWhitelistedSourceChain(DEST_CHAIN_SELECTOR, true);
        destReceiver.setWhitelistedSender(address(sourceRouter), true);
        
        vm.stopPrank();

        // Give Alice ETH to pay for CCIP Gas
        vm.deal(alice, 10 ether);
    }

    /**
     * @notice Tests the complete flow: 
     * User on Chain A -> CCIP -> Receiver on Chain B -> Real PositionManager opens Virtual Margin trade.
     */
    function test_Integration_RealCrossChainTradeExecution() public {
        vm.startPrank(alice);

        uint256 margin = 1000 * 1e18; // $1000
        uint256 leverage = 10 * 1e18; // 10x

        // STEP 1: ALICE SENDS TRADE FROM CHAIN A
        sourceRouter.sendTradeRequest{value: 0.01 ether}(
            DEST_CHAIN_SELECTOR, 
            address(usdc), 
            true, // isLong
            margin, 
            leverage
        );
        vm.stopPrank();

        // STEP 2: SIMULATE CCIP DELIVERY TO CHAIN B
        // We pack the exact same data payload the sourceRouter created
        bytes memory tradeData = abi.encode(alice, 0, address(usdc), true, margin, leverage);
        
        Client.Any2EVMMessage memory msgPayload = Client.Any2EVMMessage({
            messageId: keccak256("msg_1"),
            sourceChainSelector: DEST_CHAIN_SELECTOR, 
            sender: abi.encode(address(sourceRouter)),
            data: tradeData,
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        // Execute the delivery
        destReceiver.simulateCcipReceive(msgPayload);

        // STEP 3: VERIFY REAL POSITION ON HUB CHAIN (Audit Check)
        // This proves that MessageReceiver successfully bypassed Vault locking 
        // and safely instructed PositionManager to open a Virtual Margin position.
        
        IPerpsCore.Position memory pos = posManager.getPosition(alice, address(usdc));
        
        assertTrue(pos.isOpen, "Cross-Chain position was not opened!");
        assertTrue(pos.isCrossChain, "Position must be flagged as Cross-Chain");
        assertEq(pos.collateral, margin, "Margin mismatch");
        assertEq(pos.leverage, leverage, "Leverage mismatch");
        assertEq(pos.isLong, true, "Direction mismatch");
        assertEq(pos.entryPrice, 2000 * 1e18, "Oracle price mismatch");
    }

    /**
     * @notice Security Check: Ensure nobody can directly call executeCrossChainTrade on PositionManager
     */
    function test_Integration_Security_BlocksDirectCrossChainCalls() public {
        vm.prank(alice); // Alice tries to bypass CCIP to open a free virtual trade
        
        vm.expectRevert(PerpsErrors.Unauthorized.selector);
        posManager.executeCrossChainTrade(
            alice, 
            address(usdc), 
            true, 
            1000 * 1e18, 
            10 * 1e18
        );
    }

    /**
     * @notice Security Check: Invalid assets over cross-chain should revert safely.
     */
  /**
     * @notice Security Check: Invalid assets over cross-chain should revert safely via try-catch.
     */
    function test_Integration_RevertsOnInvalidAssetCrossChain() public {
        address fakeToken = makeAddr("fakeToken");
        bytes memory badTradeData = abi.encode(alice, 0, fakeToken, true, 1000e18, 10e18);
        
        bytes32 mockMessageId = keccak256("msg_2");

        Client.Any2EVMMessage memory msgPayload = Client.Any2EVMMessage({
            messageId: mockMessageId,
            sourceChainSelector: DEST_CHAIN_SELECTOR, 
            sender: abi.encode(address(sourceRouter)),
            data: badTradeData,
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        // We DO NOT expect a revert. We expect the MessageReceiver to catch the error
        // and emit a TradeFailed event, keeping the CCIP lane unblocked!
        vm.expectEmit(true, true, false, true, address(destReceiver));
        emit MessageReceiver.TradeFailed(mockMessageId, alice, "Execution Failed (Custom Error/OOG)");

        destReceiver.simulateCcipReceive(msgPayload);
        
        // Final sanity check: Make sure no ghost position was opened
        IPerpsCore.Position memory ghostPos = posManager.getPosition(alice, fakeToken);
        assertFalse(ghostPos.isOpen, "Ghost position opened!");
    }
}