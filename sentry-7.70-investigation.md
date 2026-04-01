# Sentry 7.70 Perps Error Spike Investigation

**Date**: 2026-04-01
**Release**: `io.metamask@7.70.0+4130` / `io.metamask.MetaMask@7.70.0+4130`
**SDK**: `@nktkas/hyperliquid@0.30.2` (unchanged since 7.66)
**Related PR**: #28141 / #28176 (rate limit exhaustion fix)

---

## The Problem

7.70.0 is generating **217K perps Sentry errors in 7 days** (149K iOS, 68K Android). The #1 error is `"Failed to establish WebSocket connection"` — **95K events in 3 days**.

## Root Cause

PR #27103 made the WS connection "always-on" (connects at app startup instead of on-demand). When iOS backgrounds the app (~30s), it kills the WebSocket. The `rews` library tries 5 reconnections, all fail on mobile networks, then **permanently terminates** — `terminationSignal` is aborted forever. Every subsequent perps operation fails and logs to Sentry.

**Why iOS is 4x worse**: iOS kills background WS connections much more aggressively than Android.

**Why it spiked on 7.70.0**: Before #27103, WS was created on-demand when user opened perps. Now it's alive when the app backgrounds — and gets killed.

## Error Breakdown (3 days, 7.70.0)

| Error | Count |
|---|---|
| Failed to establish WebSocket connection | 95,466 |
| Unknown WS request: undefined | 10,616 |
| Unknown error [...getMarkets] | 9,411 |
| WebSocket connection closed | 7,580 |
| Unknown [...fetchHistoricalCandles] | 4,230 |
| Unknown [...subscribeToCandles] | 4,224 |
| Aborted | 2,772 |
| 429 Too Many Requests | 563 |

## Error Volume by Release (last 7 days)

| Release | Events |
|---|---|
| io.metamask.MetaMask@7.70.0+4130 (iOS) | 149,105 |
| io.metamask@7.70.0+4130 (Android) | 68,101 |
| io.metamask.MetaMask@7.71.0+4199 (iOS) | 6,746 |
| io.metamask@7.69.0+4015 (Android) | 5,164 |
| io.metamask.MetaMask@7.69.0+4015 (iOS) | 2,802 |

## Two Separate Problems

### Problem 1: Background WS death (95K errors — the big one)

**Chain**:
```
App startup -> always-on WS connects (#27103)
  -> User backgrounds app
    -> iOS kills WS after ~30s
      -> rews tries 5 reconnections (maxRetries: 5)
        -> All fail (cellular/unstable network, ~60s total)
          -> rews permanently terminates (terminationSignal aborted)
            -> transport.ready() rejects immediately
              -> "Failed to establish WebSocket connection" -> Sentry
```

**Key code paths**:
- `@nktkas/rews/esm/mod.js:113`: `if (++this._attempt > this.reconnectOptions.maxRetries)` -> permanent termination
- `@nktkas/rews/esm/mod.js:139`: `_cleanup()` -> `this._abortController.abort(error)` -> terminationSignal forever aborted
- `@nktkas/hyperliquid/esm/src/transport/websocket/mod.js:129`: `ready()` checks `combinedSignal.aborted` -> immediate reject
- `HyperLiquidClientService.ts:152`: `await this.#wsTransport.ready()` in `initialize()` -> catch -> Sentry (line 188)

**Why it's noise**: `PerpsAlwaysOnProvider` already handles reconnection on foreground return. Background WS failures are expected, not actionable.

**Reproduction**: Set `url: 'wss://localhost:1/ws'` in the `WebSocketTransport` constructor options -> navigate to perps -> exact same error fires.

### Problem 2: Rate limit exhaustion (cascade errors)

Rapid market switching creates too many WS subscriptions + REST calls -> HyperLiquid rate limits (429) -> server drops WS -> all pending operations fail -> N Sentry events per drop.

**Recipe validation**: `.task/28141/artifacts/recipe.json` — 28/28 steps pass with zero rate limit errors when fixes are active.

## What's Been Done on This Branch (`feature/metamask-metamask-mobile-28141`)

| Fix | Status | Impact |
|---|---|---|
| CandleStreamChannel 500ms debounce | Done | Prevents WS churn during rapid switching |
| AbortController on candleSnapshot REST | Done | Cancels in-flight REST on navigation away |
| Reduce initial candle fetch (500 -> 168) | Done | Lighter REST payload |
| Race guards in .then() handlers | Done | Prevents stale promise leaks |

## What Still Needs Doing

### P0: Stop the 95K noise errors

The fix belongs in `app/components/UI/Perps/adapters/mobileInfrastructure.ts` (lines 205-221) where the `logger` is created via `createMobileInfrastructure()`. Wrap the `Logger.error()` call with an `AppState.currentState !== 'active'` check. This is the single injection point — one change covers all perps Sentry logging across all services, no controller-layer changes needed.

**Why this location**: `mobileInfrastructure.ts` is the platform adapter that wires mobile-specific implementations into the controller. The logger is already a platform concern. Adding the AppState check here:
- Keeps controller code platform-agnostic (no `react-native` import in controllers)
- Covers ALL perps services automatically (HyperLiquidClientService, AggregatedPerpsProvider, etc.)
- Is a ~3-line change with zero regression risk for foreground behavior

### P1: Reduce remaining 429s

- `getUserFills` fires 2 REST calls per market detail mount (no cache/debounce)
- Candle subscriptions re-created on revisit even when cache is warm
- Each market detail mount triggers ~10 hooks creating multiple subscriptions

### P2: Error cascade deduplication

One connection drop still produces N Sentry events. The fix is not to suppress errors but to report the right thing once:
- Detect cascade (multiple errors from same transport within 1s)
- Emit one aggregated event with WS state context
- Suppress errors during intentional cleanup (`isUnsubscribed`, `isClearing`)

## Key Files

| File | Role |
|---|---|
| `app/components/UI/Perps/adapters/mobileInfrastructure.ts` | Logger injection site (P0 fix location) |
| `app/controllers/perps/services/HyperLiquidClientService.ts` | WS transport lifecycle, 6 Sentry log points |
| `app/components/UI/Perps/providers/PerpsAlwaysOnProvider.tsx` | App state listener, background disconnect/foreground reconnect |
| `app/components/UI/Perps/services/PerpsConnectionManager.ts` | Connection singleton, grace period, state monitoring |
| `app/controllers/perps/constants/hyperLiquidConfig.ts` | Transport config (maxRetries: 5, connectionTimeout: 10_000) |
| `node_modules/@nktkas/rews/esm/mod.js` | ReconnectingWebSocket — permanent termination logic |
| `node_modules/@nktkas/hyperliquid/esm/src/transport/websocket/mod.js` | `ready()` — rejects when terminationSignal aborted |
