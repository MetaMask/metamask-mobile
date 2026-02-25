# Deep Analysis: Hyperliquid Connection & Reconnection Issues in Perps

## Summary

This analysis covers the connection/reconnection architecture for Hyperliquid in the Perps feature, identifying potential issues that could cause users to not see data (positions, prices, account state) intermittently. The analysis is based on the code in the `release/7.67.0` branch, which includes a recent cherry-pick fix (`8f1ce833e4`) for connection-aware `ensureReady()`.

---

## 1. Architecture Overview

The connection stack has 5 layers:

```
React Hooks (usePerpsLivePrices, usePerpsLivePositions, etc.)
    ↓
StreamChannel (PriceStreamChannel, PositionStreamChannel, etc.)
    ↓
PerpsConnectionManager (singleton - connection lifecycle)
    ↓
PerpsController (controller layer)
    ↓
HyperLiquidProvider → HyperLiquidClientService → WebSocket API
```

---

## 2. Fix Applied on This Branch (commit 8f1ce833e4)

**Problem fixed:** On slow connections, `StreamChannel.ensureReady()` used blind polling (200ms x 150 retries = 30s) with no awareness of WebSocket connection state. Channels exhausted retries before the connection was established, leaving users with stale REST cache and no live WebSocket data.

**Fix:** Added `awaitConnectionThenConnect()` that uses `PerpsConnectionManager.waitForConnection()` to await the connection promise instead of blind polling.

---

## 3. Remaining Issues & Potential Problems

### ISSUE 1: Sentinel Timer Race Condition in `awaitConnectionThenConnect()` (MEDIUM-HIGH RISK)

**File:** `PerpsStreamManager.tsx`, lines 216-252

```typescript
private awaitConnectionThenConnect(): void {
    if (this.deferConnectTimer) {
      return;  // <-- PROBLEM: Early return if ANY timer is set
    }
    const sentinel = setTimeout(noop, 0);
    this.deferConnectTimer = sentinel;
    
    PerpsConnectionManager.waitForConnection()
      .then(() => {
        if (this.deferConnectTimer === sentinel) {
          this.deferConnectTimer = null;
        }
        if (this.subscribers.size > 0) {
          this.connect();
        }
      })
```

**The problem:** The sentinel timer fires almost immediately (`setTimeout(noop, 0)`). If JavaScript's event loop processes the sentinel timer callback *before* `waitForConnection()` resolves, the `deferConnectTimer` reference becomes a completed timer handle. Meanwhile, if a `deferConnect()` is called from elsewhere (e.g., `isCurrentlyReinitializing()` path), it will clear this sentinel and set a new timer. When `waitForConnection().then()` fires, the `deferConnectTimer === sentinel` check fails, so it doesn't null the timer, but still calls `this.connect()`. This creates a scenario where **both** the deferred timer AND the promise resolution trigger `connect()` nearly simultaneously.

**Impact:** Potential duplicate WebSocket subscriptions, which can cause double-counting in data or resource leaks.

**Scenario:** User opens Perps during a reconnection phase where `isConnecting=true` AND `isCurrentlyReinitializing()` flips true shortly after.

---

### ISSUE 2: `waitForConnection()` Resolves Even on Failure (MEDIUM RISK)

**File:** `PerpsConnectionManager.ts`, lines 1014-1029

```typescript
async waitForConnection(): Promise<void> {
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch {
        // Connection failed — caller will check getConnectionState()
      }
    }
    if (this.pendingReconnectPromise) {
      try {
        await this.pendingReconnectPromise;
      } catch {
        // Reconnection failed — caller will check getConnectionState()
      }
    }
  }
```

**The problem:** `waitForConnection()` **swallows errors** and resolves (not rejects) even when connection fails. The caller in `awaitConnectionThenConnect().then()` proceeds to call `this.connect()`, which calls `ensureReady()`, which checks `isInitialized`. Since the connection failed, `isInitialized = false`, and `isConnecting = false`, so it falls through to `deferConnect(200ms)`. This restarts the blind polling loop.

