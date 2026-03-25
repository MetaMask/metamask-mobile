# Proposal 001: Disk-Backed Cold-Start Cache

**Status**: Draft
**Depends on**: Nothing (standalone)
**Enables**: Proposal 002 — Remove REST Preload Timer (see [architecture doc, section 2](./docs/perps/perps-caching-architecture.md#2-remove-rest-preload-timer-simplification))
**Related**: Proposal 003 — Dual-Cache Unification (see [architecture doc, section 3](./docs/perps/perps-caching-architecture.md#3-dual-cache-unification-in-provider-bug-prevention)) — should land first or concurrently (see [Interaction with Proposal 003](#interaction-with-proposal-003))

## Required Reading

- [Perps Caching Architecture](./docs/perps/perps-caching-architecture.md) — overview of the 3-tier cache system, cache clearing matrix, and the legacy REST preload layer this proposal replaces
- [P1 Postmortem: HIP-3 Asset ID Cache Poisoning](https://github.com/MetaMask/metamask-mobile/pull/27854) — dual-cache desync bug that motivates the "don't persist corrupted data" guard in this proposal

---

## Problem

On cold start, there's a 1-3 second gap between app launch and first WebSocket data. During this gap, the UI either shows loading skeletons or stale REST preload data (fetched via a 5-min polling timer). The REST preload exists specifically to fill this gap, but it's heavyweight infrastructure for what amounts to "show last-known data instantly."

## Proposal

Write stream channel snapshots to MMKV after first WS data arrives. Read from MMKV on next cold start. This gives instant display of last-known data with zero network calls.

## Detailed Design

### MMKV Keys

| Key                          | Contents                                                                                                                              | Written when                 | Read when                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------- |
| `PERPS_DISK_CACHE_MARKETS`   | `{ data: PerpsMarketData[], timestamp: number, providerNetwork: string }`                                                             | First WS market data arrives | Controller constructor / `getCachedMarketDataForActiveProvider()` |
| `PERPS_DISK_CACHE_USER_DATA` | `{ positions: Position[], orders: Order[], accountState: AccountState, timestamp: number, address: string, providerNetwork: string }` | First WS user data arrives   | Controller constructor / `getCachedUserDataForActiveProvider()`   |

Values are JSON-stringified. MMKV writes are synchronous under the hood (despite `StorageWrapper.setItem` being async), so fire-and-forget is safe.

### Write Path: Stream Channels -> MMKV

**Where**: `PerpsStreamManager.tsx` — in each channel's data handler, after the first successful WS message populates the in-memory cache.

**File**: `app/components/UI/Perps/providers/PerpsStreamManager.tsx`

Add a new private method to `PerpsStreamManager`:

```typescript
/**
 * Persist stream channel snapshot to MMKV for cold-start hydration.
 * Fire-and-forget — MMKV writes are sync under the hood.
 */
private persistMarketDataToDisk(): void {
  const markets = this.marketData.getCachedData();
  if (!markets?.length) return;

  const providerNetwork = this.getProviderNetworkKey();
  StorageWrapper.setItem(
    PERPS_DISK_CACHE_MARKETS,
    JSON.stringify({ data: markets, timestamp: Date.now(), providerNetwork }),
  );
}

private persistUserDataToDisk(): void {
  const positions = this.positions.getCachedData();
  const orders = this.orders.getCachedData();
  const accountState = this.account.getCachedData();
  if (!positions && !orders && !accountState) return;

  const { address, providerNetwork } = this.getUserCacheContext();
  StorageWrapper.setItem(
    PERPS_DISK_CACHE_USER_DATA,
    JSON.stringify({
      positions: positions ?? [],
      orders: orders ?? [],
      accountState: accountState ?? null,
      timestamp: Date.now(),
      address,
      providerNetwork,
    }),
  );
}
```

**Trigger**: Call `persistMarketDataToDisk()` after `MarketDataStreamChannel` receives its first WS message (inside the channel's `handleMessage` or after `preloadSubscriptions()` completes). Same pattern for user data channels. Only write once per session — gate with a `#diskCacheDirty` flag to avoid writing on every WS tick.

**Throttle**: Write at most once per 30 seconds. Market data changes rarely; user data changes on trades (which are infrequent enough that 30s throttle is fine).

### Read Path: MMKV -> Controller State

**Where**: `PerpsController.ts` — in `startMarketDataPreload()` (line ~2633), before the first REST fetch.

**File**: `app/controllers/perps/PerpsController.ts`

Add a new private method:

```typescript
async #hydrateCacheFromDisk(): Promise<void> {
  try {
    const [rawMarkets, rawUser] = await Promise.all([
      StorageWrapper.getItem(PERPS_DISK_CACHE_MARKETS),
      StorageWrapper.getItem(PERPS_DISK_CACHE_USER_DATA),
    ]);

    if (rawMarkets) {
      const parsed = JSON.parse(rawMarkets);
      const key = parsed.providerNetwork; // e.g. "hyperliquid:mainnet"
      const existing = this.state.cachedMarketDataByProvider[key];
      // Only hydrate if no fresher in-memory data exists
      if (!existing || existing.timestamp < parsed.timestamp) {
        this.update((state) => {
          state.cachedMarketDataByProvider[key] = {
            data: parsed.data,
            timestamp: parsed.timestamp,
          };
        });
      }
    }

    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      const key = parsed.providerNetwork;
      const existing = this.state.cachedUserDataByProvider[key];
      // Only hydrate if no fresher data and address matches current user
      const currentAddress = this.#getCurrentUserAddress();
      if (
        parsed.address === currentAddress &&
        (!existing || existing.timestamp < parsed.timestamp)
      ) {
        this.update((state) => {
          state.cachedUserDataByProvider[key] = {
            positions: parsed.positions,
            orders: parsed.orders,
            accountState: parsed.accountState,
            timestamp: parsed.timestamp,
            address: parsed.address,
          };
        });
      }
    }
  } catch {
    // Corrupt MMKV data — silently ignore, REST preload will fill in
  }
}
```

**Call site**: First line of `startMarketDataPreload()` (line ~2633):

```typescript
async startMarketDataPreload(): Promise<void> {
  await this.#hydrateCacheFromDisk(); // <-- NEW
  // ... existing preload logic continues
}
```

This means the controller state is populated from disk _before_ the first REST fetch fires, so `getPreloadedData()` in UI hooks will return disk-cached data immediately.

### Invalidation

| Event                   | Action                              | Why                                                        |
| ----------------------- | ----------------------------------- | ---------------------------------------------------------- |
| Account switch          | Delete `PERPS_DISK_CACHE_USER_DATA` | User data is account-specific                              |
| Provider/network switch | Delete both keys                    | Data is provider+network scoped                            |
| App foreground          | No action                           | Stale disk data is acceptable — WS overlays within seconds |
| Logout / wallet reset   | Delete both keys                    | Clean slate                                                |

**Where to add invalidation**:

- **Account switch**: `PerpsController.ts` — in the existing account-change handler that clears `cachedUserDataByProvider` (around line ~2915 area where user data preload runs). Add `StorageWrapper.removeItem(PERPS_DISK_CACHE_USER_DATA)`.
- **Provider/network switch**: Same controller section that handles provider changes. Add removal of both keys.
- **Logout**: `app/core/Engine/Engine.ts` or wherever wallet reset clears perps state.

### Constants

**File**: `app/controllers/perps/constants/perpsConfig.ts` (or new file `app/controllers/perps/constants/diskCache.ts`)

```typescript
export const PERPS_DISK_CACHE_MARKETS = 'PERPS_DISK_CACHE_MARKETS';
export const PERPS_DISK_CACHE_USER_DATA = 'PERPS_DISK_CACHE_USER_DATA';
export const PERPS_DISK_CACHE_THROTTLE_MS = 30_000;
```

### Import

```typescript
import StorageWrapper from '../../store/storage-wrapper';
// Adjust relative path based on file location
```

`StorageWrapper` is already used in 91+ files — no new dependency.

## Files to Modify

| File                                                         | Change                                                                                                                    | Lines (approx)                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `app/controllers/perps/constants/perpsConfig.ts`             | Add 3 constants                                                                                                           | New lines                            |
| `app/controllers/perps/PerpsController.ts`                   | Add `#hydrateCacheFromDisk()`, call from `startMarketDataPreload()`, add invalidation in account/provider change handlers | ~2633, ~2915                         |
| `app/components/UI/Perps/providers/PerpsStreamManager.tsx`   | Add `persistMarketDataToDisk()`, `persistUserDataToDisk()`, throttled write triggers                                      | After lines ~1505, ~797, ~665, ~1065 |
| `app/components/UI/Perps/services/PerpsConnectionManager.ts` | Add disk cache invalidation on account/provider switch alongside existing `clearCache()` calls                            | ~165                                 |

## Edge Cases

| Scenario                                  | Behavior                                                                        | Risk                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Corrupt MMKV JSON                         | `JSON.parse` fails -> caught -> REST preload fills in normally                  | None — graceful degradation                            |
| Disk data from different account          | Address check in `#hydrateCacheFromDisk()` rejects it                           | None                                                   |
| Disk data from different provider/network | `providerNetwork` key mismatch -> doesn't overwrite current                     | None                                                   |
| Very stale disk data (days old)           | Displayed briefly (1-2s) then overwritten by WS                                 | Acceptable — user sees "last known" prices, not blank  |
| Concurrent write + read on startup        | MMKV is thread-safe. Write is fire-and-forget, read happens once in constructor | None                                                   |
| Multiple accounts used sequentially       | Each account switch deletes user data key; only last account's data persists    | Acceptable — cold start shows last-used account's data |
| MMKV storage quota                        | Two JSON blobs ~50-200KB each. MMKV handles GBs.                                | None                                                   |

## Benchmark Results

Measured using `benchmark-cold-start-cache.json` recipe — simulates real user flow: navigate away, disconnect all WS channels (long backgrounding), clear all caches, then navigate back to Perps. No artificial controller manipulation (stop/startPreload, timestamp aging).

### Android (Pixel 6a, API 36)

| Metric             | Baseline (no cache) | Disk Cache (MMKV) |
| ------------------ | ------------------- | ----------------- |
| Cache hit on mount | `false`             | `true`            |
| Time to first data | **1048ms**          | **0ms** (instant) |
| MMKV hydration     | n/a                 | **65ms**          |
| Markets loaded     | 283                 | 283               |

### iOS (Simulator, mm-3, iOS 26.3)

| Metric             | Baseline (no cache) | Disk Cache (MMKV) |
| ------------------ | ------------------- | ----------------- |
| Cache hit on mount | `false`             | `true`            |
| Time to first data | **441ms**           | **0ms** (instant) |
| MMKV hydration     | n/a                 | **45ms**          |
| Markets loaded     | 283                 | 283               |

### Summary

Baseline shows a blank gap waiting for WS/REST (~1s Android, ~0.4s iOS simulator). With disk cache, structural data (283 markets) renders on first frame — prices show `$---` placeholder until WS delivers real prices (~2-3s after mount).

Videos: `.agent/videos/benchmark-cold-start-android.mp4`, `.agent/videos/benchmark-cold-start-ios.mp4`

## Acceptance Criteria

1. **Cold start with disk cache**: Kill app -> relaunch -> market data and positions render before WS connects (no loading skeleton)
2. **Account switch clears user data**: Switch accounts -> kill app -> relaunch -> no stale positions from previous account
3. **WS overlay**: After disk cache renders, WS data arrives and replaces it within 1-3s
4. **Fallback**: Delete MMKV keys manually -> cold start still works via REST preload (existing behavior)
5. **No regression**: All existing stream/preload tests pass

## Validation Recipe

```json
{
  "title": "Verify disk-backed cold-start cache",
  "initial_conditions": { "testnet": true },
  "steps": [
    {
      "id": "open_pos",
      "action": "flow_ref",
      "ref": "trade-open-market",
      "params": { "symbol": "BTC", "side": "long", "usdAmount": "11" }
    },
    {
      "id": "wait_fill",
      "action": "wait_for",
      "ref": "positions",
      "assert": { "operator": "length_gt", "field": "positions", "value": 0 },
      "timeout": 60000
    },
    {
      "id": "verify_disk_write",
      "action": "eval_async",
      "expression": "var SW = require('./app/store/storage-wrapper').default.getInstance(); SW.getItem('PERPS_DISK_CACHE_USER_DATA').then(function(r) { return r ? 'written' : 'empty' })",
      "assert": { "operator": "eq", "value": "written" }
    },
    {
      "id": "verify_market_write",
      "action": "eval_async",
      "expression": "var SW = require('./app/store/storage-wrapper').default.getInstance(); SW.getItem('PERPS_DISK_CACHE_MARKETS').then(function(r) { return r ? 'written' : 'empty' })",
      "assert": { "operator": "eq", "value": "written" }
    },
    {
      "id": "cleanup",
      "action": "flow_ref",
      "ref": "trade-close-position",
      "params": { "symbol": "BTC" }
    }
  ]
}
```

Full cold-start validation requires app kill + relaunch — mark as `manual` step or test via simulated controller constructor call.

## Interaction with Proposal 003

Proposal 003 (Dual-Cache Unification — see [architecture doc](./docs/perps/perps-caching-architecture.md#3-dual-cache-unification-in-provider-bug-prevention)) replaces the desync-prone `#cachedValidatedDexs` + `#cachedAllPerpDexs` pair with a single `#dexDiscoveryState` object. This matters for disk caching because:

1. **Market data includes DEX-derived asset mappings.** If the dual-cache desync bug (see [postmortem](https://github.com/MetaMask/metamask-mobile/pull/27854)) recurs, the corrupted market data could be written to MMKV and survive app restarts — turning a session bug into a persistent one.

2. **Guard**: The `persistMarketDataToDisk()` write path snapshots from the stream channel, which gets its data from WS (not from the provider's in-memory DEX caches). This means the disk snapshot reflects what the server sent, not the provider's computed state. The desync bug would cause _missing_ markets in the snapshot (HIP-3 markets not mapped → not in market data), not _wrong_ data. On next cold start, the user would see fewer markets until WS overlays — degraded but not dangerous.

3. **Recommendation**: Land proposal 003 first or concurrently. Once the dual-cache is unified, the risk of writing corrupted DEX state to disk drops to zero. If proposal 003 is delayed, this proposal is still safe to ship — the guard above limits blast radius to "missing HIP-3 markets on cold start for 1-2 seconds."

## Rollback Plan

- Delete the MMKV write/read code. The REST preload continues to work exactly as before.
- No feature flag needed — the disk cache is a transparent optimization layer. If it's absent, the existing fallback chain (`stream channel -> controller REST cache -> null`) is unchanged.
- MMKV keys left behind are harmless — they'll never be read again.

## What This Enables

Once disk cache is in place, Proposal 002 (see [architecture doc](./docs/perps/perps-caching-architecture.md#2-remove-rest-preload-timer-simplification)) can remove the 5-min REST polling interval. The cold-start gap that justified the REST preload is now filled by MMKV reads (~1ms) instead of REST fetches (~500ms).
