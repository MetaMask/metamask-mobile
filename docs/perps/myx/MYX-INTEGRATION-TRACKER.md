# MYX Integration Tracker

Single source of truth for the MYX perps provider integration.

Branch: `feat/perps/myx-write-integration`
Last updated: 2026-03-27

---

## 1. Executive Summary

**SDK**: `@myx-trade/sdk` v1.0.6

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

#### Fully Implemented (39 methods)

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
| 16  | `getPositions`                | REST           | Fetches positions + tickers for PnL calculation                              |
| 17  | `getAccountState`             | REST           | Pool iteration for account tuple, decimal scaling, ROE calculation           |
| 18  | `getOrders`                   | REST           | Order history (limit 50)                                                     |
| 19  | `getOpenOrders`               | REST           | Pool open orders via dedicated endpoint                                      |
| 20  | `getOrderFills`               | REST           | Filtered order history (status=Successful)                                   |
| 21  | `getOrFetchFills`             | REST           | Delegates to `getOrderFills` (no WS cache)                                   |
| 22  | `getFunding`                  | REST           | Trade flow data adapted to funding format                                    |
| 23  | `getUserHistory`              | REST           | Trade flow data adapted to history items                                     |
| 24  | `validateOrder`               | local          | Min order size (per-pool + static), leverage range, max order value          |
| 25  | `validateClosePosition`       | local          | Symbol, price, partial close size checks                                     |
| 26  | `validateDeposit`             | local          | Always returns valid (deposit validation deferred)                           |
| 27  | `calculateLiquidationPrice`   | local          | Isolated-margin approximation using maintenance margin ratio                 |
| 28  | `calculateMaintenanceMargin`  | local          | `1 / (2 * maxLeverage)`                                                      |
| 29  | `getMaxLeverage`              | local          | Returns `MYX_MAX_LEVERAGE` constant                                          |
| 30  | `calculateFees`               | local          | Static fee rates (`MYX_FEE_RATE`, `MYX_PROTOCOL_FEE_RATE`)                   |
| 31  | `subscribeToPositions`        | REST poll (5s) | Polling wrapper around `getPositions`                                        |
| 32  | `subscribeToOrders`           | REST poll (5s) | Polling wrapper around `getOpenOrders`                                       |
| 33  | `subscribeToOrderFills`       | REST poll (5s) | Polling wrapper around `getOrderFills`                                       |
| 34  | `subscribeToAccount`          | REST poll (5s) | Polling wrapper around `getAccountState`                                     |
| 35  | `subscribeToCandles`          | REST + WS      | Historical via REST, live via `subscribeKline` WebSocket                     |
| 36  | `getDepositRoutes`            | local          | Returns 1 route: USDT/USDC to MYX Account contract                           |
| 37  | `getBlockExplorerUrl`         | local          | BscScan (mainnet) / Arbiscan Sepolia (testnet)                               |
| 38  | `getWebSocketConnectionState` | local          | Always returns `Connected` (REST-based)                                      |
| 39  | `reconnect`                   | local          | No-op (no WS to reconnect)                                                   |

#### Stubbed / Not Yet Implemented

| #   | Method                           | Returns                      | Reason                           |
| --- | -------------------------------- | ---------------------------- | -------------------------------- |
| 1   | `withdraw`                       | `{ success: false, error }`  | No withdrawal flow implemented   |
| 2   | `getWithdrawalRoutes`            | `[]`                         | No withdrawal support            |
| 3   | `getHistoricalPortfolio`         | `{ accountValue1dAgo: '0' }` | No data source                   |
| 4   | `getUserNonFundingLedgerUpdates` | `[]`                         | No data source                   |
| 5   | `subscribeToOrderBook`           | `{ bids: [], asks: [] }`     | MYX SDK has no L2 book endpoint  |
| 6   | `subscribeToOICaps`              | `[]`                         | No OI caps data from MYX         |
| 7   | `setUserFeeDiscount`             | no-op                        | No MYX referral/discount program |
| 8   | `toggleTestnet`                  | `{ success: false }`         | Mainnet not yet available        |
| 9   | `validateWithdrawal`             | `{ isValid: false }`         | No withdrawal support            |
| 10  | `getAvailableDexs`               | `[]`                         | No HIP-3 equivalent in MYX       |

