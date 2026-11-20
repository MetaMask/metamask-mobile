# Perps connection architecture

Mobile decides when the Perps connection opens and closes. The controller's connect, disconnect, init and reconnect primitives are described in Core [architecture.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/architecture.md#connection).

## Layers

| Layer                     | What it owns                                                                                                                                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PerpsAlwaysOnProvider`   | The connection lifecycle at the wallet root (first connect, background disconnect, foreground resume, unmount). Also the market-data preload start and stop, Chase discovery, suspension and push notifications.                                    |
| `PerpsConnectionManager`  | Singleton. Connection state, reference count, grace period, connection timeout, context-change reconnects, network-restore reconnects, stream prewarm. The only Mobile code that calls `PerpsController.init()` and `PerpsController.disconnect()`. |
| `PerpsConnectionProvider` | React context for one section. Polls the manager every 100 ms.                                                                                                                                                                                      |
| `usePerpsConnection`      | Reads the context. Throws outside a `PerpsConnectionProvider`.                                                                                                                                                                                      |
| `PerpsGlobalErrorGate`    | The connection error screen and its forced retry inside the Perps stack. Polls the manager every 100 ms.                                                                                                                                            |
| `PerpsStreamManager`      | 11 stream channels that subscribe to the controller and cache its data. See [caching-architecture.md](./caching-architecture.md).                                                                                                                   |

```mermaid
graph TD
    AOP[PerpsAlwaysOnProvider at wallet root] -->|resumeFromForeground, disconnect| PCM[PerpsConnectionManager]
    PCP[PerpsConnectionProvider] -.polls 100 ms.-> PCM
    Gate[PerpsGlobalErrorGate] -.polls 100 ms.-> PCM
    Hook[usePerpsConnection] -->|reads| PCP
    PCM -->|init, disconnect, ping| PC[PerpsController in Core]
    PCM -->|prewarm, clearCache, clearAllChannels| PSM[PerpsStreamManager]
    PSM -->|subscribeTo calls| PC
    Redux[Redux store] -.store.subscribe.-> PCM