**Impact:** After a connection failure, each channel individually starts a blind polling loop (200ms retries up to 150 attempts = 30s). If the connection manager isn't attempting reconnection, all channels will exhaust retries and **silently give up**, leaving the user with no data and no error indication.

**Missing:** There's no mechanism for channels to be notified when a new connection attempt starts after a previous failure. They simply give up after 30 seconds of polling.

---

### ISSUE 3: Connection Timeout Silently Kills Connection State (HIGH RISK)

**File:** `PerpsConnectionManager.ts`, lines 240-249

```typescript
this.connectionTimeoutRef = setTimeout(() => {
    this.isConnecting = false;
    this.isConnected = false;
    this.isInitialized = false;
    this.setError(PERPS_ERROR_CODES.CONNECTION_TIMEOUT);
    this.connectionTimeoutRef = null;
}, timeoutMs);  // 30 seconds
```

**The problem:** The 30-second timeout runs as a separate `setTimeout`. If the connection attempt is genuinely slow (e.g., health check `ping()` taking 25+ seconds on a bad network), the timeout fires and resets ALL connection state to "failed". However, the `connect()` method's async code continues running. When `provider.ping()` finally resolves successfully at second 31, the code does check for the timeout error (line 521-528), but there's a **race window** between:

1. Timeout fires at 30s → sets `isConnecting=false, isInitialized=false, error=CONNECTION_TIMEOUT`
2. `connect()` sees `this.error === CONNECTION_TIMEOUT` → bails out
3. But `initPromise` is nulled in `finally` → any stream channels waiting via `waitForConnection()` resolve
4. Channels call `connect()` → `ensureReady()` → `isInitialized=false, isConnecting=false` → blind polling starts with no active connection attempt to wait for

**Impact:** After a timeout, users see an error screen, but if they don't retry, the background channels are stuck in a dead polling loop. The `PerpsConnectionErrorView` shows a retry button, but the underlying channels have already given up.

**Key issue:** After timeout + user retry via `reconnectWithNewContext({force:true})`, the channels' `connectRetryCount` has NOT been reset (it was incremented during the failed attempt). If a channel was already at high retry count, it may hit MAX_CONNECT_RETRIES sooner on the retry.

---

### ISSUE 4: Double Cache Clear During State Monitoring Reconnection (LOW-MEDIUM RISK)

**File:** `PerpsConnectionManager.ts`, lines 145-171 and 720-734

When `setupStateMonitoring()` detects an account/network change:
1. **First clear:** Lines 145-153 - immediately clears all stream caches
2. Calls `reconnectWithNewContext()` 
3. **Second clear:** Inside `performReconnection()` at lines 725-734 - clears all caches AGAIN

**Impact:** The double clear is mostly harmless (idempotent operation), but it means subscribers receive TWO rounds of "cleared data" callbacks in rapid succession. Each triggers a React re-render to "loading" state. This could cause a brief UI flicker where the user sees data → blank → blank → new data.

---

### ISSUE 5: Grace Period Timer Platform Differences (LOW-MEDIUM RISK)

**File:** `PerpsConnectionManager.ts`, lines 264-305

```typescript
if (Device.isIos()) {
    BackgroundTimer.start();
    this.gracePeriodTimer = setTimeout(() => { ... }, 20_000);
    BackgroundTimer.stop();  // Stop immediately after scheduling
} else if (Device.isAndroid()) {
    this.gracePeriodTimer = BackgroundTimer.setTimeout(() => { ... }, 20_000);
}
```

**The problem:** On iOS, `BackgroundTimer.start()` is called, then `setTimeout` is used (standard JS timer, NOT `BackgroundTimer.setTimeout`), then `BackgroundTimer.stop()` is called. The standard `setTimeout` does **NOT** fire in the background on iOS. This means:

- If the user backgrounds the app, the 20-second grace period timer may never fire on iOS
- The connection remains alive indefinitely in the background, wasting battery
- When the user comes back, the connection may have been terminated by the OS but the state still shows `isConnected=true`

