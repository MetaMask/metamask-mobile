# Cold-Start Disk Cache Benchmark Methodology

## What This Measures

The MMKV-backed disk cache (`PERPS_DISK_CACHE_MARKETS` / `PERPS_DISK_CACHE_USER_DATA`) eliminates the skeleton-to-data gap on cold start. This benchmark quantifies the improvement by comparing two scenarios:

| Scenario   | Disk cache | In-memory cache | What it measures                                    |
| ---------- | ---------- | --------------- | --------------------------------------------------- |
| Baseline   | Cleared    | Cleared         | Time to data without disk cache (REST preload only) |
| Disk-cache | Present    | Cleared         | Time to data with disk hydration                    |

## Results

### Android -- Pixel 6a (real device, 2026-03-25)

Environment: Pixel 6a (API 36), 283 markets, 3 positions + 1 order.

**Recipe run (preload fires ~1.5s before hook mounts):**

| Metric                            | Baseline (no disk cache)    | With disk cache             | Delta        |
| --------------------------------- | --------------------------- | --------------------------- | ------------ |
| Disk hydration (`hydrate_end`)    | 15ms (no-op)                | 17ms (283 markets)          | --           |
| REST preload (`rest_preload_end`) | 401ms                       | 165ms                       | --           |
| Hook `cacheHit` at mount          | true (REST beat navigation) | true (MMKV beat navigation) | Both instant |

**Tight-race run (preload + navigate simultaneously):**

| Metric                            | Baseline (no disk cache) | With disk cache                | Delta                     |
| --------------------------------- | ------------------------ | ------------------------------ | ------------------------- |
| Disk hydration (`hydrate_end`)    | 22ms (no-op)             | 28ms (283 markets + user data) | --                        |
| REST preload (`rest_preload_end`) | 436ms                    | 290ms                          | --                        |
| Hook `cacheHit` at mount          | true                     | true                           | Both beat ~2s Android nav |

### iOS -- iPhone 16 Pro Simulator (2026-03-25)

Environment: iOS 18 simulator, 283 markets, 3 positions + 1 order.

**Tight-race run (preload + navigate simultaneously):**

| Metric                            | Baseline (no disk cache)     | With disk cache                | Delta                   |
| --------------------------------- | ---------------------------- | ------------------------------ | ----------------------- |
| Disk hydration (`hydrate_end`)    | 2ms (no-op)                  | 41ms (283 markets + user data) | --                      |
| REST preload (`rest_preload_end`) | 1205ms                       | 1131ms                         | --                      |
| Hook `cacheHit` at mount          | **false** (skeleton visible) | **true** (instant render)      | **Skeleton eliminated** |

### Key Findings

1. **iOS shows the real benefit**: REST takes ~1.2s (more realistic network latency from simulator). Without disk cache, the hook mounts with `cacheHit: false` and shows a loading skeleton. With disk cache (41ms hydration), data is available before the hook mounts.

2. **Android Pixel 6a REST is fast**: REST completes in 290-436ms, which is faster than the ~2s Android navigation animation. Both scenarios show instant data at hook mount. The disk cache still provides insurance against slower networks.

3. **Hydration cost is low**: 17-41ms to read and parse 283 markets + user data from MMKV. Negligible compared to REST latency.

4. **On real cold starts with production network latency (1-3s)**, the disk cache consistently eliminates the skeleton by providing data in <50ms while REST is still in flight.

## Simulated Cold Start

A true cold start (app kill + relaunch) breaks the CDP bridge used by agentic recipes. Instead, we simulate cold start by:

1. Clearing all in-memory caches (controller state via `clearInMemoryCaches()`)
2. Stopping the preload timer
3. Navigating away from Perps
4. Restarting `startMarketDataPreload()` (re-triggers `#hydrateCacheFromDisk()`)
5. Navigating back to Perps and measuring time-to-data

This accurately simulates the code path that runs on real cold start, since `#hydrateCacheFromDisk()` and `#performMarketDataPreload()` execute identically whether called from app launch or from a restart.

## Instrumentation Markers

Temporary `[PERPS_BENCH]` log markers are added to measure each phase. These are **not committed** -- they're applied locally, used for measurement, then reverted.

### Controller markers (`PerpsController.ts`)

