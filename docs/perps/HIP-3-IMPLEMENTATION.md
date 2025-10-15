# HIP-3 Implementation Plan

## Overview

Enable support for HIP-3 (builder-deployed perpetuals) with configurable DEX filtering via feature flags.

**Key Requirement**: Minimal code changes, protocol-agnostic design, feature-flag controlled rollout.

---

## Feature Flag Architecture

### Two-Level Control System

1. **Master Switch**: `perpsEquityEnabled` (boolean)

   - Global kill switch for ALL HIP-3 features
   - `false` = Only main DEX (current behavior)
   - `true` = Enable HIP-3 DEXs (filtered by whitelist)

2. **DEX Whitelist**: `perpsEnabledDexs` (string array)
   - Controls which specific HIP-3 DEXs to show
   - `[]` (empty) = Auto-discover all available DEXs
   - `["xyz", "test-dex"]` = Only show specified DEXs
   - Only applies when `perpsEquityEnabled === true`

### Configuration Examples

```json
// Phase 1: Disabled (default)
{ "perpsEquityEnabled": false }
→ Result: Main DEX only

// Phase 2: Enabled with auto-discovery
{ "perpsEquityEnabled": true, "perpsEnabledDexs": [] }
→ Result: Main DEX + ALL discovered HIP-3 DEXs

// Phase 3: Enabled with whitelist
{ "perpsEquityEnabled": true, "perpsEnabledDexs": ["xyz"] }
→ Result: Main DEX + "xyz" only

// Emergency kill switch
{ "perpsEquityEnabled": false }
→ Result: Immediately disables ALL HIP-3
```

---

## Implementation Steps

### Step 1: Add Feature Flag Selectors

**File**: `app/selectors/featureFlagController/perps/index.ts` (NEW)

**Purpose**: Extract and validate feature flags from Redux state

**Key Functions**:

- `selectPerpsEquityEnabledFlag()` → Returns boolean for master switch
- `selectPerpsEnabledDexs()` → Returns validated string array of DEX names

**Logic**:

- Read from `RemoteFeatureFlagController` state
- Provide safe defaults (`false` and `[]`)
- Validate types (boolean and string array)

---

### Step 2: Extend Type Definitions

**File**: `app/components/UI/Perps/controllers/types/index.ts`

**Change**: Add one optional field to `PerpsMarketData` interface

```typescript
export interface PerpsMarketData {
  // ... existing fields (symbol, name, price, etc.)

  marketSource?: string | null; // NEW: DEX name or null/undefined for main
}
```

**Design Rationale**:

- Optional field = zero breaking changes
- Protocol-agnostic naming (`marketSource` not `hip3Dex`)
- `null`/`undefined` for main DEX = backward compatible

---

### Step 3: Update HyperLiquidProvider

**File**: `app/components/UI/Perps/controllers/providers/HyperLiquidProvider.ts`

#### 3a. Add Configuration to Constructor

**Change**: Accept `equityEnabled` and `enabledDexs` options

```typescript
constructor(options: {
  isTestnet?: boolean;
  equityEnabled?: boolean;    // NEW
  enabledDexs?: string[];     // NEW
} = {})
```

#### 3b. Add DEX Resolution Method

**Method**: `getValidatedDexs()` (new private method)

**Logic Flow**:

```
1. If equityEnabled === false
   → Return [null]  // Main DEX only

2. Fetch available DEXs via SDK: infoClient.perpDexs()
   → Returns: Array<null | {name, full_name, deployer, ...}>

3. If enabledDexs is empty []
   → Return [null, ...allDiscoveredHip3Dexs]  // Auto-discover

4. Else filter enabledDexs against available DEXs
   → Return [null, ...validatedHip3Dexs]  // Whitelist only

5. Cache result for performance
```

**Error Handling**:

- Invalid DEX names: Silently ignored with DevLogger warning
- API failures: Gracefully skip failed DEXs

#### 3c. Update `getMarketDataWithPrices()`

**Current Logic**: Fetches only main DEX

