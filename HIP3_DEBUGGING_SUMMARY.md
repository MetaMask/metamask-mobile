# HIP-3 xyz100 Debugging Summary

## Issues Found & Fixed

### Issue 1: Order Button Disabled ❌

**Error:** Asset xyz100 not found in coinToAssetId mapping  
**Cause:** `buildAssetMapping()` only included validator-operated markets  
**Fix:** Updated to fetch and include all HIP-3 DEX assets in mapping  
**Commit:** `ac5da01` - "fix: Include HIP-3 assets in coinToAssetId mapping"

### Issue 2: Asset Not Found During Order Placement ❌

**Error:** "Asset xyz100 not found"  
**Cause:** `placeOrder()` only searched `meta.universe` (main DEX)  
**Fix:** Created `findAssetInfo()` helper that searches all DEXs  
**Affected Methods:**

- `placeOrder()`
- `editOrder()`
- `updatePositionTPSL()`
- `getMaxLeverage()`

**Commit:** `0877caa` - "fix: Enable HIP-3 asset trading by fixing asset lookup"

### Issue 3: No Price Data ("--" displayed) ❌

**Error:** Current price showing as "--", liquidation price as "$0"  
**Cause:** Price fetching didn't use `dex` parameter for HIP-3 assets  
**Fixes:**

1. Updated `placeOrder()` to fetch prices with dex param
2. Updated `editOrder()` to fetch prices with dex param
3. Added `ensureHip3AllMidsSubscriptions()` for WebSocket price feeds
4. Updated `getPositions()` to fetch orders from all HIP-3 DEXs

**Commit:** `0877caa` - "fix: Enable HIP-3 asset trading by fixing price subscriptions"

### Issue 4: Position Adapter Error ❌

**Error:** "Cannot read property 'type' of undefined"  
**Cause:** Missing defensive null checks on `pos.leverage`  
**Fix:** Added fallback to default isolated margin if leverage data missing  
**Commit:** `cc35a81` - "fix: Add defensive null checks for position leverage data"

## Testing Instructions

### Full App Restart Required

HIP-3 support requires **complete app restart** to:

1. Rebuild asset mappings with HIP-3 DEXs
2. Establish WebSocket subscriptions for HIP-3 prices
3. Load position data from all DEXs

### Steps to Test xyz100

1. **Kill the app completely** (not just reload)
2. **Restart Metro bundler**: `yarn start --reset-cache`
3. **Launch app fresh**
4. **Check logs for success indicators:**

   ```
   Building asset mapping for HIP-3 DEXs: { dexCount: 1 }
   Added HIP-3 DEX test to asset mapping: { dex: 'test', assetCount: 1 }
   Setting up HIP-3 price subscriptions: { dexCount: 1 }
   HIP-3 allMids subscription established for DEX: test
   ```

5. **Navigate to xyz100 market**
6. **Verify:**

   - ✅ Current price displays (not "--")
   - ✅ HIP-3 badge shows "HIP-3"
   - ✅ Long/Short buttons enabled

7. **Click Long button**
8. **Verify order screen:**

   - ✅ Price displays correctly
   - ✅ Liquidation price shows real value (not "$0")
   - ✅ Place Order button enabled
   - ✅ Fee calculations work

9. **Place order and verify:**
   - ✅ Order submits successfully
   - ✅ Position appears with correct data
   - ✅ No "Cannot read property 'type'" errors

## API Calls with DEX Parameter

The following API calls now support HIP-3 via `dex` parameter:

```typescript
// Market metadata
await infoClient.meta({ dex: 'dex-name' });

// Price data
await infoClient.allMids({ dex: 'dex-name' });

// User orders
await infoClient.frontendOpenOrders({ user: address, dex: 'dex-name' });

// WebSocket subscriptions
subscriptionClient.allMids({ dex: 'dex-name' }, callback);
```

## What Still Works

- ✅ Validator-operated markets (BTC, ETH, etc.) - unchanged
- ✅ All existing trading functionality
- ✅ Market list displays both types
- ✅ Position management
- ✅ Order management
- ✅ TP/SL functionality

## Architecture Summary

```
HyperLiquid DEX Structure:
├── Main DEX (validator-operated)
│   ├── BTC, ETH, SOL, etc.
│   └── Default/empty dex parameter
│
└── HIP-3 DEXs (builder-deployed)
    ├── DEX: "test"
    │   ├── xyz100
    │   └── [other assets]
    ├── DEX: "another-dex"
    │   └── [assets]
    └── ...

MetaMask Integration:
├── buildAssetMapping() → Merges all DEX assets
├── findAssetInfo() → Searches all DEXs
├── getMarkets() → Fetches from all DEXs
├── getMarketDataWithPrices() → Includes all DEXs
├── placeOrder() → Routes to correct DEX
├── getPositions() → Fetches orders from all DEXs
└── WebSocket Subscriptions → Subscribes to all DEX price feeds
```

## Known Limitations

1. **Performance**: Fetching from multiple DEXs adds latency

   - Main DEX: ~100-200ms
   - - Each HIP-3 DEX: ~100-200ms
   - Total: Could be 500ms+ with multiple HIP-3 DEXs

2. **Caching**: Asset mapping cached after first load

   - New HIP-3 DEXs won't appear until app restart
   - Could add polling/refresh mechanism

3. **Error Handling**: Graceful degradation
   - If HIP-3 fetch fails, main DEX continues working
   - Errors logged but don't block core functionality

## Next Steps

If issues persist after full restart:

1. Check Metro logs for "Building asset mapping" messages
2. Verify HIP-3 subscription establishment
3. Check if xyz100 appears in asset mapping
4. Enable DevLogger to see detailed logs
5. Check network requests in debugger