**Impact:** Users coming back from background may see stale data because the connection was silently dropped by iOS but the manager still thinks it's connected. The health check ping only happens during initial connect and reconnect, NOT on foreground resume.

---

### ISSUE 6: No Proactive Health Check on App Resume (HIGH RISK)

**File:** `usePerpsConnectionLifecycle.ts`, lines 89-111

When the app comes to foreground after background:
```typescript
if (!hasConnected.current && (isVisible === true || isVisible === undefined)) {
    const timer = setTimeout(() => {
        handleConnection();  // Just calls PerpsConnectionManager.connect()
    }, PERPS_CONSTANTS.ReconnectionDelayAndroidMs); // 300ms
}
```

**The problem:** `PerpsConnectionManager.connect()` checks `if (this.isConnected) return;` (line 468). If the manager still thinks it's connected (because the grace period timer never properly disconnected in background), it immediately returns without doing anything. But the actual WebSocket may be dead.

**Missing:** There is NO proactive health check (ping) when resuming from background. The comment at line 466-467 even acknowledges this: "Note: We don't proactively check for stale connections here for performance reasons."

**Impact:** This is likely the **primary cause** of users seeing stale/missing data intermittently. Sequence:
1. User is viewing perps → works fine
2. User backgrounds the app for 30+ seconds
3. iOS or carrier drops the WebSocket (common on mobile networks)
4. User returns to the app
5. `isConnected = true` (stale state) → no reconnection triggered
6. WebSocket is dead → no live data flows
7. User sees frozen prices, missing positions, or stale account state

---

### ISSUE 7: `CandleStreamChannel` Uses Different `ensureReady()` (MEDIUM RISK)

**File:** `CandleStreamChannel.ts`

`CandleStreamChannel` does NOT inherit from the main `StreamChannel` in `PerpsStreamManager.tsx`. It has its own base class with a different `ensureReady()` implementation that only checks `getIsInitialized()` (a simple boolean getter) — it does **NOT** have the new `awaitConnectionThenConnect()` optimization. It still uses blind polling with `deferConnect()`.

```typescript
// CandleStreamChannel's base class:
protected ensureReady(): boolean {
    if (Engine.context.PerpsController.isCurrentlyReinitializing()) {
      this.deferConnect(symbol, interval, cacheKey, 500);
      return false;
    }
    if (!this.getIsInitialized()) {
      this.deferConnect(symbol, interval, cacheKey, 200);
      return false;
    }
    this.connectRetryCounts.delete(cacheKey);
    return true;
}
```

**Impact:** CandleStreamChannel still has the original slow-connection problem that was fixed for other channels. On slow connections, candle data may fail to load within 50 retries (10 seconds at 200ms) and silently give up.

---

### ISSUE 8: `PerpsConnectionProvider` Polls State Every 100ms (LOW RISK, Performance)

**File:** `PerpsConnectionProvider.tsx`, line 91

```typescript
pollIntervalRef.current = setInterval(updateState, 100);
```

**The problem:** The connection provider polls the singleton's state every 100ms to detect changes. This is an anti-pattern — it should use an event emitter or callback pattern. While each poll is cheap (object comparison), it runs continuously for the entire time the user is in the Perps screen.

**Impact:** Minor battery drain and unnecessary work. But more importantly, there's a 0-100ms delay between actual state changes and the UI reflecting them. During that window, the UI may show inconsistent state (e.g., showing "connected" when the manager just entered error state).

---

### ISSUE 9: `clearCache()` Disconnects WebSocket But Doesn't Prevent Reconnection Loop (MEDIUM RISK)

**File:** `PerpsStreamManager.tsx`, lines 311-343

When `clearCache()` is called (during account switch):
1. It calls `this.disconnect()` — which clears the `wsSubscription`
2. It clears the cache
3. It notifies subscribers with "cleared data" (triggers loading state in UI)
4. Comment says: "If we have active subscribers, they'll trigger reconnect in their next render"