```typescript
const meta = await infoClient.meta(); // No dex parameter
```

**New Logic**: Fetch all validated DEXs in parallel

```typescript
const dexsToFetch = await this.getValidatedDexs(); // [null, "xyz", ...]

const allMetaAndCtxs = await Promise.all(
  dexsToFetch.map(
    (dex) => infoClient.metaAndAssetCtxs({ dex: dex ?? '' }), // Empty string = main
  ),
);

// For each DEX's markets, add marketSource field
dexMarkets.forEach((market) => {
  market.marketSource = dex; // null for main, "xyz" for HIP-3
});
```

**Key Points**:

- Reuses existing `transformMarketData()` utility
- Parallel fetching for performance
- Gracefully handles fetch failures per DEX

#### 3d. Update `buildAssetMapping()`

**Current Logic**: Maps only main DEX assets

```typescript
const meta = await infoClient.meta();
// Builds: Map<"BTC", 0>, Map<"ETH", 1>, ...
```

**New Logic**: Map all DEX assets with prefixes

```typescript
for (const dex of validatedDexs) {
  const meta = await infoClient.meta({ dex: dex ?? '' });

  meta.universe.forEach((asset, idx) => {
    const key = dex ? `${dex}:${asset.name}` : asset.name;
    // Main DEX: "BTC" → 0
    // HIP-3 DEX: "xyz:XYZ100" → 0 (within that DEX)
    this.coinToAssetId.set(key, idx);
  });
}
```

**Purpose**: Enable order placement on correct DEX by symbol lookup

---

### Step 4: Wire Feature Flags to Provider

**File**: `app/components/UI/Perps/controllers/PerpsController.ts`

**Change**: Pass feature flag values when creating provider

**Location**: Find where `HyperLiquidProvider` is instantiated

**Pseudocode**:

```typescript
// During provider initialization
const provider = new HyperLiquidProvider({
  isTestnet: this.state.isTestnet,
  equityEnabled: this.getEquityEnabledFlag(), // NEW
  enabledDexs: this.getEnabledDexs(), // NEW
});

// Helper methods to read feature flags from state
// Implementation depends on how controller accesses Redux
```

**Note**: Exact implementation depends on controller's Redux access pattern. May need to pass flags from higher-level initialization point.

---

### Step 5: Implement Balance Aggregation

**File**: `app/components/UI/Perps/controllers/providers/HyperLiquidProvider.ts`

**Add New Method**: `getAggregatedAccountState()`

**Purpose**: Fetch and aggregate account state across all active DEXs

```typescript
async getAccountState(params: GetAccountStateParams): Promise<AccountState> {
  await this.ensureReady();
  const infoClient = this.clientService.getInfoClient();
  const address = params.address;

  // Get all active DEXs
  const dexs = await this.getValidatedDexs(); // [null, "xyz", ...]

  // Fetch clearinghouse state for each DEX in parallel
  const allStates = await Promise.all(
    dexs.map(async (dex) => {
      try {
        const state = await infoClient.clearinghouseState({
          user: address,
          dex: dex ?? '', // Empty string = main DEX
        });
        return { dex, state, success: true };
      } catch (error) {
        DevLogger.log(`Failed to fetch state for DEX ${dex}:`, error);
        return { dex, state: null, success: false };
      }
    })
  );

  // Aggregate successful states
  const successfulStates = allStates.filter(s => s.success && s.state);

  const totalAccountValue = successfulStates.reduce(
    (sum, { state }) => sum + parseFloat(state!.marginSummary.accountValue),
    0
  );

  const totalWithdrawable = successfulStates.reduce(
    (sum, { state }) => sum + parseFloat(state!.withdrawable),
    0
  );

  // Return adapted state with aggregated totals
  return adaptAccountStateFromSDK(
    successfulStates[0]?.state!, // Use main DEX as base structure
    {
      totalAccountValue,
      totalWithdrawable,
      dexBreakdown: successfulStates.map(({ dex, state }) => ({
        dex: dex ?? 'main',
        accountValue: parseFloat(state!.marginSummary.accountValue),
        withdrawable: parseFloat(state!.withdrawable),
        positionCount: state!.assetPositions.length,
      })),
    }
  );
}
```