---

## 3. Validation Results

All 14 recipes validated through the 3-tier process (PoC -> CDP -> Human review). Full details in `scripts/perps/agentic/teams/perps/myx-validation/VALIDATION-TRACKER.md`.

| #   | Recipe              | Category       | Tier 1 (PoC) | Tier 2 (CDP) | Tier 3 (Human) |
| --- | ------------------- | -------------- | :----------: | :----------: | :------------: |
| 01  | read-markets        | Read           |     PASS     |  PASS (2/2)  |      PASS      |
| 02  | read-account        | Read           |     PASS     |  PASS (2/2)  |      PASS      |
| 03  | calculate-fees      | Read           |     PASS     |  PASS (4/4)  |      PASS      |
| 04  | validate-order      | Read           |     PASS     | PASS (21/21) |      PASS      |
| 05  | read-fills          | Read           |     PASS     |  PASS (5/5)  |      PASS      |
| 06  | place-market-order  | Market Order   |     PASS     |  PASS (7/7)  |      PASS      |
| 07  | update-tpsl         | Position Mgmt  |     PASS     | PASS (21/21) |      PASS      |
| 08  | add-margin          | Position Mgmt  |     PASS     | PASS (15/15) |      PASS      |
| 09  | close-position      | Position Mgmt  |     PASS     |  PASS (8/8)  |      PASS      |
| 10  | place-and-close-all | Position Mgmt  |     PASS     | PASS (10/10) |      PASS      |
| 11  | place-limit-order   | Limit Order    |     PASS     |  PASS (8/8)  |      PASS      |
| 12  | cancel-order        | Limit Order    |     PASS     | PASS (11/11) |      PASS      |
| 13  | edit-order          | Limit Order    |     PASS     | PASS (15/15) |      PASS      |
| 14  | full-cycle          | Full Lifecycle |     PASS     | PASS (20/20) |      PASS      |

---

## 4. WebSocket Status

MYX WebSocket supports prices, candles, and **event-driven** position/order notifications. Account/balance data has no WS channel — polling required.

### Working WebSocket Channels

| Channel          | SDK Method          | Status                                       |
| ---------------- | ------------------- | -------------------------------------------- |
| Tickers (prices) | `subscribeTickers`  | Working — continuous streaming               |
| Klines (candles) | `subscribeKline`    | Working — continuous streaming               |
| Positions        | `subscribePosition` | Working — event-driven (no initial snapshot) |
| Orders           | `subscribeOrder`    | Working — event-driven (no initial snapshot) |

### No WebSocket Support

| Channel | SDK Method | Status                                            |
| ------- | ---------- | ------------------------------------------------- |
| Account | (none)     | No SDK method exists. MYX confirmed: polling only |
| Fills   | (none)     | No SDK method exists                              |

### Implementation Status

WS subscriptions for positions and orders are **confirmed working** (verified 2026-03-26). Authentication uses `walletClient` only — no signer, no `getAccessToken`, no `sdk.` prefix. After auth, `subscription.auth()` upgrades the WS connection.

**Behavior**: WS fires on state changes only (trade fill, position close, order trigger). There is **no initial snapshot** — REST is required to load existing positions/orders on subscribe. Continuous PnL and mark price updates also require REST polling.

**PoC evidence** (`scripts/perps/myx-poc/wsSubscriptions.ts`):

```bash
cd scripts/perps/myx-poc && NETWORK=testnet-arb npx tsx wsSubscriptions.ts --with-trade
```

Verified on Arb Sepolia: 3 events received (1 POSITION, 2 ORDER) during position open/close cycle.

**Architecture**:

