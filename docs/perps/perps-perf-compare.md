# Perps Performance Comparison

Measured load-time comparison between `main` and `feat/perps/perps-init-cache` branches.

## Summary

| Scenario               | `main`                             | `feat/perps/perps-init-cache`                                   |
| ---------------------- | ---------------------------------- | --------------------------------------------------------------- |
| Cold-start — Tab View  | ~2s+ (blocked on WS)               | **Immediate** (cache-seeded, endConditions: 3)                  |
| Cold-start — Home View | ~2s+ (blocked on WS)               | **Immediate** (cache-seeded, endConditions: 1)                  |
| Hot-start — Tab View   | N/A — tab stays mounted            | **Instant** (tab stays mounted, WS kept alive via grace period) |
| Hot-start — Home View  | Fast if WS alive, ~2s if reconnect | **Immediate** (cache valid at ~140s age)                        |

> On `main`, traces don't complete until WS data arrives (~2s). On the cache branch, cached data satisfies end conditions before the WS even connects.
>
> **Note:** The Perps tab stays mounted across navigations (never unmounts/remounts), so there is no hot-start remount scenario. The WS grace period keeps the connection alive; it is cancelled on re-navigation.

## WS pipeline timing (cache branch, cold-start, iPhone 16 Pro Simulator)

| Stage                  | Without HIP-3 | HIP-3 Run 1 | HIP-3 Run 2 |
| ---------------------- | ------------- | ----------- | ----------- |
| Connection established | ~1724ms       | ~1777ms     | ~1752ms     |
| Connection + preload   | ~1829ms       | ~1888ms     | ~1858ms     |
| First position data    | ~1948ms       | ~1924ms     | ~2506ms     |
| First order data       | ~1948ms       | ~1924ms     | ~2506ms     |
| First account data     | ~1950ms       | ~1932ms     | ~2508ms     |

These durations are from the WS connection request. On the cache branch, UI renders before any of these complete.

> **HIP-3 config:** 2 DEXs (main + xyz), 274 total markets (229 main + 45 xyz). Run 2 shows ~580ms higher latency for position/order/account data compared to Run 1. Logs show "Waiting for DEX discovery before creating subscriptions" and "Waiting for all DEXs to send initial data" — the DEX discovery + subscription setup phase introduces variance. Connection establishment remains consistent across runs (~1724–1777ms).

## HIP-3 DEX overhead on position fetching

`queryUserDataAcrossDexs()` in `HyperLiquidProvider.ts:2022-2042` fires N parallel API calls where N = number of enabled DEXs.

| DEX configuration        | API calls per operation | First position data | Overhead vs baseline                                     |
| ------------------------ | ----------------------- | ------------------- | -------------------------------------------------------- |
| Main DEX only (default)  | 1                       | ~1948ms             | Baseline                                                 |
| Main + 1 HIP-3 DEX (xyz) | 2 (parallel)            | ~1924–2506ms        | **Variable** (0–560ms, depends on DEX subscription init) |
| Main + 2 HIP-3 DEXs      | 3 (parallel)            | TBD                 | TBD                                                      |

Calls are parallelized via `Promise.all`, so latency = max(individual calls) rather than sum.

> **Measured (2 runs):** With main + xyz (274 total markets: 229 main + 45 xyz), first position data arrived at ~1924ms (Run 1) and ~2506ms (Run 2) vs ~1948ms baseline. Overhead is variable — Run 1 shows no penalty while Run 2 adds ~560ms, attributed to DEX discovery and subscription initialization timing.

## Hot-start timing (cache branch, Home View, iPhone 16 Pro Simulator)

| Metric                     | Value                             |
| -------------------------- | --------------------------------- |
| Market List View completed | **Immediate** (endConditions: 1)  |
| Data source                | Cache (`timeToDataMs: 0`)         |
| Cache age                  | ~137s (valid for ~163s remaining) |
| WS state                   | Already connected (refCount: 2)   |
| Market count               | 274 (HIP-3: main + xyz)           |