**Type Extension**: Add to `AccountState` interface

```typescript
export interface AccountState {
  // ... existing fields
  dexBreakdown?: Array<{
    dex: string;
    accountValue: number;
    withdrawable: number;
    positionCount: number;
  }>;
}
```

---

### Step 6: Display HIP-3 Badge in UI

**File**: `app/components/UI/Perps/components/PerpsMarketRowItem/PerpsMarketRowItem.tsx`

**Change**: Add conditional inline badge next to symbol

**Before**:

```typescript
<View style={styles.tokenHeader}>
  <Text>{displayMarket.symbol}</Text>
  <PerpsLeverage maxLeverage={displayMarket.maxLeverage} />
</View>
```

**After**:

```typescript
<View style={styles.tokenHeader}>
  <Text>{displayMarket.symbol}</Text>

  {displayMarket.marketSource && (
    <View style={styles.marketSourceBadge}>
      <Text variant={TextVariant.BodyXS} color={TextColor.Info}>
        {displayMarket.marketSource}
      </Text>
    </View>
  )}

  <PerpsLeverage maxLeverage={displayMarket.maxLeverage} />
</View>
```

**Styling**: Add minimal badge styles to `PerpsMarketRowItem.styles.ts`

```typescript
marketSourceBadge: {
  marginLeft: 4,
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
  backgroundColor: colors.info.muted,
}
```

**Visual Result**: `BTC [xyz] 50x` where `[xyz]` is small colored badge

---

### Step 7: Add DEX Balance Breakdown UI

**File**: `app/components/UI/Perps/Views/PerpsAccountView/*` (location TBD)

**Purpose**: Show per-DEX balance breakdown to help users understand fund distribution

**UI Design**:

```
┌─────────────────────────────────┐
│ Total Balance: $10,000          │
│ ▼ View Breakdown                │
└─────────────────────────────────┘
  ┌───────────────────────────────┐
  │ Main DEX        $7,000  70%   │
  │ xyz             $2,000  20%   │
  │ abc             $1,000  10%   │
  └───────────────────────────────┘
```

**Implementation Notes**:

- Collapsible/expandable section (default collapsed)
- Visual indication if balance insufficient in target DEX
- Link to transfer guide if attempting HIP-3 order without funds

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

| File                                                                                 | Type   | Estimated Lines | Purpose                             |
| ------------------------------------------------------------------------------------ | ------ | --------------- | ----------------------------------- |
| `app/selectors/featureFlagController/perps/index.ts`                                 | NEW    | ~50             | Feature flag selectors              |
| `app/components/UI/Perps/controllers/types/index.ts`                                 | MODIFY | +10             | Add `marketSource` & `dexBreakdown` |
| `app/components/UI/Perps/controllers/providers/HyperLiquidProvider.ts`               | MODIFY | ~150            | DEX filtering + balance aggregation |
| `app/components/UI/Perps/services/HyperLiquidSubscriptionService.ts`                 | MODIFY | ~40             | Multi-DEX subscriptions             |
| `app/components/UI/Perps/controllers/PerpsController.ts`                             | MODIFY | ~10             | Wire feature flags                  |
| `app/components/UI/Perps/components/PerpsMarketRowItem/PerpsMarketRowItem.tsx`       | MODIFY | ~8              | Badge display                       |
| `app/components/UI/Perps/components/PerpsMarketRowItem/PerpsMarketRowItem.styles.ts` | MODIFY | +6              | Badge styles                        |
| `app/components/UI/Perps/Views/PerpsAccountView/*`                                   | MODIFY | ~30             | DEX balance breakdown UI            |

**Total**: 1 new file, 7 modified files, ~300 lines of code

**Phase 1 (Display-Only)**: ~200 lines
**Phase 3 (Full Trading)**: +~100 lines

