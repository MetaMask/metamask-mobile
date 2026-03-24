# MYX Integration Status

## 1. Executive Summary

**SDK**: `@myx-trade/sdk` v1.0.3 (feature branch `feat/perps/myx-write-integration`)

**Architecture**:

```
UI Hooks/Views
  -> PerpsController (AggregatedPerpsProvider)
    -> MYXProvider
      -> MYXClientService  (@myx-trade/sdk -> MYX REST API + WS for klines)
      -> MYXWalletService  (signing via MetaMask KeyringController)
```

**Collateral**: USDT on BNB Chain (mainnet), USDC on Linea Sepolia (testnet)

**Data delivery**: All subscriptions via REST polling (5s interval) except candle charts which use hybrid REST + WebSocket (historical via REST, live ticks via MYX SDK `subscribeKline`).

**Hyperliquid comparison**: HL uses direct REST API (no SDK), full WebSocket streaming for all data, USDC on Arbitrum. MYX uses the `@myx-trade/sdk` which wraps REST + limited WS, on-chain transactions for every trade (vs HL's off-chain matching engine).

---

## 2. Implementation Status Matrix

### PerpsProvider Interface Methods

#### Fully Implemented

| #   | Method                        | Transport      | Notes                                                                        |
| --- | ----------------------------- | -------------- | ---------------------------------------------------------------------------- |
| 1   | `initialize`                  | REST           | Fetches markets, filters MYX-exclusive, builds pool-symbol map               |
| 2   | `disconnect`                  | -              | Clears caches, stops polling                                                 |
| 3   | `ping`                        | REST           | Delegates to MYXClientService                                                |
| 4   | `isReadyToTrade`              | -              | Checks messenger + auth status                                               |
| 5   | `getMarkets`                  | REST           | Fetches pools, per-pool min order sizes, adapts via `myxAdapter`             |
| 6   | `getMarketDataWithPrices`     | REST           | Tickers for all pools, adapted to `PerpsMarketData`                          |
| 7   | `subscribeToPrices`           | REST poll (5s) | Ticker polling + 60s market detail refresh (funding, OI, volume)             |
| 8   | `placeOrder`                  | on-chain tx    | Market + limit orders, TP/SL, min order size validation, leverage            |
| 9   | `cancelOrder`                 | on-chain tx    | Single order cancellation via SDK `cancelOrder`                              |
| 10  | `cancelOrders`                | on-chain tx    | Batch cancel via SDK `cancelOrders`                                          |
| 11  | `closePosition`               | on-chain tx    | Full + partial close, slippage handling, fetches raw position for positionId |
| 12  | `updatePositionTPSL`          | on-chain tx    | TP/SL via SDK `createPositionTpSlOrder`                                      |
| 13  | `updateMargin`                | on-chain tx    | Add/remove margin via SDK `adjustCollateral`                                 |
| 14  | `editOrder`                   | on-chain tx    | Update order size/price/TP/SL via SDK `updateOrderTpSl`                      |
| 15  | `closePositions`              | on-chain tx    | Batch close: loops over `closePosition` sequentially                         |
| 14  | `getPositions`                | REST           | Fetches positions + tickers for PnL calculation                              |
| 15  | `getAccountState`             | REST           | Pool iteration for account tuple, decimal scaling, ROE calculation           |
| 16  | `getOrders`                   | REST           | Order history (limit 50)                                                     |
| 17  | `getOpenOrders`               | REST           | Pool open orders via dedicated endpoint                                      |
| 18  | `getOrderFills`               | REST           | Filtered order history (status=Successful)                                   |
| 19  | `getOrFetchFills`             | REST           | Delegates to `getOrderFills` (no WS cache)                                   |
| 20  | `getFunding`                  | REST           | Trade flow data adapted to funding format                                    |
| 21  | `getUserHistory`              | REST           | Trade flow data adapted to history items                                     |
| 22  | `validateOrder`               | local          | Min order size (per-pool + static), leverage range, max order value          |
| 23  | `validateClosePosition`       | local          | Symbol, price, partial close size checks                                     |
| 24  | `validateDeposit`             | local          | Always returns valid (deposit validation deferred)                           |
| 25  | `calculateLiquidationPrice`   | local          | Isolated-margin approximation using maintenance margin ratio                 |
| 26  | `calculateMaintenanceMargin`  | local          | `1 / (2 * maxLeverage)`                                                      |
| 27  | `getMaxLeverage`              | local          | Returns `MYX_MAX_LEVERAGE` constant                                          |
| 28  | `calculateFees`               | local          | Static fee rates (`MYX_FEE_RATE`, `MYX_PROTOCOL_FEE_RATE`)                   |
| 29  | `subscribeToPositions`        | REST poll (5s) | Polling wrapper around `getPositions`                                        |
| 30  | `subscribeToOrders`           | REST poll (5s) | Polling wrapper around `getOpenOrders`                                       |
| 31  | `subscribeToOrderFills`       | REST poll (5s) | Polling wrapper around `getOrderFills`                                       |
| 32  | `subscribeToAccount`          | REST poll (5s) | Polling wrapper around `getAccountState`                                     |
| 33  | `subscribeToCandles`          | REST + WS      | Historical via REST, live via `subscribeKline` WebSocket                     |
| 34  | `getDepositRoutes`            | local          | Returns 1 route: USDT/USDC to MYX Account contract                           |
| 35  | `getBlockExplorerUrl`         | local          | BscScan (mainnet) / Arbiscan Sepolia (testnet)                               |
| 36  | `getWebSocketConnectionState` | local          | Always returns `Connected` (REST-based)                                      |
| 37  | `subscribeToConnectionState`  | local          | No-op (no WS state changes)                                                  |
| 38  | `reconnect`                   | local          | No-op (no WS to reconnect)                                                   |
| 39  | `setLiveDataConfig`           | local          | No-op                                                                        |

#### Stubbed / Not Yet Implemented

| #   | Method                           | Returns                      | Reason                           |
| --- | -------------------------------- | ---------------------------- | -------------------------------- |
| 1   | `withdraw`                       | `{ success: false, error }`  | No withdrawal flow implemented   |
| 4   | `getWithdrawalRoutes`            | `[]`                         | No withdrawal support            |
| 5   | `getHistoricalPortfolio`         | `{ accountValue1dAgo: '0' }` | No data source                   |
| 6   | `getUserNonFundingLedgerUpdates` | `[]`                         | No data source                   |
| 7   | `subscribeToOrderBook`           | `{ bids: [], asks: [] }`     | MYX SDK has no L2 book endpoint  |
| 8   | `subscribeToOICaps`              | `[]`                         | No OI caps data from MYX         |
| 9   | `setUserFeeDiscount`             | no-op                        | No MYX referral/discount program |
| 10  | `toggleTestnet`                  | `{ success: false }`         | Mainnet not yet available        |
| 11  | `validateWithdrawal`             | `{ isValid: false }`         | No withdrawal support            |
| 12  | `getAvailableDexs`               | `[]`                         | No HIP-3 equivalent in MYX       |

---

## 3. Hyperliquid vs MYX Comparison

### Architecture Differences

| Aspect             | HyperLiquid                                                | MYX                                                    |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------------------ |
| **SDK**            | No SDK — direct REST + WS                                  | `@myx-trade/sdk` v1.0.3                                |
| **Execution**      | Off-chain matching engine                                  | On-chain transactions (BNB/Linea)                      |
| **Collateral**     | USDC on Arbitrum                                           | USDT on BNB (mainnet), USDC on Linea Sepolia (testnet) |
| **Signing**        | EIP-712 typed data (off-chain)                             | On-chain tx via `TransactionController`                |
| **Confirmation**   | Instant (off-chain match)                                  | Block confirmation required                            |
| **Data streaming** | Full WebSocket (prices, positions, orders, fills, account) | REST polling (5s) + WS for klines only                 |

### Feature Parity

| Feature                       | HyperLiquid    | MYX                       | Gap Type                |
| ----------------------------- | -------------- | ------------------------- | ----------------------- |
| Market orders                 | Yes            | Yes                       | -                       |
| Limit orders                  | Yes            | Yes                       | -                       |
| TP/SL orders                  | Yes            | Yes                       | -                       |
| Close position (full/partial) | Yes            | Yes                       | -                       |
| Cancel order (single/batch)   | Yes            | Yes                       | -                       |
| Update margin (add/remove)    | Yes            | Yes                       | -                       |
| Edit order                    | Yes            | Yes                       | -                       |
| Batch close positions         | Yes            | Yes                       | -                       |
| Order book depth              | Yes (L2 WS)    | **No**                    | Protocol limitation     |
| Deposit flow (UI)             | Yes            | **Partial** (routes only) | Deferred                |
| Withdrawal flow               | Yes            | **No**                    | Deferred                |
| Pay with any token            | Yes            | **No**                    | Requires deposit flow   |
| Spot market                   | Yes            | **No**                    | Protocol limitation     |
| Historical portfolio          | Yes            | **No**                    | Deferred                |
| Fee discounts (referral)      | Yes (HIP-3)    | **No**                    | Protocol limitation     |
| Multi-DEX routing             | Yes (HIP-3)    | **No**                    | Protocol limitation     |
| Real-time WS streaming        | Yes (all data) | **Klines only**           | Protocol/SDK limitation |
| Funding rate (real-time)      | Yes (WS)       | REST (60s cache)          | SDK limitation          |
| OI caps                       | Yes            | **No**                    | Protocol limitation     |
| Testnet + mainnet             | Yes            | **Testnet only**          | Deferred                |

### MYX Protocol Limitations (Cannot Implement)

These are fundamental to the MYX protocol and cannot be added on our side:

1. **No order book depth** — MYX SDK has no L2 book endpoint. MYX uses AMM pools, not an order book.
2. **No spot market** — MYX is perpetuals-only.
3. **No multi-DEX routing** — MYX is a single exchange (no HIP-3 equivalent).
4. **No referral/staking fee discounts** — Not part of the MYX protocol.
5. **No real-time WebSocket for positions/orders/account** — SDK only supports kline WS. Documented in `docs/perps/myx-websocket-gaps.md`.

### Deferred Implementation (Can Be Built)

1. **Deposit flow UI** — `getDepositRoutes()` already returns routes; UI integration pending.
2. **Withdrawal flow** — Needs MYX SDK withdrawal call + route definition.
3. **Pay with any token** — Requires deposit flow + swap routing on BNB chain.
4. **Historical portfolio** — Needs data source (aggregate from trade history?).
5. **Mainnet support** — Toggle `isTestnet` flag + verify mainnet contracts.

---

## 4. UI Testing Checklist

### Read-Only Flows

| Screen / Feature    | Expected Behavior                                                                         | Status      |
| ------------------- | ----------------------------------------------------------------------------------------- | ----------- |
| Market list         | MYX-exclusive markets visible (filtered to exclude BTC/ETH/BNB/PUMP/WLFI overlap with HL) | Should work |
| Market prices       | Live prices updating every ~5s via REST polling                                           | Should work |
| Market details      | Price chart, funding rate, volume, OI displayed                                           | Should work |
| Candle chart        | Historical candles load + live WS updates                                                 | Should work |
| Provider selector   | Switch between HL and MYX                                                                 | Should work |
| Positions list      | All MYX positions with PnL, leverage, liq price, entry price                              | Should work |
| Orders list         | Open orders (pending limits, TP/SL) displayed                                             | Should work |
| Order fills         | Filled order history                                                                      | Should work |
| Account state       | Balance, margin used, unrealized PnL, ROE                                                 | Should work |
| Funding history     | Funding payments listed                                                                   | Should work |
| Transaction history | Trade flow items adapted to history format                                                | Should work |

### Write Flows

| Action                      | Expected Behavior                                                             | Status                             |
| --------------------------- | ----------------------------------------------------------------------------- | ---------------------------------- |
| Place market order (long)   | Order submitted, tx confirmation screen, position appears after block confirm | Needs testing                      |
| Place market order (short)  | Same as long, opposite direction                                              | Needs testing                      |
| Place limit order           | Order submitted, appears in open orders                                       | Needs testing (testnet may reject) |
| Place order with TP/SL      | Order placed + TP/SL trigger orders created                                   | Needs testing                      |
| Close position (full)       | Position removed, balance updated                                             | Verified on testnet                |
| Close position (partial)    | Position size reduced                                                         | Needs testing                      |
| Cancel single order         | Order removed from open orders                                                | Code verified, not e2e tested      |
| Cancel all orders (batch)   | All open orders cancelled                                                     | Needs testing                      |
| Update TP/SL on position    | TP/SL orders updated                                                          | Needs testing                      |
| Add margin to position      | Collateral increased, leverage decreased                                      | Needs testing                      |
| Remove margin from position | Collateral decreased, leverage increased                                      | Needs testing                      |

### Known Not Working

| Feature                     | Behavior                                      | Root Cause              |
| --------------------------- | --------------------------------------------- | ----------------------- |
| Edit order                  | Submits on-chain tx via SDK `updateOrderTpSl` | Implemented             |
| Close all positions (batch) | Loops `closePosition` for each open position  | Implemented             |
| Withdraw                    | Error toast                                   | No withdrawal flow      |
| Order book                  | Shows empty                                   | No MYX L2 book endpoint |
| Historical portfolio        | Shows zeros                                   | No data source          |
| Deposit flow (end-to-end)   | Routes returned but UI flow not connected     | UI integration pending  |
| Mainnet toggle              | Error: "MYX mainnet not yet available"        | Deferred                |

---

## 5. Big Missing Features

### 1. Deposit Flow

- `getDepositRoutes()` returns 1 route (USDT/USDC to MYX Account contract address)
- The route data is there, but the end-to-end deposit UI flow isn't connected for MYX
- HL flow: user selects token -> swap if needed -> bridge to Arbitrum -> deposit to HL
- MYX equivalent: user sends USDT directly to MYX Account contract on BNB Chain
- Gap: no swap routing for BNB chain tokens, deposit UI doesn't invoke MYX-specific contract calls

### 2. Withdrawal Flow

- `getWithdrawalRoutes()` returns `[]` — no withdrawal mechanism implemented
- MYX protocol supports withdrawals (moving collateral out of the pool)
- Needs: withdrawal transaction via MYX SDK + route definition + UI integration

### 3. Pay with Any Token

- Current HL flow: any ERC-20 -> swap to USDC -> bridge to Arbitrum -> deposit to HL
- MYX equivalent: any token -> swap to USDT -> send to MYX Account on BNB
- Blocked by: deposit flow must work first, then swap integration for BNB chain tokens

### 4. Order Book

- MYX uses AMM pools (no traditional order book)
- MYX SDK doesn't expose L2 book data via API or WebSocket
- Impact: order book depth chart shows empty for MYX markets
- This is a protocol limitation — documented in `docs/perps/myx-websocket-gaps.md`

### 5. Mainnet

- `toggleTestnet()` returns error: "MYX mainnet not yet available"
- All current testing is on Linea Sepolia testnet with USDC
- Mainnet would use BNB Chain with USDT
- Needs: verification of mainnet contract addresses, fee structures, and pool configs

---

## 6. Files Changed in This Branch

112 files with MYX/perps changes. Organized by category:

### Core Provider Layer

| File                                                      | Purpose                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| `app/controllers/perps/providers/MYXProvider.ts`          | Main provider — all PerpsProvider interface methods        |
| `app/controllers/perps/providers/MYXProvider.test.ts`     | Unit tests for MYXProvider                                 |
| `app/controllers/perps/services/MYXClientService.ts`      | SDK wrapper — REST calls, auth, price polling, WS klines   |
| `app/controllers/perps/services/MYXClientService.test.ts` | Unit tests for MYXClientService                            |
| `app/controllers/perps/services/MYXWalletService.ts`      | Wallet integration — signing, signer/walletClient creation |
| `app/controllers/perps/services/MYXWalletService.test.ts` | Unit tests for MYXWalletService                            |
| `app/controllers/perps/utils/myxAdapter.ts`               | SDK type -> PerpsProvider type adapters                    |
| `app/controllers/perps/utils/myxAdapter.test.ts`          | Unit tests for adapters                                    |
| `app/controllers/perps/types/myx-types.ts`                | MYX-specific TypeScript types                              |
| `app/controllers/perps/constants/myxConfig.ts`            | MYX constants (fees, contracts, collateral config)         |

### Controller & Infrastructure

| File                                                                | Purpose                                                |
| ------------------------------------------------------------------- | ------------------------------------------------------ |
| `app/controllers/perps/PerpsController.ts`                          | AggregatedPerpsProvider — multi-provider orchestration |
| `app/controllers/perps/PerpsController.test.ts`                     | Controller tests                                       |
| `app/controllers/perps/PerpsController-method-action-types.ts`      | Action type mappings for controller methods            |
| `app/controllers/perps/index.ts`                                    | Barrel exports                                         |
| `app/controllers/perps/constants/perpsConfig.ts`                    | Shared perps constants                                 |
| `app/controllers/perps/constants/hyperLiquidConfig.ts`              | HL-specific config (modified for multi-provider)       |
| `app/controllers/perps/constants/eventNames.ts`                     | Analytics event names                                  |
| `app/controllers/perps/services/AccountService.ts`                  | Account operations service                             |
| `app/controllers/perps/services/TradingService.ts`                  | Trading operations service                             |
| `app/controllers/perps/services/MarketDataService.ts`               | Market data service                                    |
| `app/controllers/perps/services/DataLakeService.ts`                 | Data lake service                                      |
| `app/controllers/perps/services/FeatureFlagConfigurationService.ts` | Feature flag config                                    |
| `app/controllers/perps/services/HyperLiquidSubscriptionService.ts`  | HL subscription service (modified for multi-provider)  |
| `app/controllers/perps/types/index.ts`                              | Shared type definitions (PerpsProvider interface)      |
| `app/controllers/perps/utils/hyperLiquidAdapter.ts`                 | HL adapter (modified)                                  |
| `app/controllers/perps/utils/marketDataTransform.ts`                | Market data transforms                                 |
| `app/controllers/perps/utils/orderCalculations.ts`                  | Order calculation utilities                            |
| `app/controllers/perps/utils/rewardsUtils.ts`                       | Rewards utilities                                      |

### UI Layer

| File                                                            | Purpose                                       |
| --------------------------------------------------------------- | --------------------------------------------- |
| `app/components/UI/Perps/Views/PerpsHomeView/`                  | Home view (multi-provider tabs)               |
| `app/components/UI/Perps/Views/PerpsMarketListView/`            | Market list (MYX markets displayed)           |
| `app/components/UI/Perps/Views/PerpsMarketDetailsView/`         | Market detail (chart, stats, order form)      |
| `app/components/UI/Perps/Views/PerpsOrderView/`                 | Order form view                               |
| `app/components/UI/Perps/Views/PerpsClosePositionView/`         | Close position view                           |
| `app/components/UI/Perps/Views/PerpsOrderBookView/`             | Order book (empty for MYX)                    |
| `app/components/UI/Perps/Views/PerpsTabView/`                   | Tab navigation                                |
| `app/components/UI/Perps/Views/PerpsTransactionsView/`          | Transaction history                           |
| `app/components/UI/Perps/Views/PerpsSelectModifyActionView/`    | Position modify actions                       |
| `app/components/UI/Perps/hooks/usePerpsOrderForm.ts`            | Order form logic (min order size)             |
| `app/components/UI/Perps/hooks/usePerpsOrderExecution.ts`       | Order execution                               |
| `app/components/UI/Perps/hooks/usePerpsOrderValidation.ts`      | Order validation                              |
| `app/components/UI/Perps/hooks/usePerpsTrading.ts`              | Trading hook                                  |
| `app/components/UI/Perps/hooks/usePerpsHomeData.ts`             | Home data hook                                |
| `app/components/UI/Perps/hooks/usePerpsMarketStats.ts`          | Market stats                                  |
| `app/components/UI/Perps/hooks/usePerpsNavigation.ts`           | Navigation                                    |
| `app/components/UI/Perps/hooks/usePerpsNetworkManagement.ts`    | Network management                            |
| `app/components/UI/Perps/hooks/usePerpsPositions.test.ts`       | Position hook tests                           |
| `app/components/UI/Perps/hooks/stream/usePerpsLivePositions.ts` | Live position streaming                       |
| `app/components/UI/Perps/adapters/mobileInfrastructure.ts`      | Mobile platform adapter                       |
| Various component files                                         | Skeleton loaders, cards, tooltips, tabs, etc. |

### Documentation

| File                                           | Purpose                              |
| ---------------------------------------------- | ------------------------------------ |
| `MYX-INTEGRATION-TRACKER.md`                   | This document                        |
| `docs/perps/myx-websocket-gaps.md`             | WebSocket gaps analysis for MYX team |
| `docs/perps/myx-integration-status.md`         | Integration status notes             |
| `docs/perps/myx-validation-flows.md`           | Validation flow documentation        |
| `docs/perps/myx-validation-report.md`          | Testnet validation report            |
| `docs/perps/myx/SDK_INTEGRATION_GUIDE_EN.md`   | MYX SDK integration guide            |
| `docs/perps/myx/myx-contract-addresses-v2.txt` | Contract addresses                   |
| `docs/perps/perps-metametrics-reference.md`    | Analytics events reference           |

### PoC Scripts

| File                                               | Purpose                         |
| -------------------------------------------------- | ------------------------------- |
| `scripts/perps/myx-poc/placeOrder.ts`              | PoC: place order via CLI        |
| `scripts/perps/myx-poc/closeOrder.ts`              | PoC: close position via CLI     |
| `scripts/perps/myx-poc/increasePosition.ts`        | PoC: increase position          |
| `scripts/perps/myx-poc/addTpSl.ts`                 | PoC: add TP/SL                  |
| `scripts/perps/myx-poc/showAccount.ts`             | PoC: show account state         |
| `scripts/perps/myx-poc/listMarkets.ts`             | PoC: list markets               |
| `scripts/perps/myx-poc/listOrders.ts`              | PoC: list orders                |
| `scripts/perps/myx-poc/checkPoolMinOrder.ts`       | PoC: check pool min order sizes |
| `scripts/perps/myx-poc/common.ts`                  | Shared PoC utilities            |
| `scripts/perps/myx-poc/format.ts`                  | Formatting utilities            |
| `scripts/perps/myx-poc/MYX-SDK-REFERENCE.md`       | SDK API reference               |
| `scripts/perps/myx-poc/MYX-SDK-INCONSISTENCIES.md` | SDK type inconsistencies        |

### Testing & CI

| File                                                             | Purpose                        |
| ---------------------------------------------------------------- | ------------------------------ |
| `scripts/perps/agentic/cdp-bridge.js`                            | CDP bridge for agentic testing |
| `scripts/perps/agentic/recipes/myx.json`                         | MYX validation recipes         |
| `scripts/perps/validate-core-sync.sh`                            | Core sync validation           |
| `tests/api-mocking/mock-responses/defaults/perps-hyperliquid.ts` | Mock responses                 |
| Various `.test.ts` / `.test.tsx` files                           | Unit and component tests       |

---

## 7. Known Issues & Workarounds

| Issue                                                    | Workaround                                            | File                     |
| -------------------------------------------------------- | ----------------------------------------------------- | ------------------------ |
| MYX SDK `PositionType` missing `userLeverage`            | Cast `rawPos as unknown as { userLeverage?: number }` | `MYXProvider.ts:1093`    |
| `getAccountInfo` returns tuple (array), not keyed object | `parseAccountTuple()` helper                          | `myxAdapter.ts`          |
| Testnet SGLT pool rejects limit orders (`0x613970e0`)    | Cannot test limit orders on testnet                   | Known limitation         |
| Pool config `minOrderSizeInUsd` unreliable on testnet    | Static $100 floor with 1.1x buffer                    | `MYXProvider.ts:755-764` |
| SDK gas price estimation missing                         | Fetch `eth_gasPrice` from RPC in `MYXWalletService`   | `MYXWalletService.ts`    |
| Tx stuck on confirmation screen                          | `requireApproval: false` in wallet service            | `MYXWalletService.ts`    |