```

The controller keeps `BaseController` state; the Mobile Engine mirrors it into Redux at `engine.backgroundState.PerpsController`.

Code: `app/components/UI/Perps/providers/PerpsAlwaysOnProvider.tsx` `PerpsAlwaysOnProvider`; `app/components/UI/Perps/services/PerpsConnectionManager.ts` `PerpsConnectionManager`; `app/components/UI/Perps/providers/PerpsConnectionProvider.tsx` `PerpsConnectionProvider`, `PerpsConnectionContext`; `app/components/UI/Perps/hooks/usePerpsConnection.ts` `usePerpsConnection`; `app/components/UI/Perps/components/PerpsGlobalErrorGate/PerpsGlobalErrorGate.tsx` `PerpsGlobalErrorGate`; `app/components/UI/Perps/selectors/perpsController/index.ts`.

## Who connects and disconnects

| Caller                        | Call                                                                       | When                                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `PerpsAlwaysOnProvider`       | `resumeFromForeground({ source: wallet_root_mount, suppressError: true })` | Mount while `selectPerpsEnabledFlag` is true. On failure, one retry after `ConnectRetryDelayMs` (200 ms) with source `wallet_root_retry`. |
| `PerpsAlwaysOnProvider`       | `disconnect()`                                                             | The app leaves `active`, on unmount, and when Perps is disabled. See [App state](#app-state).                                             |
| `PerpsAlwaysOnProvider`       | `resumeFromForeground({ source: wallet_root_foreground })`                 | The app returns to `active`, after `ReconnectionDelayAndroidMs` (300 ms) on both platforms.                                               |
| `PerpsTutorialCarousel`       | `connect({ source: tutorial_preload, suppressError: true })`               | Tutorial mount. There is no matching `disconnect()`.                                                                                      |
| `PerpsGlobalErrorGate`        | `reconnectWithNewContext({ force: true })`                                 | Retry on the Perps connection error screen.                                                                                               |
| `PerpsSectionMain` (Homepage) | context `reconnectWithNewContext({ force: true })`                         | Retry on the Homepage Perps section error.                                                                                                |
| `PerpsConnectionProvider`     | `ensureConnected({ source: perps_fullscreen_entry })`                      | Mount while idle, only without `suppressErrorView`. All 11 instances pass `suppressErrorView`, so this path does not run.                 |
| `useWebSocketHealthToast`     | `PerpsController.reconnect()`, not through the manager                     | Toast retry tap, and 10 s after an unintentional WebSocket `Disconnected`.                                                                |
| `PerpsConnectionManager`      | `reconnectWithNewContext()`                                                | Account, Perps network, provider or HIP-3 config change, and network restore. See [Reconnection](#reconnection).                          |
| `AgenticService` (dev tools)  | `ensureConnected({ source: agentic_refresh_perps_streams })`               | Agent-driven stream refresh.                                                                                                              |

The context also exposes `connect` and `disconnect`; no component calls them. `usePerpsNetworkConfig` exposes a direct `PerpsController.disconnect()`; no component calls it.

Code: `app/components/UI/Perps/providers/PerpsAlwaysOnProvider.tsx` `scheduleSilentEnsureConnected`; `app/components/UI/Perps/components/PerpsTutorialCarousel/PerpsTutorialCarousel.tsx`; `app/components/UI/Perps/components/PerpsGlobalErrorGate/PerpsGlobalErrorGate.tsx` `handleRetry`; `app/components/Views/Homepage/Sections/Perpetuals/PerpsSectionMain.tsx`; `app/components/UI/Perps/hooks/useWebSocketHealthToast.ts` `handleRetry`, `scheduleAutoRetry`; `app/components/UI/Perps/hooks/usePerpsNetworkConfig.ts` `disconnect`; `app/dev-tools/AgenticService/AgenticService.ts` `refreshPerpsStreams`; `app/components/UI/Perps/constants/perpsConfig.ts` `PERPS_CONNECTION_SOURCE`.

## PerpsAlwaysOnProvider

- Mounted in `app/components/Views/Wallet/index.tsx`, inside `ErrorBoundary`, around all wallet content.
- Holds the single `AppState` listener for the connection.
- Calls `startMarketDataPreload()` when Perps is enabled and `stopMarketDataPreload()` when it is disabled or unmounts.
- Starts lifecycle tracking for the CUF `lifecycle_context` tag.
- Runs Chase discovery, suspends Chase orders before a disconnect, handles `PerpsController:chaseOrderMaxDistanceReached`, and mounts `ChaseNotificationPreference`.
- Provides no React context, knows no screens, and holds no stream subscriptions.

Code: `app/components/Views/Wallet/index.tsx`; `app/components/UI/Perps/providers/PerpsAlwaysOnProvider.tsx` `PerpsAlwaysOnProvider`; `app/components/UI/Perps/utils/perpsLifecycleContext.ts` `initPerpsLifecycleTracking`; `app/components/UI/Perps/hooks/usePerpsChaseOrders.ts` `usePerpsChaseOrders`.

## PerpsConnectionProvider

- Props are `isEnabled` (polling on), `isFullScreen` and `suppressErrorView`.
- Turns the manager's state into React state by polling every 100 ms. E2E builds (`hasTestOverrides`) skip polling and use a connected mock state.
- Context value: `{ isConnected, isConnecting, isInitialized, error, connect, disconnect, reconnectWithNewContext, resetError }`. The callbacks are stable, delegate to the manager and report failures with `Logger.error`.
- Renders `PerpsConnectionErrorView` on error only without `suppressErrorView`. Every instance passes it, so the Perps error screen comes from `PerpsGlobalErrorGate`.

Code: `app/components/UI/Perps/providers/PerpsConnectionProvider.tsx` `PerpsConnectionProvider`, `PerpsConnectionContextValue`; `app/components/UI/Perps/routes/index.tsx`; `app/components/UI/Perps/components/PerpsConnectionErrorView/PerpsConnectionErrorView.tsx`.

## PerpsConnectionManager

| Method                                                        | What it does                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resumeFromForeground(options)`                               | Wallet-root entry. Cancels the grace period and holds the reference count at 1 or more. When connected, pings the provider, retrying once after `ForegroundPingRetryDelayMs` (500 ms). A healthy ping keeps the socket and resubscribes every channel through `clearAllChannels()`. Otherwise it calls `ensureConnected({ preserveCaches: true })`. |
| `ensureConnected(options)`                                    | Clean reconnect. Disconnects with `force` (optionally keeping stream caches), resets the reference count to 0, then calls `connect()`.                                                                                                                                                                                                              |
| `connect(options)`                                            | Adds a reference. On the first reference, starts the Redux and NetInfo listeners. Runs `PerpsController.init()` and `getActiveProvider().ping()` under a `ConnectionAttemptTimeoutMs` (30 s) timeout, then `preloadSubscriptions()` after the timeout is cleared. Rethrows failures.                                                                |
| `disconnect()`                                                | Drops a reference. At 0 it starts the grace period.                                                                                                                                                                                                                                                                                                 |
| `reconnectWithNewContext({ force })`                          | See [Reconnection](#reconnection).                                                                                                                                                                                                                                                                                                                  |
| `getConnectionState()`, `resetError()`, `waitForConnection()` | Polling, error reset, and a promise that settles when the current connect or reconnect settles.                                                                                                                                                                                                                                                     |

- State fields are `isConnected`, `isConnecting`, `isInitialized`, `isDisconnecting`, `isInGracePeriod`, `error`.
- The wallet root and `ensureConnected` keep the reference count at 1. The tutorial `connect()` raises it to 2 until the next `disconnect()` or `ensureConnected`.
- Failures set `error` unless suppressed. Sources `wallet_root_mount`, `wallet_root_retry`, `wallet_root_foreground` and `tutorial_preload` suppress by default.
- It creates no providers and writes no Redux state. It deletes the MMKV cold-start keys on a context change.
- Its Redux and NetInfo listeners, once started, stay for the app's lifetime. `cleanupStateMonitoring` has no caller.

Code: `app/components/UI/Perps/services/PerpsConnectionManager.ts` `resumeFromForeground`, `ensureConnected`, `performEnsureConnected`, `connect`, `disconnect`, `shouldSuppressConnectionError`, `startConnectionTimeout`, `setupStateMonitoring`, `cleanupStateMonitoring`.

## App state

- Leaving `active` (to `inactive` or `background`) calls `disconnect()`. When the reference count reaches 0, it starts a `ConnectionGracePeriodMs` (20 s) grace period. Each tutorial mount adds a reference, so the next `disconnect()` after it starts no grace period.
- When Chase is enabled, has live orders, or discovery is unresolved, the disconnect waits. At `background` the provider suspends Chase orders, then disconnects.
- Android runs the grace timer with `BackgroundTimer` and fully disconnects after 20 s. It cleans up prewarm, clears all 11 channels and calls `PerpsController.disconnect()`.
- iOS ignores a grace timer armed while the app was not active, so backgrounding never disconnects; `resumeFromForeground` re-validates on return. A grace period armed while active disconnects on schedule.
- Returning to `active` cancels pending timers and resumes after 300 ms.

Code: `app/components/UI/Perps/providers/PerpsAlwaysOnProvider.tsx` `AppState.addEventListener`; `app/components/UI/Perps/components/PerpsTutorialCarousel/PerpsTutorialCarousel.tsx`; `app/components/UI/Perps/services/PerpsConnectionManager.ts` `disconnect`, `scheduleGracePeriodDisconnection`, `cancelGracePeriod`, `performActualDisconnection`.

## Subscription warmup

After the first successful ping, `preloadSubscriptions()` runs once per session:

1. `positions`, `orders`, `account`, `marketData`, `oiCaps` and `fills` call `prewarm()`. WebSocket prewarms use `throttleMs: 0`. `marketData.prewarm()` starts a REST or Terminal snapshot fetch and returns a no-op cleanup.
2. `await prices.prewarm()` subscribes to all market prices.
3. Waits `InitialDataDelayMs` for first data.

`topOfBook`, `focusedPrice`, `availableToTrade` and `candles` are screen-driven and not prewarmed. After a reconnect the manager reconnects them for mounted screens. `availableToTrade` holds one venue stream per market (the Pro order form's "available to trade"), throttled by `PERPS_AVAILABLE_TO_TRADE_THROTTLE_MS` (1 s). It is user data: account, provider and network switches, hard teardown and the start of every reconnection clear it, so the form shows its placeholder until the new value arrives. `cleanupPreloadedSubscriptions()` runs on every full disconnect and at the start of every reconnection. Which venue feed backs each channel is a provider detail; see Core [venues/hyperliquid/README.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/venues/hyperliquid/README.md).

Code: `app/components/UI/Perps/services/PerpsConnectionManager.ts` `preloadSubscriptions`, `cleanupPreloadedSubscriptions`; `app/components/UI/Perps/providers/PerpsStreamManager.tsx` `prewarm`.

## Stream channel guards

Each channel's `connect()` calls `ensureReady()` before subscribing:

1. Controller reinitializing. Retry after `ReconnectionCleanupDelayMs` (500 ms).
2. Manager not initialized and connecting. Await `waitForConnection()`, then connect.
3. Manager not initialized and not connecting. Retry after `ConnectRetryDelayMs` (200 ms).

Retries stop when no subscribers remain or after 150 attempts. Without the guard, the controller's `subscribeTo*` returns a no-op unsubscribe when no provider exists, the channel keeps it, and no callback ever fires, which leaves an endless skeleton.

The Pro chart and order book pin their subscriptions to the selected venue when a route is needed. The dedicated aggregated order-book connection is Hyperliquid-only. Other venues use their controller-routed book and Core's grouping function.

All channels except `candles` use `ensureReady()`. `marketData` skips it when the Terminal global snapshot is active. `CandleStreamChannel` runs its own reinitialization and `isInitialized` checks.

Code: `app/components/UI/Perps/providers/PerpsStreamManager.tsx` `StreamChannel.ensureReady`, `deferConnect`, `awaitConnectionThenConnect`, `MAX_CONNECT_RETRIES`; `app/components/UI/Perps/providers/channels/CandleStreamChannel.ts`.

## Reconnection

| Trigger                                                | Detected by                                                                              | What happens                                                                                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account change                                         | Redux subscriber on `selectSelectedInternalAccountByScope('eip155:1')`                   | Only while connected. Prepares Chase for the change, clears user channels and the user disk key, then calls `reconnectWithNewContext()` after a 50 ms debounce. |
| Perps network, provider or HIP-3 config version change | Same subscriber (`selectPerpsNetwork`, `selectPerpsProvider`, `selectHip3ConfigVersion`) | Same, but clears all 11 channels and both disk keys.                                                                                                            |
| Network restore                                        | NetInfo offline to online                                                                | `reconnectWithNewContext({ force: true })`, up to `NetworkRestoreMaxRetries` (8) attempts, `NetworkRestoreRetryBaseMs` (1.5 s) times the attempt number apart.  |
| User retry                                             | `PerpsGlobalErrorGate`, `PerpsSectionMain`                                               | `reconnectWithNewContext({ force: true })`.                                                                                                                     |
| WebSocket drop                                         | `useWebSocketHealthToast`                                                                | `PerpsController.reconnect()` after 10 s. Provider-level retries are Core's.                                                                                    |

`reconnectWithNewContext` modes:

- `force: false` waits for an in-flight init and returns if the selected user is already connected. If a reconnect is running, it records `pendingReconnectRequest` and returns the same promise.
- `force: true` cancels the grace period and connection timeout and waits up to 30 s for an in-flight init, which cannot be cancelled. If a reconnect is running, it queues a forced re-run.
- A context change while disconnected and a reconnect is running also queues a forced re-run.
- `performSerializedReconnection` re-runs `performReconnection` up to 3 times while a queued request or a selected-user mismatch remains. Rapid A to B to C switches therefore end on C with one reconnection at a time.

`performReconnection` clears pending CUF traces, starts the reconnect CUF, cleans up prewarm, clears user channels (and global channels unless the change was account-only), calls `PerpsController.disconnect()` then `init()`, waits the platform delay and up to 2 s for a controller reinitialization, pings, marks connected, reconnects screen channels and runs `preloadSubscriptions()`.

Code: `app/components/UI/Perps/services/PerpsConnectionManager.ts` `setupStateMonitoring`, `prepareForContextChange`, `reconnectAfterNetworkRestore`, `validateAndReconnect`, `reconnectWithNewContext`, `performSerializedReconnection`, `MAX_SERIALIZED_RECONNECT_ATTEMPTS`, `performReconnection`.

## Race guards

| Guard                                                | Prevents                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| `initPromise`                                        | Concurrent `connect()`                                           |
| `ensureConnectedPromise`                             | Concurrent `ensureConnected()` from rapid foreground transitions |
| `pendingReconnectPromise`, `pendingReconnectRequest` | Concurrent reconnects; carries the latest request into a re-run  |
| `disconnectPromise`                                  | A connect starting before a disconnect finishes                  |
| `initializationGeneration`                           | A superseded init marking the manager connected                  |

Controller-level guards (`#initializationPromise`, `isReinitializing`) are in Core [architecture.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/architecture.md#connection).

Code: `app/components/UI/Perps/services/PerpsConnectionManager.ts` `PerpsConnectionManagerClass`.

## Against the client contract

Core [architecture.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/architecture.md#what-a-client-must-do) lists what every client must do.

| Core rule                                                                                          | Mobile piece                                                                                                                                                                                                                                                                                    | Status |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| One owner decides when to call `init` and `disconnect`; other components read state                | `PerpsConnectionManager` is the only caller of `init()` and `disconnect()`, driven by `PerpsAlwaysOnProvider`. `PerpsTutorialCarousel` also calls `connect()`, and `useWebSocketHealthToast` calls `PerpsController.reconnect()` around the manager.                                            | Gap    |
| Use the `PERPS_CONSTANTS` timings                                                                  | The manager, the wallet-root provider and the channels use `ConnectionGracePeriodMs`, `ConnectionAttemptTimeoutMs` and `ConnectRetryDelayMs`. Timings with no Core constant stay local, such as the toast's 10 s retry and 1 s banner delay, 100 ms polling, 50 ms debounce, 2 s reinit wait.   | Met    |
| On account change, reconnect if the new account needs live data                                    | The manager's Redux subscriber calls `reconnectWithNewContext()` while connected. While disconnected, the next connect uses the new account.                                                                                                                                                    | Met    |
| While `initializationState` is not ready, show loading or failed state and don't call data methods | Channels and hooks gate on the manager's `isInitialized`, not on the controller's `initializationState`. Wallet-root connects suppress errors, so a failed init shows no failed state, and nothing retries after the one 200 ms retry until the next foreground, network restore or user retry. | Gap    |
| Every `subscribeTo*` keeps its unsubscribe and calls it on teardown                                | Channels keep `wsSubscription` (candles keep a map) and call it in `disconnect()`. Prewarm cleanups are kept and called. Hooks with direct subscriptions return their unsubscribe from the effect.                                                                                              | Met    |

Code: `app/components/UI/Perps/services/PerpsConnectionManager.ts`; `app/components/UI/Perps/providers/PerpsAlwaysOnProvider.tsx`; `app/components/UI/Perps/providers/PerpsStreamManager.tsx` `StreamChannel.disconnect`; `app/components/UI/Perps/providers/channels/CandleStreamChannel.ts` `wsSubscriptions`; `app/components/UI/Perps/hooks/usePerpsPrices.ts`; `app/components/UI/Perps/hooks/usePerpsMarketStats.ts`; `app/components/UI/Perps/hooks/stream/usePerpsLiveOrderBook.ts`; `app/components/UI/Perps/hooks/usePerpsTwapOrders.ts`; `app/components/UI/Perps/hooks/useWebSocketHealthToast.ts`.
