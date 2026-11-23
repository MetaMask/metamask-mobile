# Perps caching architecture

Mobile caches live in the stream channels, a few UI hooks and the MMKV disk store. The controller's preload caches, provider session caches, `TradingReadinessCache`, preload timing and disk hydration are described in Core [architecture.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/architecture.md#state-caches-and-persistence).

## Layers

| Layer                          | Owner                                                                           | Lifetime                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stream channel caches          | `PerpsStreamManager`                                                            | Until `PerpsConnectionManager` clears them. See [Clearing](#clearing).                                                                             |
| Market list in memory          | `MarketDataChannel`                                                             | `MarketDataCacheDurationMs` (5 min) per provider, network, HIP-3 version and source                                                                |
| Standalone position lookups    | `usePerpsPositionForAsset`                                                      | 30 s TTL, cleared by `PerpsCacheInvalidator`                                                                                                       |
| Disk (MMKV)                    | Written by the controller and by `PerpsStreamManager`, through `StorageWrapper` | Across restarts                                                                                                                                    |
| Controller and provider caches | Core                                                                            | See Core [architecture.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/architecture.md#state-caches-and-persistence) |

`PerpsConnectionManager` owns no cache. It orchestrates clearing.

Code: `app/components/UI/Perps/providers/PerpsStreamManager.tsx` `PerpsStreamManager`, `MarketDataChannel`; `app/components/UI/Perps/hooks/usePerpsPositionForAsset.ts` `positionCache`, `CACHE_TTL_MS`; `app/store/storage-wrapper.ts`; `app/components/UI/Perps/services/PerpsConnectionManager.ts`.

## Stream channels

| Channel        | Cache key             | Scope                   | Stores                       | Fed by                      |
| -------------- | --------------------- | ----------------------- | ---------------------------- | --------------------------- |
| `prices`       | `priceCache` Map      | Global                  | Per-symbol price updates     | WebSocket                   |
| `positions`    | `'positions'`         | Account                 | Positions                    | WebSocket and user snapshot |
| `orders`       | `'orders'`            | Account                 | Open orders                  | WebSocket and user snapshot |
| `account`      | `'account'`           | Account                 | Account state                | WebSocket and user snapshot |
| `fills`        | `'fills'`             | Account                 | Recent fills, max 100        | WebSocket                   |
| `marketData`   | `'markets'`           | Global                  | Market list                  | REST or Terminal snapshot   |
| `oiCaps`       | `'oiCaps'`            | Global                  | Symbols at open-interest cap | WebSocket                   |
| `topOfBook`    | `cachedTopOfBook`     | Per symbol              | Best bid, ask, spread        | WebSocket                   |
| `focusedPrice` | `cachedPriceUpdate`   | Per symbol              | Price of the focused market  | WebSocket                   |
| `candles`      | `CandleStreamChannel` | Per symbol and interval | Candles                      | WebSocket and history fetch |

- Every channel supports `pause()` and `resume()`. Except in `candles`, pauses are counted and the last `resume()` replays the latest cached value. `candles` uses a boolean flag and replays nothing. The controller pauses channels by name through the `streamManager` platform dependency.
- `clearCache()` drops the cache, unsubscribes, and sends each subscriber its empty value so it shows loading.
- `clearAllChannels()` reconnects every channel, then requests a user snapshot. Caches are kept, except `topOfBook` and `focusedPrice`, which clear and send their empty value.
- `retryOrderStreams()` clears and reconnects `orders` and `fills` after a trading-key failure.

Code: `app/components/UI/Perps/providers/PerpsStreamManager.tsx` `StreamChannel.pause`, `resume`, `clearCache`, `TopOfBookStreamChannel.reconnect`, `FocusedPriceStreamChannel.reconnect`, `PerpsStreamManager.clearAllChannels`, `retryOrderStreams`; `app/components/UI/Perps/providers/channels/CandleStreamChannel.ts` `pause`, `resume`; `app/components/UI/Perps/adapters/mobileInfrastructure.ts` `createStreamManagerAdapter`.

## First paint

Hooks seed their initial state from the channel snapshot, then from the controller cache through `getPreloadedData`, which reads with `skipTTL: true`.

| Hook                    | First value                                                        | Loading flag starts false when                  |
| ----------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| `usePerpsLivePositions` | `positions` snapshot, else `getPreloadedData('cachedPositions')`   | Either exists                                   |
| `usePerpsLiveOrders`    | `orders` snapshot, else `getPreloadedData('cachedOrders')`         | Either exists                                   |
| `usePerpsLiveAccount`   | `account` snapshot, else `getPreloadedData('cachedAccountState')`  | Either exists                                   |
| `usePerpsLiveFills`     | Empty list                                                         | The `fills` channel already has data            |
| `usePerpsMarkets`       | `marketData` snapshot, else `getPreloadedData('cachedMarketData')` | Either exists                                   |
| `usePerpsPrices`        | Nothing                                                            | Subscribes only once the manager is initialized |

- `MarketDataChannel` falls back to `getCachedMarketDataForActiveProvider()` without `skipTTL`. Disk-hydrated entries are stamped older than the TTL, so on cold start this fallback returns null and the hook's `getPreloadedData` path supplies first paint. Under the Terminal global snapshot or the Terminal backend flag it accepts only a complete snapshot.
- On the first subscriber, `requestUserDataSnapshot` seeds `positions`, `orders` and `account` from `getCachedUserDataForActiveProvider({ skipTTL: true })` when no live data has arrived. It then fetches `getUserDataSnapshot()` and publishes the result to all three channels before any subscriber is notified, unless live data or a context change came first. HyperLiquid only.

Code: `app/components/UI/Perps/hooks/stream/hasCachedPerpsData.ts` `getPreloadedData`, `hasPreloadedData`; `app/components/UI/Perps/hooks/stream/usePerpsLivePositions.ts`; `app/components/UI/Perps/hooks/stream/usePerpsLiveOrders.ts`; `app/components/UI/Perps/hooks/stream/usePerpsLiveAccount.ts`; `app/components/UI/Perps/hooks/stream/usePerpsLiveFills.ts`; `app/components/UI/Perps/hooks/usePerpsMarkets.ts`; `app/components/UI/Perps/hooks/usePerpsPrices.ts`; `app/components/UI/Perps/providers/PerpsStreamManager.tsx` `MarketDataChannel.getCachedData`, `requestUserDataSnapshot`, `publishUserDataSnapshot`.

## Cold start

1. The controller constructor hydrates its caches from MMKV through `diskCache.getItemSync`, which Mobile backs with `StorageWrapper.getItemSync`. Prices come back as placeholders. See Core [architecture.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/architecture.md#disk-hydration).
2. `PerpsAlwaysOnProvider` mounts, calls `startMarketDataPreload()` and `resumeFromForeground()`.
3. Hooks render the hydrated structure from `getPreloadedData`.
4. The connection path runs `resumeFromForeground`, `ensureConnected`, `connect`, then `preloadSubscriptions`. Live data replaces the hydrated values.
5. The controller and `PerpsStreamManager` write fresh snapshots back to MMKV.

Code: `app/components/UI/Perps/adapters/mobileInfrastructure.ts` `diskCache`; `app/store/storage-wrapper.ts` `getItemSync`; `app/components/UI/Perps/providers/PerpsAlwaysOnProvider.tsx`; `app/components/UI/Perps/services/PerpsConnectionManager.ts` `preloadSubscriptions`.

## Disk writes and deletes

| MMKV key                     | Mobile writer                                                                                                                                                                           | Mobile deletes it on                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `PERPS_DISK_CACHE_MARKETS`   | `persistMarketDataToDisk()` after fresh market data                                                                                                                                     | Perps network, provider or HIP-3 config change   |
| `PERPS_DISK_CACHE_USER_DATA` | `persistUserDataToDisk()` once `positions`, `orders` and `account` all have data. Skipped when the active provider is `hyperliquid`, so it writes only for Lighter and aggregated mode. | Every account, network, provider or HIP-3 change |

- Both writers are throttled to one write per `PERPS_DISK_CACHE_THROTTLE_MS` (30 s). A context change calls `resetDiskCacheThrottles()` so the next data persists at once.
- Writes are fire-and-forget and never block rendering.
- The controller also writes both keys after each preload. See Core [architecture.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/architecture.md#disk-hydration).

Code: `app/components/UI/Perps/providers/PerpsStreamManager.tsx` `persistMarketDataToDisk`, `persistUserDataToDisk`, `resetDiskCacheThrottles`; `app/components/UI/Perps/services/PerpsConnectionManager.ts` `setupStateMonitoring`.

## Clearing

| Trigger                                                 | Stream channels                                                                                                                                                                           | MMKV              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Account change while connected                          | `positions`, `orders`, `account`, `fills` cleared at once and again in `performReconnection()`. Global channels kept.                                                                     | User key deleted  |
| Perps network, provider or HIP-3 change while connected | All 10 cleared at once and again in `performReconnection()`                                                                                                                               | Both keys deleted |
| App to background                                       | Nothing during the 20 s grace period. Android then clears all 10, unless a tutorial reference kept the count above 0. iOS does not disconnect. Chase suspension can delay the disconnect. | Kept              |
| App to foreground, healthy ping                         | Kept except `topOfBook` and `focusedPrice`; every channel resubscribes                                                                                                                    | Kept              |
| App to foreground, failed ping                          | Kept (`preserveCaches: true`) except `topOfBook` and `focusedPrice`; channels resubscribe after the reconnect                                                                             | Kept              |
| Forced retry or network restore                         | All 10 cleared in `performReconnection()`                                                                                                                                                 | Kept              |
| Grace period expires after unmount or Perps disabled    | All 10 cleared                                                                                                                                                                            | Kept              |

What the controller and providers clear on the same triggers is in Core [architecture.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/architecture.md#state-caches-and-persistence).

Code: `app/components/UI/Perps/services/PerpsConnectionManager.ts` `setupStateMonitoring`, `performReconnection`, `performActualDisconnection`, `resumeFromForeground`, `performEnsureConnected`.

## UI cache invalidation

`PerpsCacheInvalidator` tells standalone hook caches that data changed.

| Cache type     | Invalidated by                                                                             | Subscribers                                       |
| -------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `positions`    | Close position, TP/SL update, and the controller through the `cacheInvalidator` dependency | `usePerpsPositionForAsset`                        |
| `accountState` | Close position, TP/SL update, Pro scale orders, the controller                             | `usePerpsPositionForAsset`, `usePerpsChaseOrders` |
| `markets`      | The controller                                                                             | None                                              |

Code: `app/components/UI/Perps/services/PerpsCacheInvalidator.ts` `PerpsCacheInvalidator`; `app/components/UI/Perps/adapters/mobileInfrastructure.ts` `createCacheInvalidatorAdapter`; `app/components/UI/Perps/hooks/usePerpsClosePosition.ts`; `app/components/UI/Perps/hooks/usePerpsClosePositionForm.ts`; `app/components/UI/Perps/hooks/usePerpsTPSLUpdate.ts`; `app/components/UI/Perps/Views/PerpsProMarketView/components/PerpsProOrderForm/usePerpsProOrderForm.ts`; `app/components/UI/Perps/hooks/usePerpsPositionForAsset.ts`; `app/components/UI/Perps/hooks/usePerpsChaseOrders.ts`.

## Adding a Mobile cache

1. Live data goes in a stream channel. A standalone REST cache in a hook subscribes to `PerpsCacheInvalidator`.
2. An account-scoped cache is cleared in the manager's context-change path, next to `positions`, `orders`, `account` and `fills`.
3. Two caches built from one source are one object or are written together.
4. A cache has one freshness tier. A cache fed sometimes by WebSocket and sometimes by REST has unclear staleness.
5. Add the cache to this file.

Controller and provider caches follow Core's rules in [architecture.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/architecture.md#state-caches-and-persistence).

Code: `app/components/UI/Perps/services/PerpsConnectionManager.ts` `setupStateMonitoring`; `app/components/UI/Perps/services/PerpsCacheInvalidator.ts`.