No WS reconnection needed — the connection manager keeps it alive via the grace period from the previous Tab View navigation.

## WS pipeline timing (cache branch, cold-start Home View, iPhone 16 Pro Simulator)

| Stage                  | HIP-3 Run 1 (main + xyz) | HIP-3 Run 2 (main + xyz) |
| ---------------------- | ------------------------ | ------------------------ |
| Connection established | ~1992ms                  | ~1942ms                  |
| Connection + preload   | ~2249ms                  | ~2177ms                  |
| First position data    | ~2788ms                  | ~2749ms                  |
| First order data       | ~2788ms                  | ~2750ms                  |
| First account data     | ~2917ms                  | ~2752ms                  |

Cache source: controller-preloaded data (`cacheAgeMs: ~12468`, not persisted cache). UI renders immediately; WS data arrives ~2–3s later as a live refresh.

## Known issues (fixed)

### ~~Unmemoized selector in `useWithdrawalRequests`~~ (fixed)

The `useWithdrawalRequests` hook previously used an inline `.filter()` selector that created a new array reference on every Redux state change, triggering "Selector returned different result" warnings.

**Fix:** Replaced with the memoized `selectWithdrawalRequestsBySelectedAccount` selector from `app/selectors/perps/withdrawalRequests.ts`, which uses `createDeepEqualSelector` and a stable `EMPTY_WITHDRAWAL_REQUESTS` constant.

### ~~CLIENT_NOT_INITIALIZED in `fetchCompletedWithdrawals`~~ (fixed)

The `useWithdrawalRequests` hook's `fetchCompletedWithdrawals()` called `getActiveProvider()` which throws `CLIENT_NOT_INITIALIZED` when `PerpsController.init()` hasn't completed yet. On cold-start Home View, the hook mounts before initialization finishes.

**Fix:** Replaced with `getActiveProviderOrNull()` which returns `null` instead of throwing. The hook silently returns when the provider isn't ready and re-fetches on the next poll cycle or re-render.

### ~~CLIENT_NOT_INITIALIZED in subscribe methods~~ (fixed)

All 8 `subscribeTo*()` methods in `PerpsController` used `getActiveProvider()` which throws `CLIENT_NOT_INITIALIZED` before `init()` completes. During cold-start, `PriceStreamChannel.prewarm()` calls `subscribeToPrices()` before the controller is ready, producing noisy `[Error: CLIENT_NOT_INITIALIZED]` warnings in DEV logs.

**Fix:** All 8 subscribe methods now use `getActiveProviderOrNull()` with an early return of a no-op unsubscribe function when the provider is null. The try/catch around the actual `provider.subscribeTo*()` call is preserved for real provider errors (network failures, etc.). Callers already handle the no-op case — subscriptions are re-attempted after connection is established.

### ~~Repeated "state persisted successfully" log noise~~ (fixed)

`createPersistController()` in `app/store/persistConfig/index.ts` logged `Logger.log(\`${controllerName} state persisted successfully\`)` on every debounced (200ms) state persistence. During WS subscription setup, PerpsController state changes rapidly, producing ~10+ persistence logs in quick succession.

**Fix:** Removed the success log line. Error logging is preserved — only failures are reported. Persistence is a routine background operation that doesn't need success logging.

## How to measure

Filter for performance markers in device logs:

```bash
# Android
adb logcat -s ReactNativeJS:D | grep PERPSMARK_SENTRY

# iOS (Metro)
yarn start | grep PERPSMARK
```

Key markers to grep:

- `PERPSMARK_SENTRY PerpsScreen:` — screen trace completion (end-to-end)
- `PERPSMARK_SENTRY_WS PerpsConn:` — WS connection timing
- `PERPSMARK_SENTRY_WS PerpsWS:` — first subscription data timing
- `cacheHit` / `source` — whether data came from cache or network
