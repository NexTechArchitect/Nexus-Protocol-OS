<div align="center">

<img src="https://img.shields.io/badge/⚡-Nexus_Protocol_OS-F0B90B?style=for-the-badge&labelColor=0f172a&color=F0B90B" height="36"/>

# On-Chain Perpetuals Infrastructure
### Ethereum Sepolia · Non-Custodial · Zero Gas
<br>  


[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](https://opensource.org/licenses/MIT)
[![Foundry](https://img.shields.io/badge/Built_With-Foundry-F0B90B?style=flat-square)](https://book.getfoundry.sh/)
[![Network](https://img.shields.io/badge/Network-Ethereum_Sepolia-627EEA?style=flat-square)](https://sepolia.etherscan.io/)
[![Oracle](https://img.shields.io/badge/Oracle-Chainlink_Live-375BD2?style=flat-square)](https://chain.link/)
[![AA](https://img.shields.io/badge/Accounts-ERC--4337_Gasless-F0B90B?style=flat-square)](https://eips.ethereum.org/EIPS/eip-4337)

<br>

> **A fully on-chain perpetuals exchange with zero off-chain dependencies.**  
> Chainlink price oracles · ERC-4337 gasless smart accounts · CCIP cross-chain margin · 50× leverage.

<br>

<a href="https://nexus-protocol-os.vercel.app/">
  <img src="https://img.shields.io/badge/%E2%9A%A1_LAUNCH_APP-NEXUS_PERPS-F0B90B?style=for-the-badge&labelColor=0f172a" height="44"/>
</a>

<br><br>

<a href="https://github.com/NexTechArchitect/Nexus-Protocol">💻 Source Code</a> &nbsp;·&nbsp;
<a href="https://nexus-protocol-os.vercel.app/docs">📜 Docs</a> &nbsp;·&nbsp;
<a href="https://sepolia.etherscan.io/address/0x6952144C5dfb64DF54a64b61B3321Fd2C24cB42A">🔗 PositionManager</a> &nbsp;·&nbsp;
<a href="https://faucet.circle.com/">🚰 Get Testnet USDC</a>

</div>

---

## 🎯 What Makes Nexus Different

Most DeFi perp protocols rely on off-chain matching engines, centralized price feeds, or custodial bridges. Nexus Perps eliminates every one of these dependencies — every price fetch, every liquidation, every settlement runs entirely on-chain with no external coordination layer.

| Problem With Existing Protocols | Nexus Solution |
|:---|:---|
| Oracle manipulation via thin markets | Chainlink aggregators with per-asset heartbeat staleness guards |
| Gas costs kill small traders | ERC-4337 smart accounts + NexusPaymaster sponsors 100% of gas |
| Liquidity fragmented across chains | Chainlink CCIP cross-chain margin relay with nonce replay protection |
| Custodial bridges introduce counterparty risk | All collateral lives in `PerpsVault.sol` — non-custodial, on-chain |
| LP inflation attacks on first deposit | `MINIMUM_LIQUIDITY = 1000` shares permanently burned on genesis deposit |
| Dust sweep / precision drain | `scaledAmount % DECIMALS_SCALAR != 0` enforced on every withdrawal |

---

## 📑 Table of Contents

1. [🏛️ Architecture](#-architecture)
2. [✅ Deployed Contracts](#-deployed-contracts)
3. [🧩 Contract Reference](#-contract-reference)
4. [💻 Frontend Stack](#-frontend-stack)
5. [🧪 Test Suite & Coverage](#-test-suite--coverage)
6. [🛠️ Local Setup](#-local-setup)
7. [🔐 Security Model](#-security-model)



### Core Design Invariants

**1. No off-chain trust** — Price discovery, execution, liquidation, settlement — all fully on-chain.

**2. 18-decimal precision throughout** — `DECIMALS_SCALAR = 10^(18 - tokenDecimals)` normalizes USDC (6 dec) to 1e18 internally, eliminating dust-sweep and rounding bugs.

**3. Vault solvency is an invariant** — 128 runs × 50 calls = 6,400 randomized state mutations, zero reverts against `totalLiquidity + totalLockedCollateral + totalTraderFreeCollateral == ASSET.balanceOf(vault)`.

**4. Isolated margin by default** — Cross-margin mode uses `_calculateGlobalPnL` iterating all active positions for holistic equity checks before liquidation.

---

## ✅ Deployed Contracts

All contracts deployed on **Ethereum Sepolia** and verified on Etherscan.

### Core Trading Engine

| Contract | Address | Etherscan |
|:---|:---|:---|
| **PositionManager** | `0x6952144C5dfb64DF54a64b61B3321Fd2C24cB42A` | [↗](https://sepolia.etherscan.io/address/0x6952144C5dfb64DF54a64b61B3321Fd2C24cB42A) |
| **PerpsVault** | `0x891FBf3C860333FB05f3f80526C3a1919de2d83c` | [↗](https://sepolia.etherscan.io/address/0x891FBf3C860333FB05f3f80526C3a1919de2d83c) |
| **LiquidationEngine** | `0xEE17eAF240c6b7C566E7431088FfC99551472669` | [↗](https://sepolia.etherscan.io/address/0xEE17eAF240c6b7C566E7431088FfC99551472669) |
| **PriceOracle** | `0x4Ca4A6fa3763b1AE2F3a09B17189152a608920f5` | [↗](https://sepolia.etherscan.io/address/0x4Ca4A6fa3763b1AE2F3a09B17189152a608920f5) |

### Account Abstraction (ERC-4337)

| Contract | Address | Etherscan |
|:---|:---|:---|
| **SmartAccount (Impl)** | `0x1e821F5796bc833FE020c05007f84dF040878d81` | [↗](https://sepolia.etherscan.io/address/0x1e821F5796bc833FE020c05007f84dF040878d81) |
| **AccountFactory** | `0xb6445BF0F856FDF2Fd261A5c32409d226D134221` | [↗](https://sepolia.etherscan.io/address/0xb6445BF0F856FDF2Fd261A5c32409d226D134221) |
| **NexusPaymaster** | `0x20e302881494F79eF5E536d5533be04F913eE652` | [↗](https://sepolia.etherscan.io/address/0x20e302881494F79eF5E536d5533be04F913eE652) |
| **EntryPoint (Standard)** | `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` | [↗](https://sepolia.etherscan.io/address/0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789) |

### Cross-Chain (Chainlink CCIP)

| Contract | Address | Etherscan |
|:---|:---|:---|
| **CrossChainRouter** | `0xE9b7f8F6c78054fb8d0D97585F32e7e026F5dd24` | [↗](https://sepolia.etherscan.io/address/0xE9b7f8F6c78054fb8d0D97585F32e7e026F5dd24) |
| **MessageReceiver** | `0x5A371254b7e69d83C3aA4823D0e6ec4de91e95ec` | [↗](https://sepolia.etherscan.io/address/0x5A371254b7e69d83C3aA4823D0e6ec4de91e95ec) |
| **CCIP Router (Sepolia)** | `0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59` | [↗](https://sepolia.etherscan.io/address/0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59) |
| **Sepolia Chain Selector** | `16015286601757825753` | CCIP config |

### Oracle Feeds & Assets

| Asset | Address | Notes |
|:---|:---|:---|
| **ETH/USD Feed** | `0x694AA1769357215DE4FAC081bf1f309aDC325306` | Chainlink Sepolia |
| **BTC/USD Feed** | `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43` | Chainlink Sepolia |
| **USDC (Collateral)** | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | Circle Testnet USDC |
| **WETH** | `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14` | Sepolia Testnet |
| **WBTC** | `0x29f2D40B0605204364af54EC677bD022dA425d03` | Sepolia Testnet |


---

### Contract Deep-Dives

#### `PositionManager.sol` — Trading Engine

Full position lifecycle: open → update → close → liquidate.

- **Market Orders** — `openPosition()` validates oracle price, locks collateral in vault, stores position at current Chainlink price
- **Limit Orders** — `placeLimitOrder()` locks collateral optimistically. Keeper calls `executeLimitOrder()` when price condition met, earns `keeperRewardBps` deducted from collateral
- **Cross-Chain Trades** — `executeCrossChainTrade()` gated by `onlyCrossChainReceiver`. Positions flagged `isCrossChain = true` bypass local vault settlement on close
- **Liquidations** — Isolated mode uses `PnLCalculator.isLiquidatable()`. Cross-margin computes `totalEquity = vaultCollateral + globalPnL` across all active positions via `_calculateGlobalPnL`
- **Asset Tracking** — Swap-and-pop O(1) removal. Capped at `maxActiveAssets` per trader

#### `PerpsVault.sol` — Collateral & Liquidity

Single contract holding all trader collateral and LP liquidity with strict dual accounting.

- **Dual accounting** — `traderCollateral` (free) and `lockedCollateral` (in positions) tracked separately. `totalTraderFreeCollateral` global invariant maintained on every state change
- **LP Shares** — First deposit burns `MINIMUM_LIQUIDITY = 1000` permanently preventing inflation attacks. Subsequent deposits: `sharesToMint = scaledAmount * totalLpShares / totalLiquidity`
- **`settleTrade()`** — Atomically unlocks collateral → adjusts `totalLiquidity` for PnL → credits payout to trader. Physical token balance checked as safety floor before payout
- **Dust prevention** — `withdraw()` enforces `scaledAmount % DECIMALS_SCALAR == 0`

#### `PnLCalculator.sol` — Math Library

Pure Solidity library, zero state, no imports except interfaces.

```
positionSize   = (collateral × leverage) / 1e18
PnL            = (priceDelta × positionSize) / entryPrice
isLiquidatable = equity ≤ maintenanceMargin
               = (collateral + PnL) ≤ (collateral × liquidationThresholdBps / 10000)
```

Overflow guard inside `unchecked {}`: checks `priceDelta * size <= type(uint256).max` before multiplication. Reverts with `PerpsErrors.InvalidAmount()` on overflow.

#### `SmartAccount.sol` — ERC-4337 Wallet

EIP-1167 clone-compatible, EIP-712 structured signing.

- `validateUserOp()` — verifies nonce, recovers signer from `USER_OP_TYPEHASH` struct hash via `ECDSA.tryRecover`. Pays `missingAccountFunds` to EntryPoint. Returns `0` (success) or `1` (failure)
- `execute()` / `executeBatch()` — callable only by EntryPoint. Batch validates array length parity. Uses inline `assembly { revert(add(result, 32), mload(result)) }` to bubble downstream errors
- `_disableInitializers()` in constructor prevents the implementation contract itself from being initialized as an attack vector

#### `NexusPaymaster.sol` — Gas Sponsor

Packed storage: `verifyingSigner` (20 bytes) + `maxCostLimit` (12 bytes) fits in 1 storage slot.

- `paymasterAndData` must be exactly `85 bytes` (20 addr + 65 sig) — any other length rejected
- Signs `keccak256(userOpHash, block.chainid, address(this))` — chain + contract binding prevents cross-chain replay

#### `CrossChainRouter.sol` — CCIP Sender

- Encodes `(trader, nonce, token, isLong, margin, leverage)` as ABI payload, sent via `CCIP_ROUTER.ccipSend`
- Refunds surplus ETH via `call{value: refundAmount, gas: 3000}` — intentionally ignores return (no reentrancy vector, documented in code)
- `rescueFunds()` differentiates ETH rescue (`address(this).balance - operationalBalance`) from ERC20 rescue to prevent double-counting

#### `MessageReceiver.sol` — CCIP Receiver

- Source chain whitelist + sender address whitelist — double-gated access control
- Per-trader nonce deduplication: `processedNonces[trader][nonce]` prevents replay before execution
- `try/catch` wraps `positionManager.executeCrossChainTrade()` — failed trades emit `TradeFailed` but **never** block the CCIP pipeline

---

## 💻 Frontend Stack

**Next.js 14 App Router** with zero backend dependency for read operations. All contract reads use Wagmi v2 + Viem directly from the browser.

### Technology

| Layer | Technology |
|:---|:---|
| Framework | Next.js 14 (TypeScript, App Router) |
| Blockchain | Wagmi v2 + Viem |
| Wallet UI | RainbowKit (MetaMask, WalletConnect, Coinbase Wallet) |
| Queries | TanStack Query v5 |
| Styling | Tailwind CSS |
| Fonts | Syne (display) · Space Mono (mono) |
| RPC | Alchemy primary → PublicNode → Sepolia.org → Infura public (fallback chain) |

### Smart Account Login Flow

`AccountVerification.tsx` (`'use client'`) drives a 5-step state machine via `useNexusAccount`:

```
idle
 └─▶ fetching_nonce       GET /api/sign/route.ts → server generates EIP-712 nonce
       └─▶ awaiting_signature   wallet.signTypedData()
             └─▶ verifying      POST /api/sign → server verifies signature + issues JWT
                   └─▶ deploying_account  AccountFactory.createAccount() if new wallet
                         └─▶ done    24h session active · gas sponsored by NexusPaymaster
```

Each step renders its own UI: spinner, progress bar, error retry. `page.tsx` (Server Component) simply imports `<AccountVerification />` — no `'use client'` needed on the page, no server/client boundary error.

---

### Testing Methodology

**Unit Tests** — Every function in isolation. Success paths, revert conditions, access control, edge cases (zero amounts, stale prices, unauthorized callers, zero addresses).

**Integration Tests:**
- `AAFlowIntegrationTest` — Smart account deploy → UserOp validation → batch trade execution → unauthorized block
- `CrossChainIntegrationFlowTest` — Full CCIP encode → router send → receiver decode → PositionManager execute → invalid asset revert → direct call block
- `LiquidationFlowIntegrationTest` — Stale price oracle protection, precise math solvency, mixed-state batch resilience

**Fuzz Tests (256 runs each):**
- `testFuzz_OpenRandomPositions` — random collateral + leverage, validates no panic or unexpected revert
- `testFuzz_LiquidationMathSolvency` — validates vault never insolvent under any liquidation scenario

**Invariant Tests (128 runs × 50 calls = 6,400 state mutations, 0 reverts):**

```
╭─────────────────────┬────────────────────┬───────┬─────────┬──────────╮
│ Contract            │ Selector           │ Calls │ Reverts │ Discards │
╞═════════════════════╪════════════════════╪═══════╪═════════╪══════════╡
│ PositionHandler     │ changeOraclePrice  │ 1,541 │       0 │        0 │
│ PositionHandler     │ createTrader       │ 1,603 │       0 │        1 │
│ PositionHandler     │ openRandomPosition │ 1,659 │       0 │        0 │
│ PositionHandler     │ tryLiquidation     │ 1,598 │       0 │        0 │
╰─────────────────────┴────────────────────┴───────┴─────────┴──────────╯
```

- `invariant_VaultIsSolvent` — `totalLiquidity ≥ 0` holds across all state mutations
- `invariant_InternalAccountingConsistent` — sum of all internal balances matches physical `ASSET.balanceOf(vault)`
- `invariant_MaxActiveAssetsRespected` — no trader ever exceeds `maxActiveAssets`

---

## 🛠️ Local Setup

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, cast, anvil)
- Node.js ≥ 18
- Alchemy API key for Sepolia RPC

### Smart Contracts

```bash
git clone https://github.com/NexTechArchitect/Nexus-Protocol.git
cd Nexus-Protocol

# Install Foundry dependencies
forge install

# Run full test suite (95 tests, ~3s)
forge test -vv

# Generate coverage report
forge coverage

# Deploy to Sepolia
cp .env.example .env
# Fill: PRIVATE_KEY, RPC_URL, ETHERSCAN_API_KEY
forge script script/deploy/05_FullDeploy.s.sol --rpc-url sepolia --broadcast --verify
```


### Get Testnet USDC

1. Go to **[faucet.circle.com](https://faucet.circle.com/)**
2. Select **Ethereum Sepolia** (not mainnet)
3. Enter wallet address → receive USDC
4. Deposit via **Vaults** page → start trading

---

## 🔐 Security Model

| Attack Vector | Mitigation |
|:---|:---|
| Oracle price manipulation | Chainlink `latestRoundData()` + `block.timestamp - updatedAt > heartbeat` staleness revert |
| Reentrancy | `ReentrancyGuard` on all vault state-changing functions: `settleTrade`, `transferByManager`, `batchLiquidate` |
| LP share inflation attack | `MINIMUM_LIQUIDITY = 1000` permanently burned on genesis deposit |
| Dust sweep / precision drain | `scaledAmount % DECIMALS_SCALAR != 0` reverts on withdrawal |
| Cross-chain replay | Per-trader nonce map in `MessageReceiver` + `block.chainid` binding in `NexusPaymaster` |
| Unauthorized cross-chain calls | `onlyCrossChainReceiver` + source chain whitelist + sender whitelist (3 layers) |
| Over-withdrawal during active position | `lockedCollateral` tracking prevents withdrawing margin from open positions |
| Paymaster signature forgery | `keccak256(userOpHash, block.chainid, address(this))` — chain + contract bound |
| CCIP pipeline blocking | `try/catch` in `_ccipReceive` — failed trades emit `TradeFailed`, never block the pipeline |
| Keeper reward rug pull | `rescueTokens()` explicitly blocks `PROTOCOL_ASSET` from owner withdrawal |
| Implementation contract initialization | `_disableInitializers()` in `SmartAccount` constructor |


---

<div align="center">

**Built with ⚡ by [NexTech Architect](https://github.com/NexTechArchitect)**


*Smart Contract Developer · Solidity · Foundry · Full Stack Web3*

</div>
