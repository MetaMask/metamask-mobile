# MYX Integration Status

Branch: `feat/perps/myx-write-integration`
Last updated: 2026-03-25

## Overview

MYX is a permissionless perpetual futures DEX on BNB Chain (mainnet) and Linea Sepolia (testnet). We are integrating it as the second perps provider alongside HyperLiquid, giving MetaMask users access to an additional liquidity source and market selection.

The integration uses MYX's official TypeScript SDK (`@myx-trade/sdk` v1.0.6) and follows the same `AggregatedPerpsProvider` architecture as HyperLiquid — all provider-specific logic is encapsulated in `MYXProvider.ts`.

## What's Working

### Read Operations (all validated via PoC scripts)

| Operation                          | Method                                      | Status  |
| ---------------------------------- | ------------------------------------------- | ------- |
| List markets with prices           | `getMarkets()`, `getMarketDataWithPrices()` | Working |
| Account balances                   | `getAccountState()`                         | Working |
| Open positions                     | `getPositions()`                            | Working |
| Order history and fills            | `getOrderFills()`                           | Working |
| Fee calculation                    | `calculateFees()`                           | Working |
| Order validation (min size)        | `validateOrder()`                           | Working |
| Candles (REST + WebSocket)         | `getCandles()`, `subscribeKline`            | Working |
| Price streaming                    | `subscribeTickers`                          | Working |
| Market stats (funding, OI, volume) | `getBaseDetail` REST                        | Working |

### Write Operations (all validated via PoC scripts on testnet)

| Operation             | Method                      | Status  |
| --------------------- | --------------------------- | ------- |
| Place market order    | `placeOrder()`              | Working |
| Place limit order     | `placeOrder()` (limit path) | Working |
| Close single position | `closePosition()`           | Working |
| Close all positions   | `closePositions()`          | Working |
| Add margin            | `updateMargin()`            | Working |
| Set TP/SL triggers    | `updatePositionTPSL()`      | Working |
| Edit limit order      | `editOrder()`               | Working |
| Cancel limit order    | `cancelOrder()`             | Working |

## Fee Model

MYX charges a protocol-level trading fee on every order. There is no separate MetaMask fee line — revenue comes through a broker referral rebate model.

### Protocol Fees

| Fee Type     | Rate                           | Example ($1000 trade)    |
| ------------ | ------------------------------ | ------------------------ |
| Taker fee    | 0.055%                         | $0.55                    |
| Maker rebate | -0.005%                        | -$0.05 (rebate to maker) |
| Oracle fee   | ~$0.01 per trade               | $0.01                    |
| Gas          | Paid in native token (ETH/BNB) | Varies                   |

Fee rates are returned from the SDK at 1e8 precision. For example, `takerFeeRate = 55000` means `55000 / 100,000,000 = 0.055%`.

### MetaMask Revenue: Broker Referral Rebate

Unlike HyperLiquid's direct builder fee, MYX uses a referral rebate model:

1. **Broker tagging** (done) — Every trade is tagged with the MetaMask broker address via `MyxClient({ brokerAddress })`.
2. **Referral link** (pending) — `setUserFeeData()` links a user to the MetaMask broker with a configurable rebate split. This requires an EIP-712 signature from MYX's backend, which is **not yet available**.
3. **Rebate claiming** (pending) — `referrals.claimRebate(tokenAddress)` lets MetaMask claim accumulated rebates from the contract.

**Revenue projections** (once referral rebate is activated):

| Rebate Share        | Effective Rate | Revenue per $1000 Trade |
| ------------------- | -------------- | ----------------------- |
| 10% of protocol fee | 0.0055%        | $0.055                  |
| 25% of protocol fee | 0.0138%        | $0.138                  |
| 50% of protocol fee | 0.0275%        | $0.275                  |

**Comparison to HyperLiquid**: HL uses a direct 0.1% builder fee ($1.00 per $1000 trade). MYX revenue depends on the negotiated rebate percentage.

## What's Pending

| Item                     | Dependency               | Notes                                                        |
| ------------------------ | ------------------------ | ------------------------------------------------------------ |
| Broker rebate activation | MYX team EIP-712 backend | Required for MetaMask revenue. Step 2 of the referral model. |
| Mainnet deployment       | Feature flag + QA        | `MM_PERPS_MYX_PROVIDER_ENABLED` controls access              |
| UI integration testing   | CDP recipe validation    | 14 recipes ready, 3-tier QA process defined                  |
| Protocol feature map     | TAT-2476                 | Hides unsupported features (orderbook) in MYX mode           |
| Collateral gating        | TAT-2459                 | Only show MYX when user has BNB-chain assets                 |

## Testnet Environment

| Config         | Value                                        |
| -------------- | -------------------------------------------- |
| SDK version    | `@myx-trade/sdk` 1.0.6                       |
| Chain          | Linea Sepolia (chainId 59141)                |
| Collateral     | USDC (6 decimals)                            |
| Broker address | `0x30b1bc9234fea72daba5253bf96d56a91483cbc0` |
| Active markets | META, ARB, WBTC, MYX                         |
| Test account   | `0x316BDE...` with ~$10k testnet USDC        |

Mainnet: BSC (chainId 56), USDT (18 decimals), ~6 active markets (BTCB, DOGE, MYX, AMPL).

## Validation Evidence

All operations are validated through a 3-tier process:

1. **Tier 1 (PoC)** — Standalone scripts in `scripts/perps/myx-poc/` run against testnet. Proves the SDK call works end-to-end.
2. **Tier 2 (CDP)** — Agentic recipes in `scripts/perps/agentic/teams/perps/myx-validation/` run against the app via Chrome DevTools Protocol. Proves the provider integration works in-app.
3. **Tier 3 (Human)** — Video recording of Tier 2 execution, reviewed by a human.

Tracker: `scripts/perps/agentic/teams/perps/myx-validation/VALIDATION-TRACKER.md`
Recipes: 14 files (`01-read-markets.json` through `14-full-cycle.json`)

## Known Issues and Gaps

### SDK Missing Exports

The SDK does not export three types we need, requiring local duplicates:

| SDK Type            | Our Duplicate          | Used By                                |
| ------------------- | ---------------------- | -------------------------------------- |
| `OrderItem`         | `MYXOrderItem`         | `getOrders()`, `adaptOrderItemFromMYX` |
| `UpdateOrderParams` | `MYXUpdateOrderParams` | `editOrder()`                          |
| `KlineData`         | `MYXKlineWsData`       | WebSocket kline callback               |

### WebSocket Gaps

MYX WebSocket supports prices and candles but **not** account-level data. We REST-poll every 5 seconds for:

- Account state (balances)
- Positions
- Open orders
- Order fills

This adds ~5s latency compared to HyperLiquid's full WebSocket streaming. See `docs/perps/myx-websocket-gaps.md` for details.

### Other Gaps

- **TP/SL**: MYX TP/SL are separate trigger orders, not position attributes. HyperLiquid attaches TP/SL to positions. Our integration handles this via `updatePositionTPSL()` which creates/edits trigger orders.
- **Funding rate + OI**: REST-cached with 60s TTL vs HyperLiquid's real-time WebSocket.
- **Market filtering**: MYX has permissionless pool creation, so many dead/spam pools exist. We filter to active pools only.

## Next Steps

1. Complete 3-tier QA validation for all 14 recipes (reads first, then writes)
2. Negotiate broker rebate terms with MYX team
3. Activate referral rebate via MYX EIP-712 backend (once available)
4. Implement protocol feature map (hide unsupported features in MYX mode)
5. Mainnet QA pass with real funds
6. Feature flag rollout via LaunchDarkly