---

## Testing Strategy (Manual)

### Phase 1: Feature Disabled (Default)

**Config**: `perpsEquityEnabled: false`

- ✅ Verify only main DEX markets shown
- ✅ Verify no badges displayed
- ✅ Verify existing functionality unchanged

### Phase 2: Feature Enabled - Auto Discovery

**Config**: `perpsEquityEnabled: true, perpsEnabledDexs: []`

- ✅ Verify main DEX + HIP-3 DEX markets both shown
- ✅ Verify HIP-3 markets display badge with DEX name
- ✅ Verify badge text matches DEX name from API

### Phase 3: Feature Enabled - Whitelist

**Config**: `perpsEquityEnabled: true, perpsEnabledDexs: ["xyz"]`

- ✅ Verify only "xyz" DEX shown (plus main DEX)
- ✅ Verify other HIP-3 DEXs filtered out

### Phase 4: Invalid Configuration

**Config**: `perpsEquityEnabled: true, perpsEnabledDexs: ["invalid"]`

- ✅ Verify invalid DEX ignored (logs warning)
- ✅ Verify main DEX still works

### Phase 5: Trading Flow

- ⚠️ **Critical**: Place test order on HIP-3 market
- ✅ Verify order routes to correct DEX
- ✅ Verify asset mapping resolves correctly

---

## Critical Questions - ANSWERED via SDK Research

### 1. ✅ Order Placement Routing

**Question**: How do orders route to specific HIP-3 DEXs?
**Answer**: Orders route via **asset ID** - no explicit `dex` parameter in order request

- Each DEX has separate asset ID namespace (0, 1, 2... within that DEX)
- Asset mapping MUST be DEX-prefixed: `"xyz:XYZ100"` → asset ID for "xyz" DEX
- SDK order params: `{ a: assetId, b: isBuy, p: price, s: size, ... }`
- Asset ID implicitly determines the target DEX

**Implementation**: Update `buildAssetMapping()` to use `${dex}:${symbol}` keys

---

### 2. ✅ WebSocket Subscriptions

**Question**: Do subscriptions need DEX context?
**Answer**: YES - multiple parallel subscriptions required

- `allMids({ dex: "xyz" })` - Prices per DEX
- `clearinghouseState({ user, dex: "xyz" })` - Account state per DEX
- Each subscription filters by `dex` parameter (empty string = main DEX)
- Must subscribe to ALL active DEXs separately

**Implementation**: Extend `HyperLiquidSubscriptionService` to manage multiple DEX subscriptions

---

### 3. ⚠️ CRITICAL: Funding Flow Between DEXs

**Question**: How do users transfer collateral from main DEX to HIP-3 DEX?
**Answer**: **NO MAINNET API EXISTS** - testnet-only limitation

**SDK Evidence**:

- `sendAsset()` API marked **"testnet-only"** in SDK docs
- Supports `sourceDex` and `destinationDex` parameters
- Only works on testnet environment
- No mainnet equivalent documented

**Hyperliquid Docs Confirmation**:

- Exchange endpoint docs explicitly state: "Send Asset (testnet only)"
- No alternative mainnet transfer API found
- `usdClassTransfer()` only works for Spot ↔ Main Perp (not DEX-to-DEX)

**BLOCKING ISSUE**: Cannot enable HIP-3 trading on mainnet without funding mechanism

**Options**:

1. **Display-only mode**: Show HIP-3 markets but block trading with error message
2. **Manual transfers**: Guide users to HyperLiquid UI to transfer funds manually
3. **Research undocumented APIs**: Check if private/undocumented mainnet API exists
4. **Wait for SDK update**: HyperLiquid may add mainnet support later

**Recommendation**: Start with display-only mode (Option 1) + manual transfer guidance (Option 2)

---

### 4. ✅ Balance Aggregation Across DEXs

**Question**: How to display total account value across all DEXs?
**Answer**: Client-side aggregation required - no unified API

