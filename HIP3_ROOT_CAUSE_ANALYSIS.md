# HIP-3 Root Cause Analysis - xyz100 Trading Issues

## 🎯 Core Problem: Independent DEX Architecture

### Critical Discovery

**Each HIP-3 DEX is completely independent with its own:**

1. ✅ Asset numbering (xyz100 = asset ID 0 in test DEX)
2. ✅ Collateral pool (separate USDC balance)
3. ✅ Order books (independent liquidity)
4. ✅ Margining system

### The Missing Piece: Collateral Transfer

**From HIP-3 docs:**

> "Each perp dex features independent margining, order books, and deployer settings."

This means:

```
Main DEX Balance: $1000 USDC ❌ Cannot trade on test DEX
Test DEX Balance: $0 USDC     ❌ Cannot place orders

User must transfer first! ↓

perpDexClassTransfer({ dex: "test", amount: "100", toPerp: true })

Main DEX Balance: $900 USDC
Test DEX Balance: $100 USDC   ✅ Now can trade xyz100!
```

## 🔍 Evidence

### Error Message Analysis

```
Order could not immediately match against any resting orders. asset=0
```

**What this really means:**

- We send `asset=0` (correct for xyz100 in test DEX)
- BUT order goes to **main DEX** (where asset 0 = BTC)
- Main DEX has no "xyz100" in its order book
- Error: "could not match" because xyz100 doesn't exist on main DEX

### Asset ID Collision

```
Main DEX:  BTC=0,    ETH=1,    SOL=2,   ...
Test DEX:  XYZ100=0, asset2=1, asset3=2, ...
           ↑
        Same ID, different assets!
```

When we merge into one map:

```typescript
coinToAssetId.set('BTC', 0); // Main DEX
coinToAssetId.set('XYZ100', 0); // Test DEX - OVERWRITES BTC!
// OR vice versa depending on order
```

## 💡 The Solution

### Option 1: Separate Asset ID Maps Per DEX (Complex)

```typescript
private mainDexAssetMap = new Map<string, number>();
private hip3DexAssetMaps = new Map<string, Map<string, number>>();

// When placing order:
const dexName = this.getDexForAsset(params.coin);
const assetMap = dexName
  ? this.hip3DexAssetMaps.get(dexName)
  : this.mainDexAssetMap;
const assetId = assetMap.get(params.coin);
```

### Option 2: User Balance Determines DEX (API Behavior?)

**Hypothesis:** Maybe the Hyperliquid API automatically routes orders based on where the user has collateral?

**Test:** Check clearinghouseState to see if it returns separate balances per DEX

### Option 3: Require Collateral Transfer First (Likely Correct!)

**Flow:**

1. Detect user wants to trade HIP-3 asset
2. Check if user has balance in that DEX
3. If not, show modal: "Transfer funds to test DEX to trade xyz100"
4. Execute `perpDexClassTransfer`
5. THEN allow order placement

## 🧪 Testing To Confirm

### Check 1: Does clearinghouseState show per-DEX balances?

```typescript
const state = await infoClient.clearinghouseState({ user: address });
// Does this show separate balances for each DEX?
// Or only main DEX balance?
```

### Check 2: What happens if we try perpDexClassTransfer?

```typescript
await exchangeClient.perpDexClassTransfer({
  dex: 'test',
  token: 'USDC',
  amount: '100',
  toPerp: true,
});
```

Does this allow xyz100 trading afterward?

### Check 3: Can we query balance per DEX?

```typescript
const mainState = await infoClient.clearinghouseState({ user: address });
const testDexState = await infoClient.clearinghouseState({
  user: address,
  dex: 'test', // Does this param exist?
});
```

## 🚨 Current Status

### What Works ✅

- Fetching HIP-3 markets and metadata
- Displaying HIP-3 badges in UI
- Price subscriptions for HIP-3 assets
- Asset info lookup across all DEXs

### What's Broken ❌

1. **Asset ID Collision** - Merging all DEX asset IDs causes conflicts
2. **No DEX Routing** - Orders don't specify which DEX to use
3. **Missing Collateral Check** - Don't verify user has funds in target DEX
4. **No Transfer UI** - Can't transfer funds to HIP-3 DEX from app

## 📋 Immediate Next Steps

1. **Test Theory:** Try `perpDexClassTransfer` from another wallet

   - Transfer USDC to test DEX
   - Check if xyz100 orders work after

2. **Check Balance API:** See if clearinghouseState supports `dex` parameter

3. **Implement Detection:**

   ```typescript
   // Before allowing HIP-3 order
   if (market.isHip3) {
     const dexBalance = await getDexBalance(market.dexName);
     if (dexBalance === 0) {
       showTransferModal();
       return;
     }
   }
   ```

4. **Add Transfer UI:** Modal to transfer funds to HIP-3 DEX before trading

## 🎯 Recommended Fix Path

1. **Short-term:** Add warning/error when user tries to trade HIP-3 without balance
2. **Medium-term:** Implement perpDexClassTransfer UI flow
3. **Long-term:** Auto-detect and suggest transfer when needed

## 📖 References

- [HIP-3 Deployer Actions](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/hip-3-deployer-actions)
- [PerpDexClassTransfer](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint)
