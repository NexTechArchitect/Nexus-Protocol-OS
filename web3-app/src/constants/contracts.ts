import PositionManagerABI from './abis/PositionManager.json';
import PerpsVaultABI from './abis/PerpsVault.json';
import LiquidationEngineABI from './abis/LiquidationEngine.json';
import PriceOracleABI from './abis/PriceOracle.json';
import AccountFactoryABI from './abis/AccountFactory.json';
import SmartAccountABI from './abis/SmartAccount.json';
import NexusPaymasterABI from './abis/NexusPaymaster.json';
import CrossChainRouterABI from './abis/CrossChainRouter.json';

export const CONTRACTS = {
    POSITION_MANAGER: {
        address: "0x6952144C5dfb64DF54a64b61B3321Fd2C24cB42A" as `0x${string}`,
        abi: PositionManagerABI.abi, // .abi lagana mat bhoolna
    },
    VAULT: {
        address: "0x891FBf3C860333FB05f3f80526C3a1919de2d83c" as `0x${string}`,
        abi: PerpsVaultABI.abi,
    },
    LIQUIDATION_ENGINE: {
        address: "0xEE17eAF240c6b7C566E7431088FfC99551472669" as `0x${string}`,
        abi: LiquidationEngineABI.abi,
    },
    ACCOUNT_FACTORY: {
        address: "0xb6445BF0F856FDF2Fd261A5c32409d226D134221" as `0x${string}`,
        abi: AccountFactoryABI.abi,
    },
    PAYMASTER: {
        address: "0x20e302881494F79eF5E536d5533be04F913eE652" as `0x${string}`,
        abi: NexusPaymasterABI.abi,
    },
    ORACLE: {
        address: "0x4Ca4A6fa3763b1AE2F3a09B17189152a608920f5" as `0x${string}`,
        abi: PriceOracleABI.abi,
    },
    ROUTER: {
        address: "0xE9b7f8F6c78054fb8d0D97585F32e7e026F5dd24" as `0x${string}`,
        abi: CrossChainRouterABI.abi,
    },
    USDC: {
        address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as `0x${string}`,
    }
} as const;