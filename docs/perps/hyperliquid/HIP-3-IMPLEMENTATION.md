# HIP-3 Implementation Plan

## Core Principles

**Transparent UX**: Users see ONE unified balance aggregated across all DEXs. HIP-3 DEXs are an implementation detail, not a user concept.

**Protocol-Agnostic Design**: Controller layer has no knowledge of "DEX" concept. The `placeOrder(coin, size, price)` API works identically for BTC (main DEX) and xyz:XYZ100 (HIP-3).

**Auto-Consolidation**: System automatically pulls funds from any DEX as needed. User never manually transfers between DEXs.

**Single ExchangeClient**: One client handles all DEXs. Asset ID determines routing:

- Main DEX: `assetId = index` (0, 1, 2...)
- HIP-3 DEX: `assetId = 100000 + (perpDexIndex × 10000) + index`

**Atomic Operations**: Transfer + order = one user action. If order fails, transfer reverts. On position close, collateral returns to main DEX automatically.

---

## Protocol-Agnostic Architecture

**Controller Layer** (generic, no DEX knowledge):

- API: `placeOrder({ coin: "BTC" | "xyz:XYZ100", size, orderType })`
- NO `dex` parameter exposed
- Delegates to provider

**Provider Layer** (HyperLiquid-specific):

1. Parse coin name to detect DEX internally (`"xyz:XYZ100"` → dex=xyz)
2. Auto-consolidate funds transparently
3. Calculate asset ID from coin name
4. Place order via single ExchangeClient

**Asset Naming**: Coin identifiers are opaque strings. Prefix is a namespace ("BTC", "xyz:XYZ100", "stocks:AAPL"), not a DEX selector.

**Public vs Internal**: `PlaceOrderParams` is exported (public API). `InternalTransferParams` is private (implementation detail).

---

## Transparent Balance Aggregation

**Problem**: User has balances across multiple DEXs (Main: $100, xyz: $50) but only sees $100.

**Solution**: Aggregate across all DEXs transparently.

**Key Implementation**:

- Fetch `clearinghouseState()` for each DEX in parallel
- Sum `withdrawable` and `accountValue` from all responses
- Subscribe to `userEvents` for each DEX separately
- Merge positions from `assetPositions` across all DEXs

**Result**: User sees $150 total, all positions visible

---

## Auto-Consolidation Strategy

**Smart Fund Routing** (when placing HIP-3 order):

1. Check target DEX balance
2. If insufficient → pull from main DEX first
3. Still insufficient → pull from other HIP-3 DEXs
4. Error only if total across ALL DEXs insufficient

**Automatic Return on Close**:

- Freed collateral auto-returns to main DEX after position close
- Uses `sendAsset()` with `sourceDex` (HIP-3 DEX) to `destinationDex: ""` (main DEX)

**User Experience**: Never manually transfer funds between DEXs

---

## Market Categories

**Type**: `MarketCategory = 'experimental' | 'equity' | 'forex' | 'commodity'`

**Provider Mapping** (hardcoded in `HyperLiquidProvider`):

```typescript
DEX_CATEGORY_MAP = {
  xyz: 'experimental',
  abc: 'experimental',
  // Future: 'stocks-dex': 'equity', 'forex-dex': 'forex'
};
```

**UI Display**: Show badge if `marketCategory` exists. Main DEX = undefined (no badge).

**Result**: Main DEX: `BTC 50x` | HIP-3: `xyz:XYZ100 [EXPERIMENTAL] 5x`

---

## HIP-3 Trading Flow

### Transaction Sequence

**Opening Position**:

1. Update leverage (isolated margin required)
2. Transfer collateral: main DEX → HIP-3 DEX via `sendAsset()`
3. Place order with calculated asset ID

**Closing Position**:

1. Place reduce-only order
2. Transfer collateral: HIP-3 DEX → main DEX via `sendAsset()`

### Key Findings

- **Pre-funding required**: Must have balance in target DEX before order
- **Collateral isolation**: Each DEX maintains separate pool
- **`sendAsset()` works on mainnet**: Verified via Phantom wallet (SDK docs outdated)
- **Single ExchangeClient**: No DEX routing parameter needed

### Transfer API

