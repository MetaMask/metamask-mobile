# HIP-3 Implementation Status - TAT-1872

## ✅ What's Working

### 1. HIP-3 Detection & Display

- ✅ HIP-3 markets fetched from all DEXs via `perpDexs()`
- ✅ Markets enriched with metadata (dexName, deployer, isHip3 flag)
- ✅ HIP-3 badge displays in market list and details
- ✅ Hip3Utils provides helper functions for identification
- ✅ Symbols stored correctly as `"xyz:XYZ100"` (DEX prefix included)

### 2. Asset Discovery

- ✅ `findAssetInfo()` searches all DEXs (main + HIP-3)
- ✅ Asset metadata (szDecimals, maxLeverage) retrieved correctly
- ✅ Price data fetched with DEX parameter
- ✅ WebSocket subscriptions for HIP-3 prices via `allMids({ dex })`

### 3. Asset Mapping

- ✅ `buildAssetMapping()` includes all HIP-3 DEXs
- ✅ Stores `"xyz:XYZ100"` → asset ID 0
- ✅ Asset ID lookup succeeds

### 4. UI & UX

- ✅ Current price displays correctly (not "--")
- ✅ Liquidation price calculates properly (not "$0")
- ✅ Order button enabled
- ✅ Order validation passes
- ✅ Fee calculations work

### 5. Error Handling

- ✅ 429 rate limit on referral API handled gracefully
- ✅ Referral cache prevents repeated API calls
- ✅ Defensive null checks for position data
- ✅ Orders from all DEXs fetched in `getPositions()`

## ❌ What's Broken

### Critical Issue: DEX Routing

**Problem:** Orders sent with `asset=0` go to **main DEX** instead of **xyz DEX**

**Evidence:**

```
Order 0: Order could not immediately match against any resting orders. asset=0
```

**Root Cause:**  
Asset IDs are DEX-specific:

- Main DEX: BTC=0, ETH=1, ...ZEC=214, MON=215, MET=216 (217 assets total)
- xyz DEX: xyz:XYZ100=0

When we send:

```typescript
exchangeClient.order({
  orders: [{ a: 0, ... }],  // Which DEX's asset 0?
  ...
})
```

The API routes it to main DEX by default!

## 🔍 Attempted Solutions

### ❌ Attempt 1: vaultAddress Parameter

```typescript
order({ ..., vaultAddress: deployerAddress })
```

**Result:** `Vault not registered` error  
**Reason:** vaultAddress is for vault managers, not DEX routing

### ❌ Attempt 2: Separate ExchangeClient per DEX

**Status:** Not attempted yet  
**Theory:** Maybe need to create separate clients for each DEX?

### ❌ Attempt 3: Asset ID Offset

**Status:** Not implemented  
**Theory:** Use globally unique IDs (main: 0-216, xyz: 1000, etc.)

## 🎯 Current Hypothesis

Based on other wallet's seamless experience, the routing MUST be automatic.

**Possibilities:**

1. **Symbol-based routing:** API parses "xyz:" prefix from somewhere
2. **Global asset registry:** Real asset IDs are globally unique (not array indices)
3. **Account context:** Routing based on where user has positions/collateral
4. **Hidden parameter:** Some field we haven't discovered yet

## 📊 API Data Confirmed

### xyz DEX Structure:

```json
{
  "name": "xyz",
  "deployer": "0x88806a71d74ad0a510b350545c9ae490912f0888",
  "universe": [
    {
      "name": "xyz:XYZ100",  ← Symbol includes DEX prefix!
      "szDecimals": 4,
      "maxLeverage": 20,
      "onlyIsolated": true
    }
  ]
}
```

### Asset ID Mapping (Current):

```
Main DEX: "BTC" → 0, "ETH" → 1, ..., "MET" → 216
xyz DEX: "xyz:XYZ100" → 0  ← Collision with BTC!
```

## 🔬 Debug Information

### Successful Order Flow (ETH):

```
1. findAssetInfo("ETH") → finds in main DEX, assetId=1
2. order({ orders: [{ a: 1 }] }) → Routes to main DEX ✅
3. Fills successfully
```

### Failed Order Flow (xyz:XYZ100):

```
1. findAssetInfo("xyz:XYZ100") → finds in xyz DEX, assetId=0
2. order({ orders: [{ a: 0 }] }) → Routes to main DEX ❌ WRONG!
3. Error: "could not match against resting orders" (looking for BTC, not xyz:XYZ100)
```

## 📋 Next Investigation Steps

1. **Check clearinghouseState:** Does it show separate balances per DEX?
2. **Test perpDexTransfer:** Does transferring funds change routing?
3. **Inspect successful transaction:** Get raw transaction data from working wallet
4. **Check SDK examples:** Look for HIP-3 order placement code
5. **Ask Hyperliquid community:** How to place orders on HIP-3 DEXs?

## 💻 Code Changes Summary

### Files Modified (11 total):

1. `app/components/UI/Perps/types/index.ts` - Added PerpDex types
2. `app/components/UI/Perps/controllers/types/index.ts` - Extended MarketInfo/PerpsMarketData
3. `app/components/UI/Perps/controllers/types/hip3.ts` - New HIP-3 specific types
4. `app/components/UI/Perps/controllers/providers/HyperLiquidProvider.ts` - Core logic updates
5. `app/components/UI/Perps/utils/hyperLiquidAdapter.ts` - adaptMarketFromSDK updates
6. `app/components/UI/Perps/utils/hip3Utils.ts` - New utility functions
7. `app/components/UI/Perps/services/HyperLiquidSubscriptionService.ts` - HIP-3 price subs
8. `app/components/UI/Perps/components/Hip3Badge/` - New badge component
9. `app/components/UI/Perps/components/PerpsMarketRowItem/` - Badge integration
10. `app/components/UI/Perps/components/PerpsMarketHeader/` - Badge integration

### Commits (12 total):

- feat: Add HIP-3 support to perps integration
- fix: Include HIP-3 assets in coinToAssetId mapping
- fix: Enable HIP-3 asset trading by fixing asset lookup
- fix: Add defensive null checks for position leverage
- fix: Fetch orders from all HIP-3 DEXs
- fix: Handle 429 rate limit errors
- debug: Add comprehensive logging
- revert: Remove vaultAddress approach
- docs: Various analysis documents

## 🎯 Immediate Next Step

**Find out how other wallets route HIP-3 orders correctly!**

This is the blocking issue. Everything else works, we just need to discover the correct DEX routing mechanism.