**The problem:** After `clearCache()`, the subscribers are still registered. There's a subtle issue: the `disconnect()` at step 1 also clears `deferConnectTimer` and `connectRetryCount`. But if `reconnectWithNewContext()` is happening simultaneously, the `performReconnection()` method also calls `clearCache()` on all channels (line 725-734). This means:

1. State monitoring detects change → clears all caches (disconnects channels)
2. `reconnectWithNewContext()` starts → enters `performReconnection()`
3. `performReconnection()` clears all caches AGAIN (double disconnect)
4. While the controller is reinitializing, channels' subscribers may try to reconnect
5. Channels call `connect()` → `ensureReady()` detects `isCurrentlyReinitializing()` → defers
6. When reinitialization completes, `preloadSubscriptions()` creates prewarm subscriptions
7. But channels that were deferred may also fire their connect retries at this point
8. Both prewarm AND deferred connects attempt to create WebSocket subscriptions simultaneously

**Impact:** Potential duplicate WebSocket subscriptions during account switch, leading to double data callbacks and incorrect reference counts. This may cause data to appear briefly and then disappear (when one subscription is cleaned up).

---

### ISSUE 10: `HyperLiquidClientService` Reconnection Doesn't Propagate Up (MEDIUM-HIGH RISK)

**File:** `HyperLiquidClientService.ts`, lines 1017-1108

When the WebSocket drops and `#handleConnectionDrop()` runs:
1. It creates a new transport
2. Restores subscriptions via `#onReconnectCallback`
3. Sets state to `Connected`

**The problem:** This reconnection happens entirely within the client service layer. The `PerpsConnectionManager` at the top is **NOT aware** that a WebSocket drop and reconnection happened. Its state still shows `isConnected=true` throughout. This means:

- Stream channels that were paused/disconnected during the drop are not reconnected
- Any UI component that relies on `PerpsConnectionManager.getConnectionState()` doesn't know about the interruption
- The `onReconnectCallback` calls `subscriptionService.restoreSubscriptions()` and `streamManager.clearAllChannels()`, which does trigger channel reconnection. But if `clearAllChannels()` calls `channel.reconnect()` → `disconnect()` + `connect()`, and `connect()` calls `ensureReady()` which checks `PerpsConnectionManager.getConnectionState().isInitialized`, this should still be `true`. However...

**Key gap:** If the SDK's internal reconnection attempt also fails (transport.ready() throws), the catch block schedules a retry after 5 seconds. During those 5 seconds, `isConnecting` is true at the SDK level but `PerpsConnectionManager` doesn't know — it still reports `isConnected=true` and `isInitialized=true`. Stream channels that try to create subscriptions during this window will get errors because the transport isn't ready.

Additionally, the SDK has a max of 10 reconnection attempts. If all 10 fail, the `terminate` event fires. The `#onTerminateCallback` logs the error but there's **no mechanism to propagate this back to `PerpsConnectionManager`** to show an error UI or trigger a higher-level reconnection.

---

### ISSUE 11: Stale User Data Cache Timestamp (LOW-MEDIUM RISK)

**File:** `hasCachedPerpsData.ts`

The `USER_DATA_CACHE_STALE_MS = 60_000` (60 seconds) threshold means cached positions/orders/account data from the controller's REST preload is considered valid for 60 seconds. But if the WebSocket connection drops and doesn't reconnect:

1. The REST cache shows the user their positions (from preload)
2. After 60 seconds, the cache is considered stale → returns `null`
3. The stream channel has no WebSocket data either (connection dropped)
4. User sees positions disappear after 60 seconds

**Impact:** This creates a confusing UX where data appears initially, then vanishes after a minute if the WebSocket connection is broken.

---

## 4. Scenarios That Trigger Data Loss for Users

### Scenario A: Slow Network Initial Load
1. User opens Perps on 3G/slow WiFi
2. Connection takes 20+ seconds
3. **Before fix:** Channels exhaust 150 retries and give up → no data
4. **After fix:** Channels wait for connection promise → should work
5. **Remaining risk:** If connection takes > 30s, timeout fires → error screen → channels' retry counts not reset

