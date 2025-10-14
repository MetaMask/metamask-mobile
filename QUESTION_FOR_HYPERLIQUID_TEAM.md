# Question for Hyperliquid Team / SDK Maintainer

## Context

Implementing HIP-3 (builder-deployed perpetuals) support in MetaMask Mobile. Successfully implemented detection, display, and data fetching for HIP-3 markets, but **cannot route orders correctly**.

## The Problem

When placing an order for HIP-3 asset `xyz:XYZ100` (asset ID 0 in xyz DEX):

- Order is placed with `assetId = 0`
- Order routes to **main DEX** asset 0 (BTC)
- Should route to **xyz DEX** asset 0 (xyz:XYZ100)

## What We Know

### Asset IDs are DEX-Specific

```
Main DEX: BTC=0, ETH=1, SOL=2, ..., MET=216
xyz DEX: xyz:XYZ100=0
```

### Data Fetching Works (with dex parameter)

```javascript
// ✅ These work:
infoClient.meta({ dex: 'xyz' });
infoClient.allMids({ dex: 'xyz' });
infoClient.frontendOpenOrders({ user, dex: 'xyz' });
subscriptionClient.allMids({ dex: 'xyz' }, callback);
```

### Order Placement Doesn't Work

```javascript
// ❌ This routes to main DEX, not xyz DEX:
exchangeClient.order({
  orders: [{ a: 0, b: true, p: "25000", s: "0.001", r: false, t: {...} }],
  grouping: "na",
  builder: { b: "0x...", f: 100 }
})
```

## What We've Tried

### ❌ Attempt 1: vaultAddress Parameter

```javascript
exchangeClient.order({
  ...,
  vaultAddress: deployerAddress  // xyz DEX deployer
})
```

**Result:** `Vault not registered: 0x88806...` error

### ❌ Attempt 2: dex Field in Order Params

```javascript
exchangeClient.order({
  orders: [...],
  grouping: "na",
  builder: {...},
  dex: "xyz"  // Added this
})
```

**Result:** Still routes to main DEX (BTC order created)

### ❌ Attempt 3: Modified SDK ActionSorter

Patched `@deeeed/hyperliquid-node20/esm/src/signing/_sorter.js` to include `dex` field (like `perpDexClassTransfer` does).

**Result:** Still routes to main DEX

## The Question

**How do you programmatically place orders on HIP-3 DEXs via the API?**

Specifically:

1. How do you specify which HIP-3 DEX to route an order to?
2. Do you need separate ExchangeClient instances per DEX?
3. Is there a different API endpoint for HIP-3 orders?
4. Does routing depend on having collateral in the target DEX?
5. Is there undocumented API functionality for HIP-3?

## Observations

- Hyperliquid's official UI handles this seamlessly
- No visible collateral transfer transactions
- Funds automatically available across DEXs
- Works with same wallet/account

## Test Case

**Working:** Place order for BTC (main DEX asset 0) → Creates BTC order ✅  
**Failing:** Place order for xyz:XYZ100 (xyz DEX asset 0) → Creates BTC order ❌

## SDK Version

`@deeeed/hyperliquid-node20` v1.0.0

## Request

Please provide:

1. Example code for placing HIP-3 orders
2. Documentation on DEX routing mechanism
3. Any missing parameters or configuration needed

Thank you!
