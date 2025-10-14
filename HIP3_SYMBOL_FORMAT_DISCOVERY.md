# 🎯 HIP-3 Symbol Format Discovery - ROOT CAUSE FOUND!

## The Discovery

**HIP-3 asset names include the DEX prefix!**

```json
{
  "universe": [
    {
      "name": "xyz:XYZ100",  ← DEX prefix included!
      "szDecimals": 4,
      "maxLeverage": 20
    }
  ]
}
```

## Why Everything Failed

### What We Were Doing ❌

```typescript
// User clicks on market list item showing "xyz:XYZ100"
// We navigate with: asset = "xyz:XYZ100"

// Then in placeOrder:
findAssetInfo("xyz:XYZ100") {
  // Searches for "xyz:XYZ100" in main DEX ❌
  // Main DEX has: "BTC", "ETH", "SOL"...
  // Not found!

  // Searches in HIP-3 DEXs ❌
  // Calls meta({ dex: "xyz" })
  // Gets: { name: "xyz:XYZ100" }
  // Compares "xyz:XYZ100" === "xyz:XYZ100" ✅
  // BUT we also search other DEXs unnecessarily
}

// Asset mapping:
coinToAssetId.set("xyz:XYZ100", 0);  // Correct!
coinToAssetId.get("xyz:XYZ100");     // Returns 0 ✅

// Problem: Symbol is CORRECT but routing is WRONG
```

### The Real Problem

**Asset ID 0 is ambiguous:**

- Main DEX: BTC = asset 0
- xyz DEX: xyz:XYZ100 = asset 0

When we send `{ a: 0 }` without specifying DEX, it goes to main DEX!

## 💡 The Solution

### Option 1: Parse DEX from Symbol

```typescript
function parseDexSymbol(fullSymbol: string): {
  dexName: string | null;
  symbol: string;
} {
  const parts = fullSymbol.split(':');
  if (parts.length === 2) {
    return { dexName: parts[0], symbol: parts[1] };
  }
  return { dexName: null, symbol: fullSymbol };
}

// Usage:
const { dexName, symbol } = parseDexSymbol('xyz:XYZ100');
// dexName = "xyz"
// symbol = "XYZ100"
```

### Option 2: Globally Unique Asset IDs

**Key insight:** Maybe asset IDs SHOULD be globally unique across all DEXs!

Instead of:

```typescript
// Bad: Each DEX uses 0, 1, 2...
mainDex: BTC=0, ETH=1
xyzDex: XYZ100=0  ← Collision!
```

We should:

```typescript
// Good: Offset IDs for each DEX
mainDex: BTC=0, ETH=1, SOL=2 (46 assets = 0-45)
xyzDex: XYZ100=1000 (offset by 1000 or use unique range)
```

### Option 3: Store DEX Context in Asset Mapping

```typescript
private assetInfo = new Map<string, {
  id: number;
  dexName: string | null;
  szDecimals: number;
}>();

assetInfo.set("xyz:XYZ100", {
  id: 0,
  dexName: "xyz",
  szDecimals: 4
});

// When placing order:
const info = assetInfo.get(fullSymbol);
if (info.dexName) {
  // Use special routing for HIP-3
}
```

## 🚀 Implementation Plan

1. **Keep symbols as-is** - `"xyz:XYZ100"` is correct format
2. **Parse DEX from symbol** when needed
3. **Use DEX context** for API calls that support it
4. **Figure out** how to route orders correctly (still unknown!)

## 🔍 Still Unknown

**How does the order API know which DEX to use?**

Possibilities:

1. Asset IDs are globally unique (need to check real API responses)
2. There's a hidden `dex` field in the order structure
3. Routing is based on asset name prefix (`xyz:` → xyz DEX)
4. Need to call different endpoint for HIP-3 orders

## 📋 Next Steps

1. Check if real API asset IDs are unique across DEXs
2. Test if using full symbol `"xyz:XYZ100"` in order works
3. Research Hyperliquid Discord/docs for HIP-3 examples
4. Try calling order with different parameters

The symbol format mystery is solved, but DEX routing remains! 🔍
