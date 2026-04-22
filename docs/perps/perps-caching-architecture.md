# Perps Caching Architecture

## Overview

Trading UX must feel instant. Users expect sub-second rendering of positions, orders, and prices — any loading skeleton on the Perps home screen feels like a broken app. Caching bridges the gap between slow REST APIs, WebSocket warmup latency, and the instant UI that traders demand.

**Historical context**: The current architecture has a legacy REST preload layer that was built when WebSocket connections only existed while the Perps tab was visible. Now that `PerpsAlwaysOnProvider` keeps WS connected from wallet mount, parts of this preload infrastructure are redundant and candidates for removal.

## How It Works Today

Three tiers, from freshest to stalest:

| Tier             | What                             | Lifetime        | Examples                                                  |
| ---------------- | -------------------------------- | --------------- | --------------------------------------------------------- |
| Real-time        | WebSocket via StreamManager      | While connected | Prices, positions, fills, orders, account balance         |
| Session          | Provider + TradingReadinessCache | App lifetime    | DEX discovery, signing state, spot metadata, fee rates    |
| Preload (legacy) | REST via Controller              | 5-min refresh   | Market list for home screen, positions before WS connects |

The Preload tier exists because WS wasn't always-on historically. With `PerpsAlwaysOnProvider`, it's partially redundant — WS data arrives within 1-2 seconds of app launch, making the 5-min REST cycle a safety net rather than a primary data source.

## Data Flow: Cold Start to Live Data

What happens when the app launches:

1. **App launches** — Controller preload fires REST fetch — `cachedMarketDataByProvider` populated
2. **PerpsAlwaysOnProvider mounts** — WS connects — stream channels prewarm via `preloadSubscriptions()`
3. **UI hooks mount** — read from stream channel cache (populated by WS prewarm) — instant render
4. **If stream cache empty** — fall back to controller's REST preload cache via `getPreloadedData()` — still instant render
5. **WS data arrives** — overrides everything with live data

The key coupling point: `MarketDataStreamChannel.getCachedData()` falls back to the controller's REST cache. This fallback is what makes the preload layer still useful — it fills the gap between app launch and first WS message.

## Per-Layer Details

### Real-time Layer (Hooks + StreamManager + ConnectionManager)

**UI Hooks** don't own caches — they read from stream channels first, then fall back to the controller's preloaded REST data via `getPreloadedData()`.

**PerpsStreamManager** maintains 9 WebSocket channels:

| Channel      | Cache key         | Scope      | What it stores           |
| ------------ | ----------------- | ---------- | ------------------------ |
| `prices`     | `priceCache` Map  | Global     | Per-symbol price updates |
| `positions`  | `'positions'`     | Account    | User positions array     |
| `orders`     | `'orders'`        | Account    | Open orders array        |
| `account`    | `'account'`       | Account    | Account state (balance)  |
| `fills`      | `'fills'`         | Account    | Recent fills (max 100)   |
| `marketData` | `'markets'`       | Global     | Market data array        |
| `oiCaps`     | `'oiCaps'`        | Global     | OI cap strings           |
| `topOfBook`  | `cachedTopOfBook` | Per-symbol | Best bid/ask/spread      |
| `candles`    | (external class)  | Per-symbol | Candle data              |

All 9 channels support `pause()`/`resume()` — pausing blocks emission to React subscribers while keeping the WebSocket alive. Used during brief operations to prevent UI flicker.

**PerpsConnectionManager** doesn't own caches — it orchestrates clearing of stream channels during lifecycle events. See [Cache Clearing Matrix](#cache-clearing-matrix).

### Session Layer: Provider Instance Caches

