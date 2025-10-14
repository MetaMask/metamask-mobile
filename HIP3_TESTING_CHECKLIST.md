# HIP-3 xyz100 Testing Checklist

## 🔄 Step 1: Complete App Restart

1. **Kill Metro bundler** completely
2. **Run:** `yarn start --reset-cache`
3. **Kill the app** (force close, don't just reload)
4. **Reopen the app** fresh

## 🔍 Step 2: Check Initialization Logs

Look for these logs in Metro console:

### Expected Success Logs:

```
[MetaMask DEBUG]: Building asset mapping for HIP-3 DEXs: { dexCount: X }
[MetaMask DEBUG]: Added HIP-3 DEX test to asset mapping: { dex: 'test', assetCount: Y }
[MetaMask DEBUG]: Asset mapping built {
  totalAssets: N,
  mainDexAssets: M,
  coins: ['BTC', 'ETH', ..., 'XYZ100']  <-- CHECK IF XYZ100 IS HERE
}
[MetaMask DEBUG]: Setting up HIP-3 price subscriptions: { dexCount: X }
[MetaMask DEBUG]: HIP-3 allMids subscription established for DEX: test
```

### 🚨 Critical Check:

**What is the exact symbol in the coins array?**

- ✅ Good: `'XYZ100'` (no prefix)
- ❌ Bad: `'xyz:XYZ100'` (with prefix)
- ❌ Bad: Missing entirely

## 🔍 Step 3: Navigate to xyz100

1. Go to market list
2. Find xyz100
3. Check if it shows HIP-3 badge
4. Tap to open market details

### Expected Logs:

```
[MetaMask DEBUG]: Getting markets via HyperLiquid SDK
[MetaMask DEBUG]: Fetched HIP-3 DEXs: { count: X }
[MetaMask DEBUG]: Fetched markets for HIP-3 DEX test: { dex: 'test', deployer: '0x...', marketCount: Y }
```

## 🔍 Step 4: Check Market Details View

### What to verify:

- [ ] Current price shows real value (not "--")
- [ ] HIP-3 badge appears
- [ ] Market stats load
- [ ] Long/Short buttons are enabled

### If "Asset is not tradable" error appears:

Check DevLogger for:

```
[MetaMask DEBUG]: Error fetching market data: <details>
```

This tells us if `getMarkets()` is returning xyz100 or not.

## 🔍 Step 5: Click Long Button

### Expected Logs:

```
[MetaMask DEBUG]: usePerpsMarketData fetching for: XYZ100  <-- Check format here
```

### What to verify on order screen:

- [ ] Asset symbol displays correctly (should be "XYZ100", not "xyz:XYZ100")
- [ ] Current price displays
- [ ] Liquidation price shows real value (not "$0")
- [ ] Place Order button is enabled

## 🔍 Step 6: Try Placing Order

### Expected Logs (Success Path):

```
[MetaMask DEBUG]: Found asset XYZ100 in HIP-3 DEX: test
[MetaMask DEBUG]: Placing order for HIP-3 asset XYZ100 on DEX: test
[MetaMask DEBUG]: Placing order via HyperLiquid SDK: { coin: 'XYZ100', ... }
```

### Possible Errors & Meaning:

#### Error 1: "Order could not immediately match against any resting orders"

**Meaning:** Order was placed correctly, but there's no liquidity on the order book  
**Solution:** This is NOT a bug - xyz100 might have low/no liquidity  
**Try:** Use a limit order instead of market order

#### Error 2: "Asset XYZ100 not found"

**Meaning:** `findAssetInfo()` couldn't locate the asset  
**Check:** Did Step 2 logs show XYZ100 in the coins array?

#### Error 3: "Asset ID not found for XYZ100"

**Meaning:** Asset not in `coinToAssetId` mapping  
**Check:** Did app fully restart? Old mapping might be cached

#### Error 4: "Cannot read property 'type' of undefined"

**Meaning:** Position data malformed (we added defensive checks for this)  
**Should be fixed** by latest commit

## 🐛 Known Issue: DEX-Specific Asset IDs

**CRITICAL DISCOVERY:**  
Asset IDs are DEX-specific! Each DEX numbers its assets starting from 0:

- Main DEX: BTC=0, ETH=1, SOL=2...
- Test DEX: XYZ100=0 (first asset in test DEX)

**Current Problem:**  
We merge all asset IDs into one map, so when we send asset=0 for xyz100, the API might interpret it as asset 0 in the wrong DEX!

**Potential Solutions:**

1. Check if orders need to be placed via a DEX-specific client
2. Check if user needs to transfer funds to test DEX first
3. Check if there's a dex parameter we're missing in the order API

## 🔬 Debug Commands

### Check what markets are fetched:

In the app, add a log in `usePerpsMarkets`:

```typescript
DevLogger.log(
  'All markets:',
  markets.map((m) => ({
    symbol: m.symbol,
    dexName: m.dexName,
    isHip3: m.isHip3,
  })),
);
```

### Check asset mapping:

Look for this log after app starts:

```
Asset mapping built: { coins: [...] }
```

### Check if xyz100 price is in cache:

After subscribing to prices, check:

```
[MetaMask DEBUG]: HIP-3 allMids subscription established for DEX: test
```

## 📋 Report Back

Please share:

1. ✅ What symbol appears in the asset mapping coins array?
2. ✅ Does "xyz:XYZ100" format appear in logs or only in tracking events?
3. ✅ What exact error message shows when placing order?
4. ✅ Screenshot of xyz100 market details view showing prices

This will help identify if it's:

- A) Symbol format issue (prefix being added)
- B) Asset mapping issue (not included)
- C) DEX routing issue (wrong asset ID)
- D) Liquidity issue (order can't fill)
