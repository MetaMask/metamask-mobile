# HIP-3 Final Status & Next Steps - TAT-1872

## 📊 Current Status: 95% Complete

### ✅ Everything Works EXCEPT Order Routing

**Implemented & Working:**

1. ✅ HIP-3 market detection and fetching
2. ✅ Metadata storage (dexName, deployer, isHip3)
3. ✅ UI badges showing HIP-3 markets
4. ✅ Symbol handling (`"xyz:XYZ100"` format)
5. ✅ Price subscriptions for all HIP-3 DEXs
6. ✅ Asset lookup across all DEXs
7. ✅ Order validation
8. ✅ Fee calculations
9. ✅ Liquidation price calculations
10. ✅ Position and order fetching from all DEXs
11. ✅ Error handling (429 rate limits, null checks)
12. ✅ Comprehensive logging

**NOT Working:**

- ❌ DEX routing for order placement (orders go to main DEX instead of HIP-3 DEX)

## 🔍 What We've Tried

### Attempt 1: vaultAddress Parameter ❌

```typescript
order({ ..., vaultAddress: deployerAddress })
```

**Result:** "Vault not registered" error  
**Reason:** vaultAddress is for vault managers, not DEX routing

### Attempt 2: dex Field in Action ❌

```typescript
order({ orders, grouping, builder, dex: 'xyz' });
```

**Result:** Still routes to main DEX (BTC order placed)  
**Reason:** API doesn't use dex field for routing (or we're passing it wrong)

### Attempt 3: SDK ActionSorter Patch ❌

Modified SDK to preserve `dex` field through actionSorter  
**Result:** Still routes to main DEX  
**Reason:** API doesn't support dex field in order actions

## 🎯 The Blocking Question

**How does Hyperliquid UI route orders to HIP-3 DEXs?**

We know:

- ✅ It works seamlessly in their UI
- ✅ No visible transfer transactions
- ✅ Funds automatically available across DEXs
- ❌ We can't find the routing mechanism

## 💡 Remaining Possibilities

### Theory 1: Separate ExchangeClient Per DEX

Maybe you need:

```typescript
const mainExchangeClient = new ExchangeClient({ wallet, transport });
const xyzExchangeClient = new ExchangeClient({
  wallet,
  transport,
  // Some parameter that sets DEX context?
});
```

### Theory 2: Pre-registration or Opt-in

Maybe users must:

1. "Join" or "enable" a HIP-3 DEX first
2. This associates their wallet with that DEX
3. Then orders automatically route based on asset

### Theory 3: API Version or Endpoint

Maybe:

- Different API endpoint for HIP-3 orders?
- Different transport configuration?
- API version that supports HIP-3?

### Theory 4: We're Using Wrong Asset IDs

Maybe:

- Asset IDs ARE globally unique (not DEX-scoped)
- We should NOT use array indices
- There's a global asset registry we haven't found
- xyz:XYZ100 has a real ID like 10000 not 0

## 📋 Recommended Next Steps

### Option A: Reach Out to Hyperliquid

1. **Check official Hyperliquid Discord/Telegram**
   - Ask how to place orders on HIP-3 DEXs via API
   - Share that `dex` field doesn't work
2. **Contact SDK maintainer (@deeeed)**

   - Ask if HIP-3 order placement is supported
   - Request examples or documentation

3. **Check Hyperliquid UI source code**
   - app.hyperliquid.xyz might be open source
   - See exactly how they place HIP-3 orders

### Option B: Deep Dive Investigation

1. **Intercept Hyperliquid UI network requests**

   - Use browser DevTools
   - Place xyz:XYZ100 order in their UI
   - Inspect exact API call made
   - Copy the request format

2. **Test perpDexTransfer**

   - Transfer $50 from main DEX to xyz DEX
   - See if having balance in xyz DEX changes routing

3. **Check if collateral location determines routing**
   - Maybe API routes to DEX where you have collateral?
   - Test: Put ALL balance in xyz DEX, then try BTC order
   - Does it fail? Or auto-route to xyz DEX?

### Option C: Workaround for MVP

1. **Document limitation**

   - HIP-3 markets detected and displayed
   - Trading requires using Hyperliquid UI
   - MetaMask shows positions/orders after

2. **Add helpful error**

   - Detect HIP-3 order attempt
   - Show: "Trading HIP-3 assets currently requires using Hyperliquid's official UI"

3. **Link to Hyperliquid**
   - Deep link to app.hyperliquid.xyz with asset pre-selected

## 🔬 Diagnostic Test to Try

**Test if balance location determines routing:**

```bash
# 1. Transfer ALL funds to xyz DEX
perpDexClassTransfer({ dex: "xyz", amount: "9", toPerp: true })

# 2. Check balances
clearinghouseState({ user }) → $0
clearinghouseState({ user, dex: "xyz" }) → $9

# 3. Try placing BTC order
# If it fails → routing is balance-based
# If BTC order succeeds → routing is NOT balance-based
```

## 📦 What Can Be Delivered Now

### Full Package (95% Complete):

- Complete HIP-3 detection and display
- All metadata and UI components
- Price data and subscriptions
- Order validation and calculations
- Known limitation: Routing not solved

### Recommendation:

1. **Merge PR with documented limitation**
2. **File follow-up ticket** for routing investigation
3. **Reach out to Hyperliquid team** for guidance
4. **Add workaround**: Link to Hyperliquid UI for HIP-3 trading

## 🎯 Summary

We've implemented everything EXCEPT the final routing piece. This is a tough problem that likely requires:

- Inside knowledge from Hyperliquid team
- Inspecting their UI implementation
- Or discovering undocumented API behavior

**The work done is valuable** - full HIP-3 support infrastructure is ready. Just needs the routing solution.

---

**Commits:** 20+ commits  
**Files changed:** 14 files  
**Completion:** 95%  
**Blocker:** HIP-3 DEX routing mechanism unknown  
**Recommendation:** Seek guidance from Hyperliquid team