| Cache                         | What it stores                     | Scope   | Cleared on disconnect?  |
| ----------------------------- | ---------------------------------- | ------- | ----------------------- |
| `#cachedValidatedDexs`        | Feature-flag-filtered DEX names    | Global  | No (intentional)        |
| `#cachedAllPerpDexs`          | Raw `perpDexs()` API objects       | Global  | No (intentional)        |
| `#perpDexsCache`              | Extended DEX data with fee scales  | Session | Yes                     |
| `#dexDiscoveryComplete`       | Boolean gate for retry logic       | Session | Yes (reset to false)    |
| `#cachedMetaByDex`            | Per-DEX meta responses             | Session | Yes                     |
| `#cachedSpotMeta`             | Spot metadata (USDC token info)    | Session | Yes                     |
| `#cachedMarketDataWithPrices` | Last known-good market snapshot    | Global  | No                      |
| `#symbolToAssetId`            | Symbol-to-asset-ID mapping         | Session | Rebuilt on init         |
| `#maxLeverageCache`           | Per-asset max leverage (TTL-based) | Session | No (TTL-based eviction) |
| `#userFeeCache`               | Per-user fee rates (TTL-based)     | Account | No (TTL-based eviction) |
| `#referralCheckCache`         | Referral state per user            | Account | Yes                     |
| `#builderFeeCheckCache`       | Builder fee approval per user      | Account | Yes                     |

**Critical note**: `#cachedValidatedDexs` and `#cachedAllPerpDexs` are two views of the same `perpDexs()` API response. The [P1 dual-cache desync bug](postmortems/2026-03-24-hip3-asset-id-cache-poisoning.md) was caused by a code path writing one without the other.

### Session Layer: TradingReadinessCache (Global Singleton)

| Cache           | What it stores                         | Key format                   | Cleared on disconnect? |
| --------------- | -------------------------------------- | ---------------------------- | ---------------------- |
| Signing state   | DEX abstraction, builder fee, referral | `network:userAddress`        | Never (intentional)    |
| In-flight locks | Concurrent signing operation guards    | `opType:network:userAddress` | Self-clearing          |

This is the most important "survives everything" cache. Providers are recreated on account/network changes, which resets all instance-level caches. TradingReadinessCache persists as a global singleton specifically to remember that a hardware wallet user already approved DEX abstraction — without it, every reconnect would trigger another QR code scan.

### Preload Layer: PerpsController (Legacy — candidate for removal)

| Cache                        | What it stores                   | Key format           | Cleared on disconnect? |
| ---------------------------- | -------------------------------- | -------------------- | ---------------------- |
| `cachedMarketDataByProvider` | Market list from REST            | `providerId:network` | No (preserved)         |
| `cachedUserDataByProvider`   | Positions, orders, account state | `providerId:network` | No (preserved)         |

**Staleness & debounce constants**:

| Constant             | Value         | Purpose                                                  |
| -------------------- | ------------- | -------------------------------------------------------- |
| `#preloadRefreshMs`  | 5 min         | Periodic `setInterval` refresh                           |
| `#preloadGuardMs`    | 30 s          | Write debounce — skip fetch if entry is fresher than 30s |
| Market data read TTL | 300 s (5 min) | Stale cutoff for consumer reads                          |
| User data read TTL   | 60 s          | Stale cutoff for consumer reads                          |

**Why this is legacy**: `startMarketDataPreload()` is called from `Wallet/index.tsx` and runs independently of `PerpsAlwaysOnProvider`. The user data preload already has a WS-connected guard that skips it when WS is streaming (mostly dormant). The market data preload still runs every 5 min via REST even when WS is streaming — redundant but harmless. Network switches don't clear these caches — different networks use different keys (`hyperliquid:mainnet` vs `hyperliquid:testnet`).

## Cache Clearing Matrix

| Trigger                               | Provider caches                                                                                                        | Controller preload                                                            | Stream channels                              | TradingReadinessCache |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------- | --------------------- |
| `disconnect()` (grace period expires) | Meta, spot, fees, perpDexsCache cleared. DEX discovery (`#cachedValidatedDexs`, `#cachedAllPerpDexs`) **NOT** cleared. | Preserved                                                                     | All 9 cleared                                | Preserved             |
| Account switch                        | Provider recreated (all instance caches reset)                                                                         | `cachedUserDataByProvider` cleared if address changed. Market data preserved. | All 9 cleared immediately (before reconnect) | Preserved             |
| Network switch                        | Provider recreated                                                                                                     | Not cleared (different key avoids collision)                                  | All 9 cleared immediately                    | Preserved             |
| Provider switch                       | Provider recreated                                                                                                     | Scoped by `providerId:network` key                                            | All 9 cleared immediately                    | Preserved             |
| App → background                      | Nothing (20s grace period)                                                                                             | Nothing                                                                       | Nothing (WS stays alive)                     | Preserved             |
| App → foreground                      | `performActualDisconnection()` runs full clear, then fresh connect                                                     | Nothing                                                                       | All 9 cleared, then re-prewarmed             | Preserved             |
| User retry (force)                    | Provider recreated                                                                                                     | Nothing                                                                       | All 9 cleared                                | Preserved             |