```
MYXClientService.#doAuthenticate()
  |-- myxClient.auth({ walletClient })              <- REST auth (walletClient only)
  +-- myxClient.subscription.auth()                  <- WS auth (upgrades connection)

MYXProvider.subscribeToPositions()
  |-- clientService.subscribeToPositions(wsCallback)  <- WS (event-driven, no initial snapshot)
  +-- REST poll every 5s via getPositions()           <- Initial data + continuous PnL updates
```

**Impact**: REST polling still needed alongside WS for initial data load and continuous PnL/mark price updates. WS provides faster notification of state changes (trade fills, closes, order triggers) vs waiting for next poll cycle.

---

## 5. Fee Model & Revenue

### Protocol Fees

| Fee Type     | Rate                              | Example ($1000 trade)    |
| ------------ | --------------------------------- | ------------------------ |
| Taker fee    | 0.055% (mainnet), 0.02% (testnet) | $0.55 / $0.20            |
| Maker rebate | -0.005%                           | -$0.05 (rebate to maker) |
| Oracle fee   | ~$0.01 per trade                  | $0.01                    |
| Gas          | Paid in native token (ETH/BNB)    | Varies                   |

Fee rates are returned from the SDK at 1e8 precision. For example, `takerFeeRate = 55000` means `55000 / 100,000,000 = 0.055%`. MYX team confirmed this precision is stable and will not change.

### MetaMask Revenue: Broker Referral Rebate

Unlike HyperLiquid's direct 0.1% builder fee ($1.00 per $1000 trade), MYX uses a referral rebate model:

1. **Broker tagging** (done) -- Every trade is tagged with the MetaMask broker address via `MyxClient({ brokerAddress })`.
2. **Referral link** (pending) -- `setUserFeeData()` links a user to the MetaMask broker with a configurable rebate split. Requires an EIP-712 signature from the broker owner. EIP-712 domain spec now known (see below). Testing in progress.
3. **Rebate claiming** (pending) -- `referrals.claimRebate(tokenAddress)` lets MetaMask claim accumulated rebates from the contract.

**Revenue projections** (once referral rebate is activated):

| Rebate Share        | Effective Rate | Revenue per $1000 Trade |
| ------------------- | -------------- | ----------------------- |
| 10% of protocol fee | 0.0055%        | $0.055                  |
| 25% of protocol fee | 0.0138%        | $0.138                  |
| 50% of protocol fee | 0.0275%        | $0.275                  |

---

## 6. Hyperliquid vs MYX Comparison

### Architecture Differences

| Aspect             | HyperLiquid                                                | MYX                                                                              |
| ------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **SDK**            | No SDK -- direct REST + WS                                 | `@myx-trade/sdk` v1.0.6                                                          |
| **Execution**      | Off-chain matching engine                                  | On-chain transactions (BNB/Linea)                                                |
| **Collateral**     | USDC on Arbitrum                                           | USDT on BNB (mainnet), USDC on Linea Sepolia (testnet)                           |
| **Signing**        | EIP-712 typed data (off-chain)                             | On-chain tx via `TransactionController`                                          |
| **Confirmation**   | Instant (off-chain match)                                  | Block confirmation required (10-15s testnet)                                     |
| **Data streaming** | Full WebSocket (prices, positions, orders, fills, account) | REST polling (5s) + WS for klines/tickers + event-driven WS for positions/orders |

### Feature Parity

