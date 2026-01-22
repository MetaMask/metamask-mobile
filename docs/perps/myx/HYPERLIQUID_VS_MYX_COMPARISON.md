# HyperLiquid vs MYX: Protocol Comparison

> **Current State**: MetaMask Mobile uses **isolated margin only** for both protocols.

---

## Quick Summary

| Aspect            | HyperLiquid                  | MYX                |
| ----------------- | ---------------------------- | ------------------ |
| **Chain**         | HyperLiquid L2               | BNB Chain          |
| **Collateral**    | USDC (6 decimals)            | USDT (18 decimals) |
| **Gas Fees**      | None                         | User pays BNB      |
| **Margin Mode**   | Isolated (cross available)   | Isolated only      |
| **Account Model** | Single account + HIP-3 DEXes | Multi-Pool Model   |

---

## Blockers & Adapters Overview

### True Blockers (Missing MYX APIs)

| Feature              |   Status   | Impact                       | Workaround            |
| -------------------- | :--------: | ---------------------------- | --------------------- |
| Order Book Depth     | ❌ Blocked | Cannot display L2 book       | Hide order book UI    |
| Funding History      | ❓ Unknown | Cannot show funding payments | Investigate SDK       |
| Historical Portfolio | ❌ Blocked | Cannot show PnL charts       | Hide portfolio charts |

### Adapters Required (Implementation Needed)

| Feature            | MYX SDK API                     | Adapter Work              |
| ------------------ | ------------------------------- | ------------------------- |
| Trade History      | `account.getTradeFlow()`        | Map to `OrderFill[]`      |
| Order History      | `order.getOrderHistory()`       | Map to order fill data    |
| Position History   | `position.getPositionHistory()` | Map to closed positions   |
| Account Balance    | Per-pool balances               | Aggregate across pools    |
| Decimal Conversion | 18/30 decimals                  | Convert to human-readable |

### No Adapter Required (Direct Mapping)

| Feature                      | Notes                          |
| ---------------------------- | ------------------------------ |
| Market/Limit Orders          | MYX uses increase/decrease ops |
| Stop Loss / Take Profit      | Trigger orders work            |
| Position Close               | Full/partial supported         |
| Live Prices/Positions/Orders | WebSocket subscriptions        |
| Candlestick Data             | Multiple intervals             |
| Fee Calculation              | User-specific rates            |
| Max Leverage                 | Per-asset/tier limits          |

---

## Architecture Comparison

### HyperLiquid: HIP-3 Model

```
User Wallet
    │
    ├── Main DEX (USDC, BTC/ETH, Cross/Isolated)
    ├── HIP-3 DEX "xyz" (USDC, Custom assets, Isolated only)
    └── HIP-3 DEX "abc" (USDC, Custom assets, Isolated only)
```

- **HIP-3** = Builder-deployed perpetuals (permissionless market creation)
- Separate USDC pools per DEX
- Cross-margin on main DEX, isolated-only on HIP-3

### MYX: Multi-Pool Model (MPM)

```
User Wallet
    │
    ├── BTC Pool A (USDT, Risk Tier 1, 100x max)
    ├── BTC Pool B (USDT, Risk Tier 2, 50x max)
    └── ETH Pool A (USDT, Risk Tier 1, 100x max)
```

- Multiple liquidity pools per symbol
- Per-pool balances (must aggregate)
- Isolated margin only

### Key Difference

| Aspect      | HyperLiquid                | MYX                           |
| ----------- | -------------------------- | ----------------------------- |
| Pool =      | Independent exchange (DEX) | Liquidity pool for same asset |
| Aggregation | Per-DEX state              | Must sum across all pools     |

---

## Data Model Adapters

### Order Direction Mapping

| Action      | HyperLiquid         | MYX                |
| ----------- | ------------------- | ------------------ |
| Open Long   | `b: true`           | `Increase + Long`  |
| Open Short  | `b: false`          | `Increase + Short` |
| Close Long  | `b: false, r: true` | `Decrease + Long`  |
| Close Short | `b: true, r: true`  | `Decrease + Short` |

### Decimal Conversion

| Data Type  | HyperLiquid       | MYX                | Adapter |
| ---------- | ----------------- | ------------------ | ------- |
| Prices     | Human-readable    | 30 decimals        | ÷ 10^30 |
| Sizes      | Human-readable    | 18 decimals        | ÷ 10^18 |
| Collateral | 6 decimals (USDC) | 18 decimals (USDT) | ÷ 10^18 |

### Position Structure

| Field     | HyperLiquid   | MYX                       | Adapter |
| --------- | ------------- | ------------------------- | ------- |
| Symbol    | `coin: "BTC"` | `poolId` → symbol map     | Lookup  |
| Size      | Signed (±)    | Unsigned + direction enum | Combine |
| PnL       | Provided      | Must calculate            | Compute |
| Liq Price | Provided      | Must calculate            | Compute |

---

## UI Changes Required

### Minimal Changes (Provider Abstraction Handles Most)

| Change            | Effort | Description               |
| ----------------- | :----: | ------------------------- |
| Collateral Symbol |  Low   | USDT vs USDC display      |
| Network Badge     |  Low   | BNB Chain vs HL L2        |
| Deposit Route     | Medium | Add USDT on BNB Chain     |
| Feature Gating    | Medium | Hide unsupported features |

### Feature Gating Example

```typescript
const capabilities = provider.getCapabilities();

// Hide if not supported
{capabilities.orderBook && <OrderBookComponent />}
{capabilities.fundingHistory && <FundingHistoryTab />}
```

---

## Future Differentiation: Cross Margin

> **Note**: MetaMask Mobile currently uses **isolated margin only** for HyperLiquid.

| Protocol               |  Cross Margin Support   |
| ---------------------- | :---------------------: |
| HyperLiquid (Main DEX) | ✅ Available (not used) |
| HyperLiquid (HIP-3)    |    ❌ Isolated only     |
| MYX                    |    ❌ Isolated only     |

If cross margin is enabled in the future:

- HyperLiquid main DEX would support it
- MYX would not (protocol limitation)
- UI would need margin mode selector

---

## Implementation Status

| Component                 | Status |        LOC |
| ------------------------- | :----: | ---------: |
| MYXProvider.ts            |   ✅   |      1,338 |
| MYXClientService.ts       |   ✅   |        819 |
| MYXSubscriptionService.ts |   ✅   |        922 |
| MYXWalletService.ts       |   ✅   |        252 |
| myxAdapter.ts             |   ✅   |        753 |
| myxConfig.ts              |   ✅   |       ~100 |
| **Total**                 |        | **~4,400** |

### Next Steps

1. **Implement trade history** using `getTradeFlow()`, `getOrderHistory()`
2. **Investigate funding history** availability in MYX SDK
3. **Add feature capability flags** for graceful degradation