**Double-clear on account/network switch**: Stream channels are cleared twice — once immediately in the Redux store subscriber (prevents stale data flash), and again inside `performReconnection()` (ensures clean state for new subscriptions).

## Simplification Roadmap

### 1. Disk-backed cold-start cache (new capability)

**Problem**: On cold start, there's a gap between app launch and first WS data. Currently filled by REST preload.

**Proposal**: Write stream channel snapshots to MMKV after first WS data arrives. Read from MMKV on next cold start.

**Implementation**:

- Two MMKV keys: `PERPS_CACHE_MARKETS`, `PERPS_CACHE_USER_DATA`
- Write via `StorageWrapper.setItem()` — fire-and-forget, MMKV writes are synchronous under the hood
- Read in controller constructor or stream channel `getCachedData()` fallback
- Invalidate on account switch
- `StorageWrapper` is already used in 91+ files — it's the standard persistence layer

**Result**: Instant display of last-known data on cold start. Prices stale by seconds/minutes, positions accurate until next trade. Live WS data overlays within 1-2 seconds.

### 2. Remove REST preload timer (simplification)

**Problem**: 5-min REST polling is redundant when WS is always connected via `PerpsAlwaysOnProvider`.

**Proposal**: Remove `startMarketDataPreload()` interval. Keep a single REST fetch on first mount as a fallback before WS connects. With disk cache (proposal 1), even that may be unnecessary.

**Dependencies**: Requires disk cache (proposal 1) to fill the cold-start gap.

**What to remove**:

- `#preloadRefreshMs` interval
- `#preloadGuardMs` debounce
- `#performMarketDataPreload` periodic calls
- Keep `#performUserDataPreload` as a one-shot fallback (already guarded by WS check)

### 3. Dual-cache unification in provider (bug prevention)

**Problem**: `#cachedValidatedDexs` and `#cachedAllPerpDexs` must stay in sync because `#buildAssetMapping()` reads both. Three independent code paths call the same `perpDexs()` API and write to separate caches:

| Path                            | Cache written                                 | Purpose             |
| ------------------------------- | --------------------------------------------- | ------------------- |
| `#fetchValidatedDexsInternal()` | `#cachedValidatedDexs` + `#cachedAllPerpDexs` | Init discovery      |
| `#getStandaloneValidatedDexs()` | Same two caches                               | Pre-WebSocket reads |
| `#getCachedPerpDexs()`          | `#perpDexsCache`                              | Fee calculation     |

**Proposal**: Replace all three caches with a single `#dexDiscoveryState` object that atomically stores `raw`, `validated`, and `extended` views. One object assignment, one source of truth — eliminates the desync risk by construction.

**Postmortem**: [2026-03-24-hip3-asset-id-cache-poisoning.md](postmortems/2026-03-24-hip3-asset-id-cache-poisoning.md)

## Rules for Adding New Caches

1. **Pick the right layer**: Provider for API data, Controller for preload, StreamManager for real-time, TradingReadinessCache for signing state.
2. **Decide scope**: Global (market data) vs account-specific (positions, signing state).
3. **If account-specific**: Must be cleared on account switch. Verify your cache is covered by the ConnectionManager's clearing sequence or the controller's account-change handler.
4. **If two caches derive from the same source**: Unify into a single object or ensure atomic writes. Never let independent code paths write subsets of related caches.
5. **Choose a freshness tier**: Real-time (WS), background (REST with TTL), or session (app lifetime). Don't mix — a cache that's sometimes WS-fed and sometimes REST-fed creates confusing staleness semantics.
6. **Document in this file**: Add your cache to the appropriate per-layer inventory table.