| Feature                       | HyperLiquid    | MYX                                                                                 | Gap Type              |
| ----------------------------- | -------------- | ----------------------------------------------------------------------------------- | --------------------- |
| Market orders                 | Yes            | Yes                                                                                 | -                     |
| Limit orders                  | Yes            | Yes                                                                                 | -                     |
| TP/SL orders                  | Yes            | Yes                                                                                 | -                     |
| Close position (full/partial) | Yes            | Yes                                                                                 | -                     |
| Cancel order (single/batch)   | Yes            | Yes                                                                                 | -                     |
| Update margin (add/remove)    | Yes            | Yes                                                                                 | -                     |
| Edit order                    | Yes            | Yes                                                                                 | -                     |
| Batch close positions         | Yes            | Yes                                                                                 | -                     |
| Order book depth              | Yes (L2 WS)    | **No**                                                                              | Protocol limitation   |
| Deposit flow (UI)             | Yes            | **Partial** (routes only)                                                           | Deferred              |
| Withdrawal flow               | Yes            | **No**                                                                              | Deferred              |
| Pay with any token            | Yes            | **No**                                                                              | Requires deposit flow |
| Spot market                   | Yes            | **No**                                                                              | Protocol limitation   |
| Historical portfolio          | Yes            | **No**                                                                              | Deferred              |
| Fee discounts (referral)      | Yes (HIP-3)    | **No**                                                                              | Protocol limitation   |
| Multi-DEX routing             | Yes (HIP-3)    | **No**                                                                              | Protocol limitation   |
| Real-time WS streaming        | Yes (all data) | Klines + event-driven positions/orders (no initial snapshot, no continuous updates) | Partial gap           |
| Funding rate (real-time)      | Yes (WS)       | REST (60s cache)                                                                    | SDK limitation        |
| OI caps                       | Yes            | **No**                                                                              | Protocol limitation   |
| Testnet + mainnet             | Yes            | **Testnet only**                                                                    | Deferred              |

### MYX Protocol Limitations (Cannot Implement)

1. **No order book depth** -- MYX uses AMM pools, not an order book. SDK has no L2 book endpoint.
2. **No spot market** -- MYX is perpetuals-only.
3. **No multi-DEX routing** -- MYX is a single exchange (no HIP-3 equivalent).
4. **No referral/staking fee discounts** -- Not part of the MYX protocol.
5. **No WebSocket initial snapshot or continuous position updates** -- WS fires on state changes only (trade fills, closes, order triggers). REST polling required alongside WS for initial data load and continuous PnL/mark price updates. No `subscribeAccount` exists — balance polling is the only option (MYX confirmed, may add later).

---

## 7. Broker EIP-712 Domain Spec

MYX team provided the EIP-712 domain specification for `setUserFeeData()` (2026-03-27):

```
EIP712Domain(string name, string version, uint256 chainId, address verifyingContract)
```

**Domain values**:

| Field               | Value                                                          | Notes                                   |
| ------------------- | -------------------------------------------------------------- | --------------------------------------- |
| `name`              | `"Broker"`                                                     | NOT the broker name ("Metamask Broker") |
| `version`           | `"1.0"`                                                        | Stable                                  |
| `chainId`           | Chain-specific (e.g., `56` for BNB, `59141` for Linea Sepolia) | Must match deployment chain             |
| `verifyingContract` | Broker contract address                                        | e.g., `0x30b1bc...` on Linea Sepolia    |

**MYX example** (BNB mainnet): `['Broker', '1.0', 56n, '0xB4d04AB1F870F3865F6cE1336cEdff56d0f937a3']`

