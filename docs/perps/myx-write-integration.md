# MYX Write Integration — Key Learnings

## Overview

This PR adds write support (order placement) for the MYX perps provider and fixes a critical decimal scaling bug in the read path. Validated end-to-end on Linea Sepolia testnet — both via standalone script and in-app via CDP.

## Validated Flows

| Flow                                      | Tx / Evidence                                       |
| ----------------------------------------- | --------------------------------------------------- |
| Standalone script → `createIncreaseOrder` | `0x5cccd00f...b1b9` (Linea Sepolia block 26658458)  |
| In-app `placeOrder()` via CDP             | Position size increased 0.148 → 0.248 SGLT          |
| Mainnet reads (BNB Chain 56)              | Markets, positions, orders, history — all working   |
| Testnet reads (Linea Sepolia 59141)       | Markets, positions, orders, fee rates — all working |

## SDK Integration Gotchas

### 1. Ethers v5 vs v6 conflict

The project uses ethers v5.7.2. The MYX SDK bundles ethers v6.16.0 internally. Without a Metro resolver, the SDK gets the wrong ethers version and `BrowserProvider`, `Contract` v6 APIs don't exist.

**Fix:** Metro resolver in `metro.config.js` forces `@myx-trade/sdk` imports of `ethers` to resolve to the SDK's nested v6 copy.

### 2. `signer.getAddress()` called without await

The SDK calls `config.signer.getAddress()` synchronously in `getUserTradingFeeRate`. If `getAddress` is async, the SDK gets a Promise object instead of a string → contract call fails with "unsupported addressable value".

**Fix:** `MYXWalletService.createEthersSigner().getAddress()` is synchronous.

### 3. Gas parameters must be passed through

The SDK's `BrowserProvider` calculates gas pricing and passes it in `eth_sendTransaction` params. If the transport handler drops these and lets the wallet recalculate, the result can be below the chain's minimum gas price.

**Fix:** Transport passes `gasPrice`, `maxFeePerGas`, `maxPriorityFeePerGas` through to `TransactionController:addTransaction`.

### 4. `positionId` must be falsy for new positions

The SDK routes to `placeOrderWithSalt` (new position) when `positionId` is falsy, or `placeOrderWithPosition` (add to existing) when truthy. `'0'` is a truthy string → SDK tries to decode it as bytes32 → encoding error.

**Fix:** Use empty string `''` for new positions.

### 5. Collateral decimals vary by network

- USDT on BNB mainnet: **18 decimals** (verified on-chain)
- USDC on Linea Sepolia testnet: **6 decimals** (verified on-chain)

The `collateralAmount` passed to `createIncreaseOrder` must match the token's native decimals.

**Fix:** `MYX_COLLATERAL_DECIMALS` is `Record<MYXNetwork, number>` with `toMYXCollateral(amount, network)`.

### 6. REST API returns human-readable values

The MYX REST API (positions, orders, history) returns prices, sizes, collateral, fees as human-readable strings (`"73485.10"`, `"0.00136159"`). Only the SDK contract layer uses 18/30-decimal scaling.

**Fix:** Read path uses `fromMYXApiSize()`/`fromMYXApiCollateral()` (simple parseFloat) instead of `fromMYXSize()`/`fromMYXCollateral()` (divide by 10^18).

### 7. Market order price must not be zero

When no price is provided for a market order, the SDK sends price=0 to the contract → reverts. For market orders, a high accepted price (LONG) or low accepted price (SHORT) must be provided.

**Fix:** `placeOrder()` fetches ticker price and applies 5% buffer when no explicit price given.

## Remaining Blockers

| Blocker                        | Impact                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| SDK missing chain 56 contracts | Mainnet writes impossible — `getContractAddressByChainId(56)` returns `{}`. Reported to JC. |
| Other write ops                | `closePosition`, `cancelOrder`, `editOrder` are stubs                                       |

## Files Changed

| File                           | What changed                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `metro.config.js`              | Ethers v6 resolver for `@myx-trade/sdk`                                                                   |
| `constants/myxConfig.ts`       | `MYX_COLLATERAL_DECIMALS` per-network, `toMYXCollateral()`, `toMYXContractPrice()`, `fromMYXApi*` helpers |
| `providers/MYXProvider.ts`     | Full `placeOrder()` implementation with price/collateral/fee logic                                        |
| `services/MYXClientService.ts` | `createIncreaseOrder`, `createDecreaseOrder`, `getUserTradingFeeRate`                                     |
| `services/MYXWalletService.ts` | EIP-1193 transport with gas param passthrough, sync `getAddress()`                                        |
| `utils/myxAdapter.ts`          | Switched from 18-decimal to parseFloat for REST API values                                                |
| `index.ts`                     | Added `fromMYXApiSize`, `fromMYXApiCollateral` exports                                                    |