**SDK Evidence**:

- `clearinghouseState({ user, dex })` returns per-DEX account state
  - `accountValue` - Total value for that DEX
  - `withdrawable` - Available balance
  - `assetPositions` - Open positions with PnL
- `portfolio({ user })` returns historical data but **no `dex` parameter** (main DEX only)
- NO API endpoint returns aggregated cross-DEX balance

**Implementation Strategy**:

```typescript
async getAggregatedBalance(user: string): Promise<AccountState> {
  const dexs = await this.getValidatedDexs(); // [null, "xyz", "abc", ...]

  const allStates = await Promise.all(
    dexs.map(dex =>
      infoClient.clearinghouseState({ user, dex: dex ?? '' })
    )
  );

  // Aggregate totals
  const totalAccountValue = allStates.reduce(
    (sum, state) => sum + parseFloat(state.marginSummary.accountValue),
    0
  );

  const totalWithdrawable = allStates.reduce(
    (sum, state) => sum + parseFloat(state.withdrawable),
    0
  );

  // Return combined view with per-DEX breakdown
  return {
    totalAccountValue,
    totalWithdrawable,
    dexBreakdown: allStates.map((state, idx) => ({
      dex: dexs[idx],
      accountValue: parseFloat(state.marginSummary.accountValue),
      positions: state.assetPositions.length,
    })),
  };
}
```

**UX Considerations**:

