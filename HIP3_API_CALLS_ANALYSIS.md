# HIP-3 API Calls Analysis - Why 429 Rate Limit?

## 🔍 API Call Comparison

### Regular Asset (ETH 2x Long)

```
placeOrder("ETH") {
  1. ensureReady() {
       └─ buildAssetMapping() {
            └─ infoClient.meta()                    ← 1 call
          }
     }

  2. ensureBuilderFeeApproval() {
       └─ infoClient.builderFee()                   ← 1 call
     }

  3. ensureReferralSet() {
       ├─ isReferralCodeReady() {
       │    └─ infoClient.referral()                ← 1 call ✅ SUCCESS
       │  }
       └─ checkReferralSet() {
            └─ infoClient.referral()                ← 1 call
          }
     }

  4. findAssetInfo("ETH") {
       └─ infoClient.meta()                         ← 1 call (finds in main DEX)
     }

  5. exchangeClient.order()                         ← 1 call
}

Total API calls: ~6 calls
Rate limit: ✅ Within limits
```

### HIP-3 Asset (XYZ100 20x Long)

```
placeOrder("XYZ100") {
  1. ensureReady() {
       └─ buildAssetMapping() {
            ├─ infoClient.meta()                    ← 1 call (main DEX)
            ├─ infoClient.perpDexs()                ← 1 call
            ├─ infoClient.meta({ dex: "xyz" })      ← 1 call
            ├─ infoClient.meta({ dex: "otherDex" }) ← 1 call per DEX
            └─ ... (for each HIP-3 DEX)
          }
     }

  2. ensureBuilderFeeApproval() {
       └─ infoClient.builderFee()                   ← 1 call
     }

  3. ensureReferralSet() {
       ├─ isReferralCodeReady() {
       │    └─ infoClient.referral()                ← 1 call ❌ 429 ERROR!
       │  }
       └─ BLOCKED - can't continue
     }

  4. findAssetInfo("XYZ100") {
       ├─ infoClient.meta()                         ← 1 call (search main)
       ├─ infoClient.perpDexs()                     ← 1 call (DUPLICATE!)
       ├─ infoClient.meta({ dex: "xyz" })           ← 1 call (DUPLICATE!)
       └─ Found! ✅
     }

  5. exchangeClient.order()                         ← NEVER REACHED
}

Total API calls: ~10+ calls (before even placing order!)
Rate limit: ❌ EXCEEDS LIMIT - Gets 429 on referral check
```

## 💥 The 429 Error

**Specific API:** `infoClient.referral({ user: referrerAddress })`

**Why it fails:**

- Hyperliquid has aggressive rate limits (probably ~5-10 calls/second per endpoint)
- HIP-3 asset flow makes **2x the API calls** due to:
  - `perpDexs()` called in buildAssetMapping
  - `perpDexs()` called AGAIN in findAssetInfo
  - `meta({ dex })` for each DEX, twice
- By the time we reach `referral()`, we've used up rate limit budget
- `referral()` endpoint gets 429

**Why ETH doesn't fail:**

- Only ~6 API calls total
- Stays well under rate limit
- `referral()` succeeds

## 🔧 The Fixes Applied

### Fix 1: Caching Referral Status ✅

```typescript
private referralStatusCache = {
  isReady: boolean,
  timestamp: number
} | null;

// Cache for 5 minutes to avoid repeated referral() calls
```

### Fix 2: Non-blocking Referral ✅

```typescript
try {
  await ensureReferralSet();
} catch (error) {
  // Don't throw - allow order to continue
  DevLogger.log('Referral failed but continuing...');
}
```

### Fix 3: 429-Specific Handling ✅

```typescript
if (errorMsg.includes('429')) {
  DevLogger.log('Rate limited - skipping referral');
  return false; // Don't block order
}
```

## 🚀 What Still Needs Fixing

### Performance Optimization: Cache perpDexs

**Problem:** `findAssetInfo()` calls `perpDexs()` every time

**Solution:** Cache the DEX list

```typescript
private perpDexsCache: {
  dexs: PerpDex[];
  timestamp: number;
} | null = null;

private async getCachedPerpDexs() {
  if (cache is fresh) return cache;
  const dexs = await infoClient.perpDexs();
  this.perpDexsCache = { dexs, timestamp: Date.now() };
  return dexs;
}
```

This would reduce API calls by ~50%!

### Alternative: Store DEX in Market Data

Instead of calling `findAssetInfo()` on every order, we could:

1. Store `dexName` in the market data (already doing this! ✅)
2. Pass `dexName` to `placeOrder()`
3. Skip the `findAssetInfo()` call entirely

```typescript
// When navigating to order screen
navigation.navigate('Order', {
  asset: 'XYZ100',
  dexName: 'xyz', // ← Add this!
});

// In placeOrder
if (params.dexName) {
  // Skip findAssetInfo, we already know the DEX!
  const assetInfo = await infoClient.meta({ dex: params.dexName });
}
```

## 🎯 Summary

**The 429 is on:** `infoClient.referral({ user: referrerAddr })`

**Why HIP-3 triggers it:**

- 10+ API calls before referral check
- Rate limit budget exhausted
- referral() gets blocked

**Current fix:**

- ✅ Referral now non-blocking
- ✅ Caching referral status
- ✅ 429 handled gracefully

**Try now:**

- Reload app
- Place xyz100 order
- Should get past referral 429
- Might still fail on "no liquidity" if order book is empty
