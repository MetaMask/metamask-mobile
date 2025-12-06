# Removed Fields Analysis - HyperLiquid WebSocket API

## Summary

After comparing the official HyperLiquid WebSocket API documentation with the codebase, the following fields/subscriptions have been removed or are no longer documented:

## 1. `webData2` Subscription Type (REMOVED)

**Status:** ❌ **REMOVED** - Not mentioned in official documentation

**Location in code:**

- `app/components/UI/Perps/services/HyperLiquidSubscriptionService.ts:776`

**Issue:**

- The official documentation only mentions `webData3` as a subscription type
- The codebase uses `webData2` when HIP-3 is disabled (main DEX only)
- `webData2` is not listed in the official subscription types

**Fields accessed from `webData2` that are problematic:**

- `data.clearinghouseState` - This is documented as a **separate subscription type**, not a field
- `data.openOrders` - This is documented as a **separate subscription type**, not a field
- `data.perpsAtOpenInterestCap` - This field is only documented in `PerpDexState` (part of `webData3`), not in `webData2`

## 2. `clearinghouseState` as a Field (CHANGED)

**Status:** ⚠️ **CHANGED** - Now a separate subscription type, not a field

**Location in code:**

- `app/components/UI/Perps/services/HyperLiquidSubscriptionService.ts:781` (from `webData2`)
- `app/components/UI/Perps/services/HyperLiquidSubscriptionService.ts:893` (from `webData3.perpDexStates[]`)

**Issue:**

- Official docs show `clearinghouseState` as a **separate subscription type** with format: `{ "type": "clearinghouseState", "user": "<address>" }`
- The code accesses it as a field: `data.clearinghouseState` (from `webData2`) or `dexState.clearinghouseState` (from `webData3`)

**Official documentation:**

```typescript
// Subscription type (not a field):
{ "type": "clearinghouseState", "user": "<address>" }

// Data format:
interface ClearinghouseState {
  assetPositions: Array<AssetPosition>;
  marginSummary: MarginSummary;
  crossMarginSummary: MarginSummary;
  crossMaintenanceMarginUsed: number;
  withdrawable: number;
}
```

## 3. `openOrders` as a Field (CHANGED)

**Status:** ⚠️ **CHANGED** - Now a separate subscription type, not a field

**Location in code:**

- `app/components/UI/Perps/services/HyperLiquidSubscriptionService.ts:790` (from `webData2`)
- `app/components/UI/Perps/services/HyperLiquidSubscriptionService.ts:903` (from `webData3.perpDexStates[]`)

**Issue:**

- Official docs show `openOrders` as a **separate subscription type** with format: `{ "type": "openOrders", "user": "<address>" }`
- The code accesses it as a field: `data.openOrders` (from `webData2`) or `dexState.openOrders` (from `webData3`)

**Official documentation:**

```typescript
// Subscription type (not a field):
{ "type": "openOrders", "user": "<address>" }

// Data format:
interface OpenOrders {
  dex: string;
  user: string;
  orders: Array<Order>;
}
```

## 4. `perpsAtOpenInterestCap` in `webData2` (REMOVED)

**Status:** ❌ **REMOVED** - Not available in `webData2` according to official docs

**Location in code:**

- `app/components/UI/Perps/services/HyperLiquidSubscriptionService.ts:811` (from `webData2`)

**Issue:**

- The field `perpsAtOpenInterestCap` is only documented in `PerpDexState` interface (part of `webData3`)
- The code accesses `data.perpsAtOpenInterestCap` from `webData2`, but this field is not documented for `webData2`

**Official documentation:**

```typescript
// Only in PerpDexState (part of webData3):
interface PerpDexState {
  totalVaultEquity: number;
  perpsAtOpenInterestCap?: Array<string>; // Optional, only in webData3
  leadingVaults?: Array<LeadingVault>;
}
```

## 5. `PerpDexState` Structure in `webData3`

**Status:** ✅ **DOCUMENTED** - But structure may differ from what code expects

**Location in code:**

- `app/components/UI/Perps/services/HyperLiquidSubscriptionService.ts:873-925` (from `webData3`)

**Official documentation:**

```typescript
interface WebData3 {
  userState: {
    agentAddress: string | null;
    agentValidUntil: number | null;
    serverTime: number;
    cumLedger: number;
    isVault: boolean;
    user: string;
    optOutOfSpotDusting?: boolean;
    dexAbstractionEnabled?: boolean;
  };
  perpDexStates: Array<PerpDexState>;
}

interface PerpDexState {
  totalVaultEquity: number;
  perpsAtOpenInterestCap?: Array<string>;
  leadingVaults?: Array<LeadingVault>;
}
```

**Issue:**

- The code accesses `dexState.clearinghouseState` and `dexState.openOrders` from `PerpDexState`
- But the official `PerpDexState` interface only shows: `totalVaultEquity`, `perpsAtOpenInterestCap`, and `leadingVaults`
- **`clearinghouseState` and `openOrders` are NOT documented as fields in `PerpDexState`**

## Recommendations

1. **Migrate from `webData2` to `webData3`** - The `webData2` subscription type is not in the official docs
2. **Use separate subscriptions** - Consider using `clearinghouseState` and `openOrders` as separate subscription types instead of accessing them as fields
3. **Verify `PerpDexState` structure** - Confirm with HyperLiquid if `clearinghouseState` and `openOrders` are actually fields in `PerpDexState` or if they need to be accessed differently
4. **Add defensive checks** - Add null/undefined checks for fields that may have been removed

## Code Locations to Update

1. `app/components/UI/Perps/services/HyperLiquidSubscriptionService.ts:776-866` - `webData2` subscription
2. `app/components/UI/Perps/services/HyperLiquidSubscriptionService.ts:870-1036` - `webData3` subscription accessing `clearinghouseState` and `openOrders` from `PerpDexState`