```typescript
await exchangeClient.sendAsset({
  destination: userAddress,
  sourceDex: '', // empty string = main DEX
  destinationDex: 'xyz',
  token: 'USDC:0x...',
  amount: '11',
});
```

---

## Feature Flag Architecture

**Two-Level Control**: Master switch + whitelist enable gradual rollout.

**`perpsEquityEnabled` (boolean)**: Global on/off for HIP-3. `false` = main DEX only, `true` = enable HIP-3 DEXs.

**`perpsEnabledDexs` (string[])**: Whitelist specific DEXs. `[]` = auto-discover all, `["xyz"]` = only "xyz".

**Usage**:

- Default: `perpsEquityEnabled: false` → main DEX only
- Pilot: `perpsEquityEnabled: true, perpsEnabledDexs: ["xyz"]` → main + xyz
- Full: `perpsEquityEnabled: true, perpsEnabledDexs: []` → main + all discovered

---

## WebSocket Integration with PerpsStreamManager

**Current Architecture**: `PerpsStreamManager` (app/components/UI/Perps/providers/PerpsStreamManager.tsx) manages live data streams via singleton channels: prices, orders, positions, account. Each channel subscribes via `Engine.context.PerpsController.subscribeToX()`.

**Critical Integration**: All subscription methods in the provider layer must aggregate data from multiple DEXs **before** passing to PerpsStreamManager. The channels themselves remain unchanged.

### Multi-DEX Subscription Pattern

**In HyperLiquidProvider/HyperLiquidSubscriptionService**:

1. **Orders Channel**: `subscribeToOrders({ callback })`

   - Create WebSocket subscription for **each enabled DEX**
   - Merge order arrays from all DEXs
   - Pass aggregated array to callback (PerpsStreamManager receives unified data)

2. **Positions Channel**: `subscribeToPositions({ callback })`

   - Subscribe to each DEX separately
   - Merge position arrays (each position retains coin identifier: "BTC" vs "xyz:XYZ100")
   - Pass aggregated array to callback

3. **Account Channel**: `subscribeToAccount({ callback })`

   - Fetch account state from each DEX
   - Aggregate balances (sum `withdrawable`, `accountValue`)
   - Pass single AccountState object with `dexBreakdown` field

4. **Prices Channel**: `subscribeToPrices({ symbols, callback })`
   - Already works! `infoClient.allMids()` returns prices for all DEXs
   - No changes needed

### Feature Flag Guards

Subscriptions must respect feature flags:

```typescript
// In HyperLiquidSubscriptionService
private getEnabledDexs(): Array<string | null> {
  if (!this.equityEnabled) return [null]; // Main DEX only
  return [null, ...this.enabledDexs]; // Main + HIP-3 DEXs
}

async subscribeToOrders({ callback }) {
  const dexs = this.getEnabledDexs();

  // Subscribe to each DEX
  const unsubscribers = dexs.map(dex =>
    this.transport.subscribe({
      type: 'userEvents',
      user: this.address,
      dex: dex ?? '', // Empty string = main DEX
    }, (update) => {
      // Merge and callback
    })
  );

  return () => unsubscribers.forEach(unsub => unsub());
}
```

### Key Principles

**✅ PerpsStreamManager stays unchanged**: Channels receive aggregated data, no DEX awareness.

**✅ Provider layer handles complexity**: Multi-DEX subscriptions, aggregation, feature flag filtering.

**✅ Transparent to UI**: Components using `usePerpsStream()` see unified data automatically.

---

## Implementation Steps

