// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IRouterClient} from "@chainlink/contracts/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts/ccip/libraries/Client.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {PerpsErrors} from "../errors/PerpsErrors.sol";

/**
 * @title   CrossChainRouter
 * @author  NexTechArchitect
 * @notice  Handles sending trade requests to other chains via Chainlink CCIP.
 */
contract CrossChainRouter is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IRouterClient public immutable CCIP_ROUTER;

    ///@notice Gas limit for CCIP messages
    uint256 public destinationGasLimit = 400_000;

    ///@notice Operational balance
    uint256 public operationalBalance;
    
    ///@notice Mapping of supported chains
    mapping(uint64 => bool) public supportedChains;

    ///@notice Mapping of supported chains
    mapping(uint64 => address) public destinationReceivers;

    ///@notice Mapping of user nonces
    mapping(address => uint256) public userNonces;

    event TradeRequestSent(bytes32 indexed messageId, uint64 indexed destinationChain, address indexed trader, uint256 nonce, uint256 feePaid);
    event ChainSupported(uint64 indexed chainSelector, address receiver);
    event ChainRemoved(uint64 indexed chainSelector);
    event GasLimitUpdated(uint256 oldLimit, uint256 newLimit);

    constructor(address _ccipRouter) Ownable(msg.sender) {
        if (_ccipRouter == address(0)) revert PerpsErrors.InvalidAddress();
        CCIP_ROUTER = IRouterClient(_ccipRouter);
    }
/**
* @notice  Send a trade request to another chain via CCIP
* @param   _destChainSelector  Chain ID of the destination chain
* @param   _token              Token address
* @param   _isLong             Whether the trade is a long or short
* @param   _margin             Margin for the trade
* @param   _leverage           Leverage for the trade
 */
    function sendTradeRequest(
        uint64 _destChainSelector,
        address _token,
        bool _isLong,
        uint256 _margin,
        uint256 _leverage
    ) external payable nonReentrant whenNotPaused returns (bytes32 messageId) {
        if (!supportedChains[_destChainSelector]) revert PerpsErrors.InvalidParameter();
        address receiver = destinationReceivers[_destChainSelector];
        if (receiver == address(0) || _token == address(0)) revert PerpsErrors.InvalidAddress();
        if (_margin == 0) revert PerpsErrors.ZeroAmount();
        if (_leverage == 0) revert PerpsErrors.InvalidParameter();

        operationalBalance += msg.value;

        uint256 currentNonce = userNonces[msg.sender];
        userNonces[msg.sender]++;

        bytes memory tradeData = abi.encode(msg.sender, currentNonce, _token, _isLong, _margin, _leverage);
        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCcipMessage(receiver, tradeData);

        uint256 ccipFee = CCIP_ROUTER.getFee(_destChainSelector, evm2AnyMessage);
        if (msg.value < ccipFee) revert PerpsErrors.InsufficientFunds();

        messageId = CCIP_ROUTER.ccipSend{value: ccipFee}(_destChainSelector, evm2AnyMessage);
        emit TradeRequestSent(messageId, _destChainSelector, msg.sender, currentNonce, ccipFee);

        uint256 refundAmount = msg.value - ccipFee;
        operationalBalance -= msg.value; 

        if (refundAmount > 0) {
            (bool success, ) = msg.sender.call{value: refundAmount, gas: 3000}("");
            success; 
        }

        return messageId;
    }
    /**
    * @notice  Estimate the fee for a trade request to another chain via CCIP
    * @param   _destChainSelector  Chain ID of the destination chain
    * @param   _token              Token address
    * @param   _isLong             Whether the trade is a long or short
    * @param   _margin             Margin for the trade
    * @param   _leverage           Leverage for the trade
     */

    function estimateFee(
        address _trader, 
        uint64 _destChainSelector,
        address _token,
        bool _isLong,
        uint256 _margin,
        uint256 _leverage
    ) external view returns (uint256) {
        if (!supportedChains[_destChainSelector]) revert PerpsErrors.InvalidParameter();
        uint256 currentNonce = userNonces[_trader];
        bytes memory tradeData = abi.encode(_trader, currentNonce, _token, _isLong, _margin, _leverage);
        Client.EVM2AnyMessage memory message = _buildCcipMessage(destinationReceivers[_destChainSelector], tradeData);
        return CCIP_ROUTER.getFee(_destChainSelector, message);
    }

/**
* @notice  Internal helper to build a CCIP message
* @param   _receiver  Address of the receiver
* @param   _data      Data to be sent
 */
    function _buildCcipMessage(address _receiver, bytes memory _data) internal view returns (Client.EVM2AnyMessage memory) {
        return Client.EVM2AnyMessage({
            receiver: abi.encode(_receiver),
            data: _data,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(Client.EVMExtraArgsV1({gasLimit: destinationGasLimit})),
            feeToken: address(0) 
        });
    }
/**
* @notice  Set the destination chain and receiver address
* @param   _chainSelector  Chain ID of the destination chain
* @param   _receiver       Address of the receiver
 */
    function setDestinationChain(uint64 _chainSelector, address _receiver) external onlyOwner {
        if (_receiver == address(0)) revert PerpsErrors.InvalidAddress();
        supportedChains[_chainSelector] = true;
        destinationReceivers[_chainSelector] = _receiver;
        emit ChainSupported(_chainSelector, _receiver);
    }
    /**
    * @notice  Remove the destination chain and receiver address
    * @param   _chainSelector  Chain ID of the destination chain
     */

    function removeDestinationChain(uint64 _chainSelector) external onlyOwner {
        supportedChains[_chainSelector] = false;
        delete destinationReceivers[_chainSelector];
        emit ChainRemoved(_chainSelector);
    }

    function setDestinationGasLimit(uint256 _newLimit) external onlyOwner {
        if (_newLimit < 100_000 || _newLimit > 3_000_000) revert PerpsErrors.InvalidParameter(); 
        uint256 oldLimit = destinationGasLimit;
        destinationGasLimit = _newLimit;
        emit GasLimitUpdated(oldLimit, _newLimit);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /**
    * @notice  Rescue funds from the contract
    * @param   _token  Token address
    * @param   _amount Amount of funds to rescue
     */

    function rescueFunds(address _token, uint256 _amount) external onlyOwner {
        if (_token == address(0)) {
            uint256 rescuableBalance = address(this).balance - operationalBalance;
            if (_amount > rescuableBalance) revert PerpsErrors.InsufficientFunds();
            (bool success, ) = owner().call{value: _amount}("");
            require(success, "ETH rescue failed");
        } else {
            uint256 tokenBalance = IERC20(_token).balanceOf(address(this));
            if (_amount > tokenBalance) revert PerpsErrors.InsufficientFunds();
            IERC20(_token).safeTransfer(owner(), _amount);
        }
    }
}