- Show total balance prominently: `$10,000 Total (across 3 DEXs)`
- Expandable breakdown: Main DEX: $7,000 | xyz: $2,000 | abc: $1,000
- Visual indicator if balance locked in specific DEX (can't cross-trade)
- Warning if insufficient balance in target DEX for order

---

### 5. Redux State Access in PerpsController

**Status**: To be determined during implementation
**Approach**: Review controller initialization to find Redux access pattern

---

## Phased Rollout Strategy

### Phase 1: Display-Only Mode (Week 0-2)

**Goal**: Show HIP-3 markets without enabling trading

**Deployment**:

- Deploy with `perpsEquityEnabled: false` initially
- Enable on testnet: `perpsEquityEnabled: true, perpsEnabledDexs: []`
- Test full testnet flow including `sendAsset()` transfers

**Implementation**:

- ✅ Fetch and display HIP-3 markets with badges
- ✅ Show aggregated balance across all DEXs
- ✅ Per-DEX balance breakdown in UI
- ❌ Block order placement on HIP-3 markets with informative error:
  ```
  "HIP-3 market trading requires manual fund transfer.
   Visit hyperliquid.xyz to transfer collateral to [xyz] DEX."
  ```

**Testing Checklist**:

- ✅ Verify HIP-3 markets display correctly
- ✅ Verify badges show correct DEX names
- ✅ Verify aggregated balance calculation
- ✅ Verify error message when attempting HIP-3 order
- ✅ Verify main DEX trading unaffected

**Success Criteria**:

- Zero user complaints about broken functionality
- Users can see HIP-3 opportunities
- Main DEX trading works normally

---

### Phase 2: Research Funding Flow (Week 3-4)

**Goal**: Investigate mainnet transfer capabilities

**Tasks**:

1. **Direct HyperLiquid Outreach**:

   - Contact HyperLiquid team about mainnet `sendAsset()` API
   - Ask if undocumented private API exists
   - Request ETA for mainnet DEX-to-DEX transfers

2. **Protocol Analysis**:

   - Monitor HyperLiquid UI network traffic for transfer calls
   - Check if web app uses special API we don't have access to
   - Review HyperLiquid Discord/community for transfer workflows

3. **Alternative Solutions**:
   - Deep link to HyperLiquid UI with pre-filled transfer params?
   - In-app browser showing HyperLiquid transfer page?
   - Wait for SDK update with mainnet support?

**Decision Point**: Proceed to Phase 3 only if viable funding solution found

---

### Phase 3: Full Trading Enablement (Week 5+)

**Prerequisites**:

- ✅ Funding flow mechanism confirmed (automated or manual)
- ✅ Testnet validation complete with real transfers
- ✅ Balance aggregation tested across multiple DEXs

**Mainnet Rollout**:

**Week 5**: Single DEX Pilot

- Enable: `perpsEquityEnabled: true, perpsEnabledDexs: ["verified-dex"]`
- Choose well-established HIP-3 DEX with high liquidity
- Monitor for 1 week:
  - Order success/failure rates
  - Balance sync accuracy
  - WebSocket subscription stability
  - User feedback on UX

**Week 6**: Expand to 2-3 DEXs

- Add vetted DEXs: `perpsEnabledDexs: ["verified-dex", "dex2", "dex3"]`
- Monitor:
  - Performance with multiple parallel subscriptions
  - Balance aggregation correctness
  - Any DEX-specific issues

**Week 7+**: Full Auto-Discovery

- Enable: `perpsEnabledDexs: []` (show all HIP-3 DEXs)
- Final monitoring:
  - System performance under load
  - Edge cases with new DEX deployments
  - User satisfaction metrics

---

### Rollback Plan

**Emergency Kill Switch**:

- Set `perpsEquityEnabled: false` → immediately disables HIP-3
- Users see only main DEX (original behavior)
- No code deployment required

**Partial Rollback**:

- Remove problematic DEX from whitelist
- Example: `perpsEnabledDexs: ["xyz"]` (exclude "abc" due to issues)

**Testing**: Validate kill switch works in staging before mainnet deployment

---

## Risk Mitigation

### Performance Impact

- **Risk**: Fetching multiple DEXs slows initial load
- **Mitigation**: Parallel `Promise.all()` for metadata fetching
- **Mitigation**: Cache validated DEX list

### Invalid DEX Names

- **Risk**: Typos in feature flag config break app
- **Mitigation**: Graceful filtering - invalid DEXs silently ignored
- **Mitigation**: Logging for debugging

### API Failures

- **Risk**: Single DEX API failure blocks all markets
- **Mitigation**: Per-DEX error handling with `.catch()`
- **Mitigation**: Failed DEXs skipped, others continue

### Kill Switch Requirement

- **Risk**: Need to disable HIP-3 immediately without code deploy
- **Mitigation**: `perpsEquityEnabled: false` immediately reverts to main DEX only
- **Validation**: Test kill switch in staging

---

## Success Metrics

### Phase 1 (Display-Only)

- ✅ Code changes ~200 lines for display features
- ✅ Zero breaking changes to existing perps functionality
- ✅ Feature flags control behavior without code changes
- ✅ Invalid configurations handled gracefully
- ✅ HIP-3 markets display with clear badges
- ✅ Aggregated balance across DEXs displays correctly
- ✅ Per-DEX balance breakdown shown in UI
- ✅ Informative error when attempting HIP-3 orders
- ✅ Main DEX trading completely unaffected

### Phase 3 (Full Trading - Requires Funding Solution)

- ✅ Funding flow documented and tested
- ✅ Orders successfully route to correct HIP-3 DEX
- ✅ WebSocket subscriptions stable across multiple DEXs
- ✅ Balance updates accurately reflect cross-DEX positions
- ✅ No race conditions or sync issues
- ✅ Performance acceptable with 3+ active DEXs

---

## Summary

**Current Status**: Ready to implement Phase 1 (Display-Only)

**Blocker for Phase 3**: No mainnet API for DEX-to-DEX transfers

- `sendAsset()` confirmed testnet-only
- No alternative mainnet API discovered
- Must resolve before enabling HIP-3 trading

**Recommended Approach**:

1. ✅ Implement Phase 1 immediately (display + aggregated balance)
2. ⏳ Parallel research on funding flow (Phase 2)
3. ⚠️ Phase 3 contingent on funding solution

**Value Delivered in Phase 1**:

- Users can discover HIP-3 markets
- Users see total portfolio value across all DEXs
- Zero risk to existing functionality
- Foundation ready for Phase 3 when funding solved