| Step                           | File                                                                    | Changes                                                                                                                                                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Feature Flags** ✅        | `app/selectors/featureFlagController/perps/index.ts` (EXISTS, 66 lines) | Selectors already implemented: `selectPerpsEquityEnabledFlag()` → boolean, `selectPerpsEnabledDexs()` → string[].                                                                                                                                              |
| **2. Type Definitions**        | `app/components/UI/Perps/controllers/types/index.ts`                    | Add optional `marketSource?: string \| null` field to `PerpsMarketData` interface. Add optional `dexBreakdown` to `AccountState`.                                                                                                                              |
| **3. Provider Constructor** ✅ | `app/components/UI/Perps/controllers/providers/HyperLiquidProvider.ts`  | Constructor already accepts `equityEnabled?: boolean` and `enabledDexs?: string[]` (lines 156-165).                                                                                                                                                            |
| **4. DEX Resolution** ✅       | Same file                                                               | `getValidatedDexs()` method already implemented (lines 237-303). Returns `[null]` when disabled, filters by whitelist or auto-discovers.                                                                                                                       |
| **5. Market Data Fetching**    | Same file                                                               | Update `getMarketDataWithPrices()` (line 2061): Method exists but currently only fetches main DEX. Need to call `infoClient.metaAndAssetCtxs()` for each enabled DEX in parallel, add `marketSource` field.                                                    |
| **6. Asset Mapping** ✅        | Same file                                                               | `buildAssetMapping()` already implements multi-DEX support with prefixes (lines 324-346).                                                                                                                                                                      |
| **7. Balance Aggregation**     | Same file                                                               | Update `getAccountState()` (line 1978): Method exists but currently only fetches main DEX + spot. Need to fetch `clearinghouseState()` for all enabled DEXs in parallel, aggregate totals, return `dexBreakdown`.                                              |
| **8. Multi-DEX Subscriptions** | `app/components/UI/Perps/services/HyperLiquidSubscriptionService.ts`    | Update `subscribeToOrders()`, `subscribeToPositions()`, `subscribeToAccount()` to implement multi-DEX subscription pattern (see WebSocket Integration section above). Add `getEnabledDexs()` helper. Currently uses single `webData2` subscription (line 304). |
| **9. Wire Feature Flags** ✅   | `app/components/UI/Perps/controllers/PerpsController.ts`                | Feature flags already wired to provider constructor (lines 810-825).                                                                                                                                                                                           |
| **10. UI Badge**               | `app/components/UI/Perps/components/PerpsMarketRowItem/*`               | Conditionally render badge if `displayMarket.marketSource` exists. Add badge styles.                                                                                                                                                                           |

---

## SDK Integration Details

### Verified SDK APIs (from `/Users/deeeed/dev/metamask/compare_hyperliquid/hyperliquid`)

**1. List all DEXs**:

```typescript
infoClient.perpDexs()
→ Array<null | { name: string, full_name: string, deployer: Address, ... }>
```

- `null` entry = main/validator DEX
- Objects = HIP-3 builder DEXs

**2. Fetch DEX-specific metadata**:

```typescript
infoClient.meta({ dex: string });
infoClient.metaAndAssetCtxs({ dex: string });
```

- Empty string or omitted = main DEX
- `"xyz"` = HIP-3 DEX named "xyz"

**3. Shared data (works across all DEXs)**:

```typescript
infoClient.allMids(); // Prices for all assets
infoClient.predictedFundings(); // Funding rates
```

---

## Files to Modify

| File                                                                                 | Status    | Estimated Lines | Purpose                                    |
| ------------------------------------------------------------------------------------ | --------- | --------------- | ------------------------------------------ |
| `app/selectors/featureFlagController/perps/index.ts`                                 | ✅ EXISTS | 66              | Feature flag selectors                     |
| `app/components/UI/Perps/controllers/types/index.ts`                                 | TODO      | +10             | Add `marketSource` & `dexBreakdown`        |
| `app/components/UI/Perps/controllers/providers/HyperLiquidProvider.ts`               | PARTIAL   | ~100            | Balance aggregation + market data fetching |
| `app/components/UI/Perps/services/HyperLiquidSubscriptionService.ts`                 | TODO      | ~80             | Multi-DEX subscriptions                    |
| `app/components/UI/Perps/controllers/PerpsController.ts`                             | ✅ DONE   | 0               | Feature flags already wired                |
| `app/components/UI/Perps/components/PerpsMarketRowItem/PerpsMarketRowItem.tsx`       | TODO      | ~8              | Badge display                              |
| `app/components/UI/Perps/components/PerpsMarketRowItem/PerpsMarketRowItem.styles.ts` | TODO      | +6              | Badge styles                               |

**Remaining Work**: ~4 files to modify, ~200 lines of code estimated

---

## Testing Strategy