**Previous PoC failure cause**: Our `activateBrokerRebate.ts` used `name: 'Metamask Broker'` (the broker's display name, not the EIP-712 domain name) and omitted the `version` field. This caused the EIP-712 hash to mismatch, resulting in `ECDSAInvalidSignature` / `NotBrokerSigner` reverts.

**Corrected domain** (viem format):

```typescript
const domain = {
  name: 'Broker',
  version: '1.0',
  chainId: config.chainId,
  verifyingContract: config.brokerAddress as `0x${string}`,
};
```

**Validation status** (2026-03-27): PoC script `scripts/perps/myx-poc/setUserFeeData.ts` tested on Linea Sepolia testnet. Still reverts with `NotBrokerSigner` — recovered address `0x315BC4...` does not match owner `0xAdA1c1...`. The domain change DID shift the recovered address (different from previous "Metamask Broker" attempt), confirming the domain affects the hash. Remaining unknowns:

- The struct types may differ from what the testnet contract expects (flat vs nested `FeeData`)
- The `verifyingContract` on testnet might be a factory/registry contract, not the broker address itself
- Need MYX team to provide a working example on testnet, or confirm testnet-specific domain values

---

## 8. Known Issues

### SDK Missing Exports

The SDK does not export three types we need, requiring local duplicates:

| SDK Type            | Our Duplicate          | Used By                                |
| ------------------- | ---------------------- | -------------------------------------- |
| `OrderItem`         | `MYXOrderItem`         | `getOrders()`, `adaptOrderItemFromMYX` |
| `UpdateOrderParams` | `MYXUpdateOrderParams` | `editOrder()`                          |
| `KlineData`         | `MYXKlineWsData`       | WebSocket kline callback               |

### Bugs Fixed

| Bug                                                | Fix                                                 | Recipe |
| -------------------------------------------------- | --------------------------------------------------- | ------ |
| `closePosition()` sent empty `size` for 100% close | Pass full position size to SDK                      | 09     |
| TP/SL prices undefined on positions                | Cross-reference open trigger orders by `positionId` | 07     |
| `parseAccountTuple` used array indices             | SDK returns typed `AccountInfo` object, not tuple   | 02     |
| `quoteProfit` mapped as `unrealizedPnl`            | Unrealized PnL computed from positions instead      | 02     |

### Other Known Issues

| Issue                                                 | Workaround                                          |
| ----------------------------------------------------- | --------------------------------------------------- |
| MYX SDK `PositionType` missing `userLeverage`         | `getUserLeverage()` helper with clean cast          |
| Pool config `minOrderSizeInUsd` unreliable on testnet | Static $100 floor with 1.1x buffer                  |
| SDK gas price estimation missing                      | Fetch `eth_gasPrice` from RPC in `MYXWalletService` |
| Tx stuck on confirmation screen                       | `requireApproval: false` in wallet service          |

---

## 9. Pending Items

| Item                     | Dependency                 | Notes                                                                                      |
| ------------------------ | -------------------------- | ------------------------------------------------------------------------------------------ |
| Broker rebate activation | EIP-712 testnet validation | EIP-712 domain spec now known (`Broker`, `1.0`). Testing with corrected domain on testnet. |
| Mainnet deployment       | Feature flag + QA          | `MM_PERPS_MYX_PROVIDER_ENABLED` controls access                                            |
| Protocol feature map     | TAT-2476                   | Hides unsupported features (orderbook) in MYX mode                                         |
| Collateral gating        | TAT-2459                   | Only show MYX when user has BNB-chain assets                                               |
| Deposit flow UI          | UI integration             | `getDepositRoutes()` returns routes; UI not connected                                      |
| Withdrawal flow          | SDK + UI                   | Needs MYX SDK withdrawal call + route definition                                           |
| Historical portfolio     | Data source                | Could aggregate from trade history                                                         |

---

## 10. Testnet Environment

| Config         | Value                                        |
| -------------- | -------------------------------------------- |
| SDK version    | `@myx-trade/sdk` 1.0.6                       |
| Chain          | Linea Sepolia (chainId 59141)                |
| Collateral     | USDC (6 decimals)                            |
| Broker address | `0x30b1bc9234fea72daba5253bf96d56a91483cbc0` |
| Active markets | META, ARB, WBTC, MYX                         |
| Test account   | `0x316BDE...` with ~$10k testnet USDC        |

**Broker credentials** (MYX team provided 2026-03-22):

| Network       | Chain  | Owner Address                                | Broker Address                               |
| ------------- | ------ | -------------------------------------------- | -------------------------------------------- |
| Arb Sepolia   | 421614 | `0x49F983F21379D70b7756588E6C9b11f26fF3a4Bd` | `0xc777bf4cdd0afc3d2b4d0f46d23a1c1c25c39176` |
| Linea Sepolia | 59141  | `0xAdA1c11226C0c1EFb001049334C14B0C70a0D84e` | `0x30b1bc9234fea72daba5253bf96d56a91483cbc0` |

Mainnet: BSC (chainId 56), USDT (18 decimals), ~6 active markets (BTCB, DOGE, MYX, AMPL).
