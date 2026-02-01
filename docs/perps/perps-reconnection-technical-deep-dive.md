# Perps Reconnection Incident - Technical Deep Dive

For the high-level postmortem, see [perps-reconnection-incident-postmortem.md](./perps-reconnection-incident-postmortem.md).

---

## Architecture Overview

| Component                      | File                                           | Responsibility                              |
| ------------------------------ | ---------------------------------------------- | ------------------------------------------- |
| HyperLiquidProvider            | `controllers/providers/HyperLiquidProvider.ts` | Trading logic, caching, order placement     |
| HyperLiquidClientService       | `services/HyperLiquidClientService.ts`         | WebSocket connection, reconnection handling |
| HyperLiquidSubscriptionService | `services/HyperLiquidSubscriptionService.ts`   | Price/position subscriptions                |

### Caching Architecture

| Cache             | Location            | Populated By          | Cleared On Disconnect | Cleared On WS Reconnect |
| ----------------- | ------------------- | --------------------- | --------------------- | ----------------------- |
| `cachedMetaByDex` | Provider            | `buildAssetMapping()` | YES                   | NO                      |
| `dexMetaCache`    | SubscriptionService | `setDexMetaCache()`   | NO                    | NO                      |
| `spotMeta`        | **NOT CACHED**      | -                     | -                     | -                       |

---

## Root Cause: `skipCache: true` in Trading Methods

Trading methods forced fresh API calls instead of using cached WebSocket data:

- `updatePositionTPSL()`
- `closePosition()`
- `closePositions()`
- `updateMargin()`

**Fix (PRs #25234, #25438):** Added cache-first helpers and removed `skipCache: true`.

---

## Defensive Improvement: `spotMeta` Caching

HIP-3 orders call `spotMeta()` to check collateral type. This is **not the root cause** but adds an extra API call per HIP-3 order, creating potential for rate limiting.

### Call Flow

```
placeOrder()
  → handleHip3PreOrder()
    → isUsdhCollateralDex()
      → infoClient.spotMeta()  ← Extra API call (not cached)
```

### Recommended Fix

Cache `spotMeta` in `ensureReadyForTrading()`:

1. Add property: `private cachedSpotMeta: SpotMeta | null = null;`

2. In `ensureReadyForTrading()`:

   ```typescript
   if (this.hip3Enabled && !this.cachedSpotMeta) {
     const infoClient = this.clientService.getInfoClient();
     this.cachedSpotMeta = await infoClient.spotMeta();
   }
   ```

3. Update `isUsdhCollateralDex()` to use cache instead of fetching

4. Clear in `disconnect()`: `this.cachedSpotMeta = null;`

---

## Reconnection vs Disconnect Asymmetry

| Aspect            | `disconnect()` | WebSocket Reconnection |
| ----------------- | -------------- | ---------------------- |
| When called       | Account switch | Network drop/restore   |
| `cachedMetaByDex` | CLEARED        | NOT cleared            |
| `cachedSpotMeta`  | Should clear   | NOT cleared            |
| InfoClient        | N/A            | RECREATED              |

WebSocket reconnection leaves Provider caches intact while recreating the underlying clients. This is intentional for stable data like `cachedMetaByDex`.

---

## Sentry Errors: METAMASK-MOBILE-5DKA / METAMASK-MOBILE-5DC2

### Symptom

These errors appear as `undefined` in Sentry with no useful stack trace or context.

### Root Cause

The HyperLiquid SDK (`@nktkas/hyperliquid`) rejects promises with `undefined` when an AbortSignal fires without an explicit reason:

```javascript
// In SDK's websocket/_postRequest.js
if (signal?.aborted) return Promise.reject(signal.reason); // reason is undefined!
```

This happens when:

- Request times out
- WebSocket terminates
- User cancellation without explicit reason

Our `ensureError()` utility converts `undefined` to `Error("undefined")`, losing all context.

### Relationship to Incident

These errors are a **symptom** of rate limiting, not a separate bug. When rate limits are hit, WebSocket requests fail and the SDK rejects with undefined.

### Optional Improvement

Update `app/util/errorUtils.ts` to provide better messaging:

```typescript
export function ensureError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (error === undefined || error === null) {
    return new Error('Unknown error (no details provided)');
  }
  return new Error(String(error));
}
```

---

## Testing

### Network Recovery Test

1. Open perps, open/close SILVER position (success)
2. Toggle airplane mode on, put app in background ~20 sec
3. Open app, toggle airplane mode off
4. Try SILVER position - **should succeed with fix**

### Verification

- [ ] HIP-3 orders work after network recovery
- [ ] Crypto orders work after network recovery
- [ ] No 429 errors in logs during rapid trading

---

## Lessons Learned

1. **Prefer aggressive caching** - The original tradeoff was to fetch fresh data before orders to ensure accuracy, but rate limits make aggressive caching the better approach. Trust cached WebSocket data for trading operations.
2. **Test network recovery** - Airplane mode → background → restore is a critical test path
3. **WebSocket debugging needs tooling** - Standard React Native debugging (Metro/Hermes) doesn't show WebSocket traffic. Use MITM proxy interception or in-app debug logging.
4. **Understand cache lifecycle** - Know which caches are cleared on disconnect vs WebSocket reconnection