| Scenario           | Config                                                    | Expected Behavior                                             |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------- |
| **Default**        | `perpsEquityEnabled: false`                               | Only main DEX markets shown, no badges                        |
| **Auto-discovery** | `perpsEquityEnabled: true, perpsEnabledDexs: []`          | Main + all HIP-3 DEXs shown with badges                       |
| **Whitelist**      | `perpsEquityEnabled: true, perpsEnabledDexs: ["xyz"]`     | Only whitelisted DEXs shown                                   |
| **Invalid config** | `perpsEquityEnabled: true, perpsEnabledDexs: ["invalid"]` | Invalid DEX ignored (logs warning), main DEX works            |
| **Trading flow**   | HIP-3 order placement                                     | Order routes to correct DEX, asset mapping resolves correctly |

---

## Asset ID Calculation

### Formula

```typescript
// Main DEX assets
assetId = index_in_meta; // 0, 1, 2, ...

// HIP-3 DEX assets
assetId = 100000 + perpDexIndex * 10000 + index_in_meta;
```

### Example: xyz DEX

**Setup**:

1. Call `perpDexs()` → Returns `[null, { name: "xyz", ... }, ...]`
2. xyz is at array index 1 → `perpDexIndex = 1`
3. First asset "XYZ100" → `index_in_meta = 0`

**Calculation**: `assetId = 100000 + (1 * 10000) + 0 = 110000`

**Order Placement**:

```typescript
// Single ExchangeClient for all DEXs
const exchangeClient = new ExchangeClient({ wallet, transport });

// Main DEX: BTC (asset ID 0)
await exchangeClient.order({ orders: [{ a: 0, ... }] });

// HIP-3 DEX: xyz:XYZ100 (asset ID 110000)
await exchangeClient.order({ orders: [{ a: 110000, ... }] });
```

### Asset Mapping Implementation

```typescript
// In buildAssetMapping()
const allDexs = await infoClient.perpDexs(); // [null, {name: "xyz"}, ...]

for (let perpDexIndex = 0; perpDexIndex < allDexs.length; perpDexIndex++) {
  const dex = allDexs[perpDexIndex];
  const dexName = dex?.name || '';
  const meta = await infoClient.meta({ dex: dexName });

  meta.universe.forEach((asset, index_in_meta) => {
    const symbol = dex ? `${dex.name}:${asset.name}` : asset.name;
    const assetId = dex
      ? 100000 + perpDexIndex * 10000 + index_in_meta
      : index_in_meta;

    this.coinToAssetId.set(symbol, assetId);
  });
}

// Result mapping:
// "BTC" → 0, "ETH" → 1
// "xyz:XYZ100" → 110000, "xyz:XYZ200" → 110001
// "abc:ABC100" → 120000
```

### Why This Works

The HyperLiquid backend decodes the asset ID to determine:

1. Which DEX (from perpDexIndex)
2. Which market within that DEX (from index_in_meta)

**No other context needed** - the asset ID encodes everything.

---

## Implementation Stages

### Stage 1: Display + Market Discovery

**Goal**: Show HIP-3 markets without enabling trading

**Implementation**:

- Fetch and display HIP-3 markets with category badges
- Show aggregated balance across all DEXs
- Add per-DEX balance breakdown in UI
- Block HIP-3 order placement (display-only mode)

**Testing**:

- Verify HIP-3 markets display with correct badges
- Verify aggregated balance calculation
- Verify main DEX trading unaffected

---

### Stage 2: Auto-Consolidation + Trading

**Goal**: Enable full HIP-3 trading with transparent fund management

**Implementation**:

- Implement `sendAsset()` transfer functionality
- Add auto-consolidation: pull funds from any DEX as needed
- Enable HIP-3 order placement
- Implement automatic collateral return on position close

**Testing**:

- Verify orders route to correct DEX
- Verify auto-transfer pulls from main DEX first
- Verify freed collateral returns to main DEX on close

---

## Summary

**Status**: Ready for implementation

**Key Resolution**: `sendAsset()` confirmed working on mainnet (SDK docs were outdated)

**Core Architecture**:

- Single ExchangeClient for all DEXs (asset ID determines routing)
- Transparent balance aggregation across main + HIP-3 DEXs
- Auto-consolidation pulls funds from any DEX as needed
- Protocol-agnostic controller design (no "DEX" concept exposed)

**Implementation Stages**:

1. Display + market discovery with badges
2. Auto-consolidation + trading enablement