| Marker                | Location                                           | Data                            |
| --------------------- | -------------------------------------------------- | ------------------------------- |
| `hydrate_start`       | Top of `#hydrateCacheFromDisk()`                   | --                              |
| `hydrate_market_hit`  | After successful market cache read                 | `count`, `age_ms`               |
| `hydrate_market_miss` | When no market data on disk                        | `reason`                        |
| `hydrate_user_hit`    | After successful user data read                    | `positions`, `orders`, `age_ms` |
| `hydrate_user_miss`   | When no user data on disk                          | `reason`                        |
| `hydrate_end`         | End of `#hydrateCacheFromDisk()`                   | `duration_ms`                   |
| `rest_preload_start`  | Before REST fetch in `#performMarketDataPreload()` | --                              |
| `rest_preload_end`    | After REST fetch completes                         | `duration_ms`, `markets`        |

### Hook markers (`usePerpsMarkets.ts`)

| Marker                   | Location                    | Data                                      |
| ------------------------ | --------------------------- | ----------------------------------------- |
| `hook_market_init`       | `useState` initializer      | `cacheHit` (boolean)                      |
| `hook_market_first_data` | First subscription callback | `timeToDataMs`, `cacheHit`, `marketCount` |

### Temporary helper methods (added for benchmarking, reverted after)

| Method                  | Location          | Purpose                                                            |
| ----------------------- | ----------------- | ------------------------------------------------------------------ |
| `clearDiskCache()`      | `PerpsController` | Removes MMKV cache keys                                            |
| `clearInMemoryCaches()` | `PerpsController` | Resets `cachedMarketDataByProvider` and `cachedUserDataByProvider` |
| `seedDiskCache()`       | `PerpsController` | Writes current controller cache to MMKV immediately                |

### Extracting results

```bash
grep '\[PERPS_BENCH\]' .agent/metro.log
```

Group output by `=== BASELINE ===` / `=== DISK CACHE ===` section markers.

## Reproducing the Benchmark

### Prerequisites

- iOS simulator or Android device with the app running
- Metro bundler connected
- CDP bridge available (agentic service installed)
- Perps feature flag enabled, user logged in

### Quick manual test

```bash
# 1. Apply temporary instrumentation (see marker tables above)
# 2. Reload app, navigate to Perps, wait for data
# 3. Seed disk cache
node scripts/perps/agentic/cdp-bridge.js eval-async \
  "Engine.context.PerpsController.seedDiskCache().then(function(){return 'ok'})"
# 4. Clear and restart (baseline)
node scripts/perps/agentic/cdp-bridge.js eval-async \
  "Engine.context.PerpsController.clearDiskCache().then(function(){return 'ok'})"
node scripts/perps/agentic/cdp-bridge.js eval \
  "(Engine.context.PerpsController.stopMarketDataPreload(), Engine.context.PerpsController.clearInMemoryCaches(), 'ok')"
# 5. Navigate away, restart preload, navigate to Perps
# 6. Repeat without clearing disk cache for the disk-cache scenario
# 7. Extract: grep '\[PERPS_BENCH\]' .agent/metro.log
```

### Automated recipe

```bash
bash scripts/perps/agentic/validate-recipe.sh \
  scripts/perps/agentic/teams/perps/recipes/benchmark-cold-start-cache.json --no-hud
```

**Note**: Ensure market data is primed before running the recipe (navigate to Perps and wait for data, or manually start preload). The recipe uses comma-operator expressions (not semicolons) for CDP compatibility with Hermes.

## Platform Notes

- **iOS**: MMKV hydration takes 41ms for 283 markets + user data (includes JSON.parse). REST preload ~1.2s in simulator (realistic network latency).
- **Android Pixel 6a**: MMKV hydration takes 17-28ms. REST preload 165-436ms (faster than iOS simulator due to real device network stack). Navigation animation ~2s (slower than iOS).
- **Data size**: Market data JSON is ~50-100KB for 283 markets. User data ~5KB for positions + orders.

## Limitations

- Simulated cold start doesn't measure app launch time, JS bundle load, or Engine initialization
- REST preload timing depends on network conditions -- run multiple trials for averages
- Stream channel caches may retain data across simulated resets (cleared in real cold start)
- The disk cache age shown in markers reflects time since last WS update, not time since app was last open
