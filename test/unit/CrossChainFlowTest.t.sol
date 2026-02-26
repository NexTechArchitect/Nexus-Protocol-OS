// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CrossChainRouter} from "../../src/cross-chain/CrossChainRouter.sol";
import {MessageReceiver} from "../../src/cross-chain/MessageReceiver.sol";
import {PerpsErrors} from "../../src/errors/PerpsErrors.sol";
import {Client} from "@chainlink/contracts/ccip/libraries/Client.sol";

// ==========================================
// MOCKS
// ==========================================
contract MockCCIPRouter {
    function getFee(uint64, Client.EVM2AnyMessage memory) external pure returns (uint256) {
        return 0.01 ether; // Fake CCIP Fee
    }

    function ccipSend(uint64, Client.EVM2AnyMessage memory) external payable returns (bytes32) {
        return keccak256("fake_message_id");
    }
}

contract MockPosMgr {
    event CrossChainExecuted(address trader, address token, uint256 margin);
    
    function executeCrossChainTrade(address trader, address token, bool, uint256 margin, uint256) external {
        emit CrossChainExecuted(trader, token, margin);
    }
}

// Malicious contract to verify the non-blocking refund logic
contract RejectRefundTrader {
    CrossChainRouter router;

    constructor(address _router) {
        router = CrossChainRouter(_router);
    }

    function attack(uint64 destChain, address token) external payable {
        router.sendTradeRequest{value: msg.value}(destChain, token, true, 100e18, 10e18);
    }

    // Rejects incoming ETH to try and block the transaction
    receive() external payable {
        revert("I hate ETH");
    }
}

contract TestableMessageReceiver is MessageReceiver {
    constructor(address _ccipRouter, address _positionManager) MessageReceiver(_ccipRouter, _positionManager) {}

    function simulateCcipReceive(Client.Any2EVMMessage memory message) external {
        _ccipReceive(message);
    }
}

// ==========================================
// UNIFIED TEST SUITE
// ==========================================
contract CrossChainFlowTest is Test {
    CrossChainRouter public sourceRouter;
    TestableMessageReceiver public destReceiver;
    
    MockCCIPRouter public mockCcip;
    MockPosMgr public mockPosMgr;

    address public owner = makeAddr("owner");
    address public trader = makeAddr("trader");
    address public fakeToken = makeAddr("fakeToken");

    uint64 public constant DEST_CHAIN_SELECTOR = 1234567890;

    function setUp() public {
        mockCcip = new MockCCIPRouter();
        mockPosMgr = new MockPosMgr();

        vm.startPrank(owner);
        sourceRouter = new CrossChainRouter(address(mockCcip));
        destReceiver = new TestableMessageReceiver(address(mockCcip), address(mockPosMgr));

        sourceRouter.setDestinationChain(DEST_CHAIN_SELECTOR, address(destReceiver));
        destReceiver.setWhitelistedSourceChain(DEST_CHAIN_SELECTOR, true);
        destReceiver.setWhitelistedSender(address(sourceRouter), true);
        vm.stopPrank();

        vm.deal(trader, 10 ether);
    }

    // ==========================================
    // BUG 1 FIX: REFUND NON-BLOCKING CHECK
    // ==========================================

    function test_Success_TradeProceedsEvenIfRefundFails() public {
        RejectRefundTrader badContract = new RejectRefundTrader(address(sourceRouter));
        vm.deal(address(badContract), 1 ether);

        // EXPECTATION: Trade should now SUCCEED even if the contract rejects the refund.
        // The excess ETH will just stay in the router safely.
        badContract.attack{value: 0.05 ether}(DEST_CHAIN_SELECTOR, fakeToken);
        
        assertEq(sourceRouter.userNonces(address(badContract)), 1, "Trade nonce should increment");
    }

    // ==========================================
    // BUG 2 FIX: STRICT ADDRESS VALIDATION
    // ==========================================

    function test_RevertWhen_TokenAddressIsZero() public {
        vm.startPrank(trader);
        
        // EXPECTATION: Router must revert immediately to save user's CCIP fee.
        vm.expectRevert(PerpsErrors.InvalidAddress.selector);
        sourceRouter.sendTradeRequest{value: 0.01 ether}(DEST_CHAIN_SELECTOR, address(0), true, 100e18, 10e18);
        
        vm.stopPrank();
    }

    // ==========================================
    // RECEIVER SECURITY CHECKS
    // ==========================================

    function test_RevertWhen_UnknownSourceChain() public {
        Client.Any2EVMMessage memory msgPayload = Client.Any2EVMMessage({
            messageId: keccak256("id"),
            sourceChainSelector: 9999,
            sender: abi.encode(address(sourceRouter)),
            data: abi.encode(trader, 0, fakeToken, true, 100e18, 10e18),
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        vm.expectRevert(PerpsErrors.InvalidParameter.selector);
        destReceiver.simulateCcipReceive(msgPayload);
    }

    function test_RevertWhen_UnknownSender() public {
        Client.Any2EVMMessage memory msgPayload = Client.Any2EVMMessage({
            messageId: keccak256("id"),
            sourceChainSelector: DEST_CHAIN_SELECTOR, 
            sender: abi.encode(makeAddr("hacker")),
            data: abi.encode(trader, 0, fakeToken, true, 100e18, 10e18),
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        vm.expectRevert(PerpsErrors.InvalidAddress.selector);
        destReceiver.simulateCcipReceive(msgPayload);
    }

    // ==========================================
    // E2E LOGIC CHECK
    // ==========================================

    function test_Success_EndToEndMessageDelivery() public {
        vm.prank(trader);
        sourceRouter.sendTradeRequest{value: 0.01 ether}(DEST_CHAIN_SELECTOR, fakeToken, true, 100e18, 10e18);

        Client.Any2EVMMessage memory msgPayload = Client.Any2EVMMessage({
            messageId: keccak256("id"),
            sourceChainSelector: DEST_CHAIN_SELECTOR, 
            sender: abi.encode(address(sourceRouter)),
            data: abi.encode(trader, 0, fakeToken, true, 100e18, 10e18),
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        vm.expectEmit(false, false, false, true, address(mockPosMgr));
        emit MockPosMgr.CrossChainExecuted(trader, fakeToken, 100e18);

        destReceiver.simulateCcipReceive(msgPayload);
    }
}