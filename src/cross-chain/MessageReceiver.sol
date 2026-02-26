// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {CCIPReceiver} from "@chainlink/contracts/ccip/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts/ccip/libraries/Client.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IPerpsCore} from "../interfaces/IPerpsCore.sol";
import {PerpsErrors} from "../errors/PerpsErrors.sol";

/**
 * @title   MessageReceiver
 * @author  NexTechArchitect
 * @notice  Catches cross-chain trade requests from the Source Chain Router and executes them locally.
 * @dev     Inherits CCIPReceiver. Hardened with Try-Catch execution, Application-layer 
 * Nonce tracking, and strict Source Chain & Sender whitelists to prevent exploits.
 */

contract MessageReceiver is CCIPReceiver, Ownable {


//////////////////////////////////////////////////
//               STATE VARIABLES                //
//////////////////////////////////////////////////

/// @notice The main engine that actually opens the trade on this chain (Virtual Margin)
    IPerpsCore public positionManager;

/// @notice SECURITY: Only allow messages from these Chainlink Chain Selectors
    mapping(uint64 => bool) public whitelistedSourceChains;

/// @notice SECURITY: Only allow messages from our exact CrossChainRouter address on the source chain
    mapping(address => bool) public whitelistedSenders;

/// @notice SECURITY: Track nonces to prevent replay attacks
    mapping(address => mapping(uint256 => bool)) public processedNonces;  


//////////////////////////////////////////////////
//                     EVENTS                   //
//////////////////////////////////////////////////

    event TradeExecuted(bytes32 indexed messageId, address indexed trader, address token, bool isLong, uint256 margin, uint256 leverage);
    event TradeFailed(bytes32 indexed messageId, address indexed trader, string reason);
    
    event SourceChainWhitelisted(uint64 indexed chainSelector, bool allowed);
    event SenderWhitelisted(address indexed sender, bool allowed);
    event PositionManagerUpdated(address newManager);

/////////////////////////////////////////////////////////
//                    CONSTRUCTOR                      //
/////////////////////////////////////////////////////////

    /**
     * @param _ccipRouter The Chainlink Router address on THIS destination chain
     * @param _positionManager The address of your local PositionManager.sol
     */

   constructor(address _ccipRouter, address _positionManager) 
        CCIPReceiver(_ccipRouter)
        Ownable(msg.sender)

    {if (_positionManager == address(0)) {
            revert PerpsErrors.InvalidAddress();
        }
        positionManager = IPerpsCore(_positionManager);
    }


///////////////////////////////////////////////////////
//                CORE RECEIVER LOGIC                //
///////////////////////////////////////////////////////

    /**
     * @notice The magical function that CCIP automatically calls when a message arrives.
     * @dev    This is internal and overrides the blank one in CCIPReceiver.
     * We use Try-Catch so a failed trade doesn't block the CCIP pipeline.
     */
    function _ccipReceive(Client.Any2EVMMessage memory any2EvmMessage) internal override {
        
        if (!whitelistedSourceChains[any2EvmMessage.sourceChainSelector]) {
            revert PerpsErrors.InvalidParameter(); 
        }

        address sender = abi.decode(any2EvmMessage.sender, (address));
        if (!whitelistedSenders[sender]) {
            revert PerpsErrors.InvalidAddress();
        }

      
        (
            address trader,
            uint256 nonce,
            address token,
            bool isLong,
            uint256 margin,
            uint256 leverage
        ) = abi.decode(
            any2EvmMessage.data,
            (address, uint256, address, bool, uint256, uint256)
        );

        if (processedNonces[trader][nonce]) {
           
            emit TradeFailed(any2EvmMessage.messageId, trader, "Nonce already processed");
            return; 
        }
        
        processedNonces[trader][nonce] = true;

        
        try positionManager.executeCrossChainTrade(trader, token, isLong, margin, leverage) {
          
            emit TradeExecuted(any2EvmMessage.messageId, trader, token, isLong, margin, leverage);
        } catch Error(string memory reason) {
          
            emit TradeFailed(any2EvmMessage.messageId, trader, reason);
        } catch {
          
            emit TradeFailed(any2EvmMessage.messageId, trader, "Execution Failed (Custom Error/OOG)");
        }
    }
    ///////////////////////////////////////////////////////
    //               ADMIN CONFIGURATION                 //
    ///////////////////////////////////////////////////////

       /**
        * @notice Whitelists a source chain selector (e.g., Arbitrum's selector)
        */
    function setWhitelistedSourceChain(uint64 _sourceChainSelector, bool _allowed) external onlyOwner {
        whitelistedSourceChains[_sourceChainSelector] = _allowed;
        emit SourceChainWhitelisted(_sourceChainSelector, _allowed);
    }

      /**
       * @notice Whitelists the address of the CrossChainRouter on the source chain
       */
    function setWhitelistedSender(address _sender, bool _allowed) external onlyOwner {
        if (_sender == address(0)) revert PerpsErrors.InvalidAddress();
        whitelistedSenders[_sender] = _allowed;
        emit SenderWhitelisted(_sender, _allowed);
    }

      /**
       * @notice Updates the PositionManager address if we ever upgrade the trading engine
       */
    function updatePositionManager(address _newManager) external onlyOwner {
        if (_newManager == address(0)) revert PerpsErrors.InvalidAddress();
        positionManager = IPerpsCore(_newManager);
        emit PositionManagerUpdated(_newManager);
    }
}