### Scenario B: Background/Foreground Cycle
1. User views Perps → data shows correctly
2. User backgrounds app for 2+ minutes
3. iOS/carrier kills WebSocket
4. User returns → `isConnected=true` (stale) → no reconnection
5. **Result:** Frozen data, no live updates

### Scenario C: Network Switch (WiFi → Cellular)
1. User on WiFi viewing Perps
2. Leaves WiFi range, switches to cellular
3. WebSocket drops → `HyperLiquidClientService` detects and attempts reconnection
4. If reconnection succeeds internally, `clearAllChannels()` is called
5. If reconnection fails 10 times → `terminate` event → no propagation to manager
6. **Result:** After 10 failed attempts, permanent data loss until user manually exits and re-enters Perps

### Scenario D: Account Switch While Data Loading
1. User opens Perps → connection starts
2. While `isConnecting=true`, user switches account
3. State monitoring detects change → `clearAllChannels()` + `reconnectWithNewContext()`
4. Channels that were waiting via `awaitConnectionThenConnect()` may resolve with old connection
5. Old connection data briefly appears before new connection establishes
6. **Result:** Brief flash of wrong account's data (account context validation in channels should catch this, but only logs error — doesn't clear UI)

---

## 5. Recommendations

### Priority 1 (High Impact, Users Seeing Stale Data)
1. **Add proactive health check on app resume.** When `usePerpsConnectionLifecycle` detects foreground, call `provider.ping()` before confirming connection is alive. If ping fails, trigger `reconnectWithNewContext({force: true})`.

2. **Propagate SDK-level WebSocket termination to `PerpsConnectionManager`.** When `HyperLiquidClientService` fires the `terminate` event (all 10 reconnection attempts failed), propagate this up to `PerpsConnectionManager` to set error state and show the error UI.

### Priority 2 (Race Conditions)
3. **Apply `awaitConnectionThenConnect()` to `CandleStreamChannel`.** It currently uses the old blind polling mechanism.

4. **Replace polling in `PerpsConnectionProvider` with event emitter.** The 100ms polling is inefficient and introduces state synchronization delays.

5. **Reset channel `connectRetryCount` when a new connection attempt starts.** Currently, retry counts persist across connection attempts, causing channels to give up faster on retries after a failed connection.

### Priority 3 (Edge Cases)
6. **Fix iOS background timer.** Use `BackgroundTimer.setTimeout` on iOS instead of standard `setTimeout` for the grace period, or accept that the grace period won't work in background and handle it on resume.

7. **Add connection state listener pattern to `PerpsConnectionManager`.** Allow channels to register for connection state change notifications instead of polling or blind retries.

8. **Deduplicate cache clears during reconnection.** The double clear in state monitoring + performReconnection is harmless but causes unnecessary UI flickers.

---

## 6. Files Analyzed

| File | Role |
|------|------|
| `app/components/UI/Perps/services/PerpsConnectionManager.ts` | Connection lifecycle singleton |
| `app/components/UI/Perps/providers/PerpsStreamManager.tsx` | Stream channels + manager |
| `app/components/UI/Perps/providers/PerpsConnectionProvider.tsx` | React context for connection state |
| `app/components/UI/Perps/hooks/usePerpsConnectionLifecycle.ts` | Visibility/app-state lifecycle |
| `app/components/UI/Perps/providers/channels/CandleStreamChannel.ts` | Candle-specific stream |
| `app/components/UI/Perps/hooks/stream/hasCachedPerpsData.ts` | Controller cache access |
| `app/controllers/perps/services/HyperLiquidClientService.ts` | Low-level WebSocket management |
| `app/controllers/perps/services/HyperLiquidSubscriptionService.ts` | Subscription reference counting |
| `app/controllers/perps/providers/HyperLiquidProvider.ts` | Provider implementation |
| `app/controllers/perps/PerpsController.ts` | Controller layer |
| `app/controllers/perps/constants/perpsConfig.ts` | Constants and timing values |
