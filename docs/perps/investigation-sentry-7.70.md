# Sentry 7.70 Perps Error Spike Investigation

**Date**: 2026-04-01
**Release under investigation**: `io.metamask@7.70.0+4130` / `io.metamask.MetaMask@7.70.0+4130`
**SDK version**: `@nktkas/hyperliquid@0.30.2` (unchanged since 7.66)
**Related PR**: #28141 / #28176 (rate limit exhaustion fix)

---

## Executive Summary

The Sentry dashboard ("Perps Health") shows a sharp spike in total perps errors. In the **last 7 days**, 7.70.0 accounts for **217K perps errors** (149K iOS + 68K Android). The dominant error is `"Failed to establish WebSocket connection"` — **95K events in 3 days alone**.

### Root Cause: Always-On WS + iOS Background Killing

PR #27103 ("always-on socket connection") in 7.70.0 creates WS connections at app startup instead of on-demand. When iOS backgrounds the app (~30s), it kills the WebSocket. The `@nktkas/rews` reconnecting library tries `maxRetries: 5` reconnections with `connectionTimeout: 10_000ms` each. If the network is unstable (cellular, low signal), all 5 fail in ~60 seconds, the rews instance **permanently terminates**, and every subsequent perps operation fails.

**Why iOS is 4x worse than Android**: iOS is far more aggressive about killing background WebSocket connections. Android keeps them alive longer.

**Why it spiked with 7.70.0**: Before #27103, the WS was created on-demand when the user opened perps. Now it's always-on, so it's alive when the app backgrounds — and gets killed.

### Error Volume (last 3 days, 7.70.0 only)

| Error | iOS | Android | Total |
|---|---|---|---|
| **Failed to establish WebSocket connection** | 76,166 | 19,300 | **95,466** |
| Unknown error [...getMarkets] | 7,132 | 2,279 | 9,411 |
| Unknown WS request: undefined | 4,263 | 6,353 | 10,616 |
| Unknown [...fetchHistoricalCandles] | 4,230 | — | 4,230 |
| Unknown [...subscribeToCandles] | 4,224 | — | 4,224 |
| WebSocket connection closed | 3,309 | 4,271 | 7,580 |
| Aborted | 1,148 | 1,624 | 2,772 |
| 429 Too Many Requests | 563 | — | 563 |

**Total: ~135K events in 3 days** from 7.70.0 alone.

### Error Volume by Release (last 7 days)

| Release | Events |
|---|---|
| io.metamask.MetaMask@7.70.0+4130 (iOS) | 149,105 |
| io.metamask@7.70.0+4130 (Android) | 68,101 |
| io.metamask.MetaMask@7.71.0+4199 (iOS) | 6,746 |
| io.metamask@7.69.0+4015 (Android) | 5,164 |
| io.metamask.MetaMask@7.69.0+4015 (iOS) | 2,802 |

---

## The Two Problems

### Problem 1: "Failed to establish WebSocket connection" (95K/3d)

**The #1 error.** This is NOT a server outage. It's a client-side reconnection failure.

**Chain**:
```
App startup → always-on WS connects (#27103)
    → User backgrounds app
        → iOS kills WS after ~30s
            → rews tries 5 reconnections (maxRetries: 5)
                → All fail (cellular/unstable network, ~60s total)
                    → rews permanently terminates (terminationSignal aborted)
                        → transport.ready() rejects immediately
                            → "Failed to establish WebSocket connection" → Sentry
```

**Key code paths**:
- `@nktkas/rews/esm/mod.js:113`: `if (++this._attempt > this.reconnectOptions.maxRetries)` → permanent termination
- `@nktkas/rews/esm/mod.js:139`: `_cleanup()` → `this._abortController.abort(error)` → terminationSignal forever aborted
- `@nktkas/hyperliquid/esm/src/transport/websocket/mod.js:129`: `ready()` checks `combinedSignal.aborted` → immediate reject
- `HyperLiquidClientService.ts:152`: `await this.#wsTransport.ready()` in `initialize()` → catch → Sentry (line 188)

**Why it's noise**: When the app is backgrounded and the network is flaky, WS connection failures are **expected**. They should not produce Sentry errors. The app will retry on foregrounding.

**Reproduction**: Set `url: 'wss://localhost:1/ws'` in the `WebSocketTransport` constructor options → navigate to perps → exact same error fires.

### Problem 2: Rate Limit Exhaustion (cascade errors)

**The original investigation target.** Rapid market switching creates too many WS subscriptions + REST calls → HyperLiquid rate limits (429) → if sustained, server drops the WS → all pending operations fail → N Sentry events per drop.

**Status of fixes on `feature/metamask-metamask-mobile-28141`**:

| Fix | Status | Impact |
|---|---|---|
| CandleStreamChannel 500ms debounce | Done | Prevents WS churn during rapid switching |
| AbortController on candleSnapshot REST | Done | Cancels in-flight REST on navigation away |
| Reduce initial candle fetch (500 → 168) | Done | Lighter REST payload |
| Race guards in .then() handlers | Done | Prevents stale promise leaks |

**Recipe validation**: 28/28 steps pass with zero rate limit errors when the fixes are active. However, the recipe can still occasionally fail because `getUserFills` (REST) and candle subscriptions for the last-visited market still consume rate limit budget.

---

## What Needs Fixing

### P0: Stop logging expected background failures to Sentry

The `initialize()` catch block at `HyperLiquidClientService.ts:188` logs every WS connection failure to Sentry. When the app is backgrounded or the network is temporarily unavailable, these are expected — not actionable errors.

**Approach**: Check app state (foreground/background) before logging. If backgrounded, suppress. If foregrounded and this is a retry, log at warning level, not error.

### P1: Reduce rate limit exhaustion further

The current debounce fixes help but don't eliminate 429s. Remaining sources:
- `getUserFills` fires on every market detail mount (2 REST calls each, no cache/debounce)
- Candle subscriptions re-created on revisit even when cache is warm
- Each market detail mount triggers ~10 hooks creating multiple subscriptions

### P2: Error cascade deduplication

One connection drop still produces N Sentry events. The fix is not to suppress errors but to report the right thing once:
- Detect cascade (multiple errors from same transport within 1s)
- Emit one aggregated event with WS state context
- Suppress errors during intentional cleanup (`isUnsubscribed`, `isClearing`)

---

## Reproduction

### "Failed to establish WebSocket connection" (reproduced locally)

In `HyperLiquidClientService.ts` `#createTransports()`, add `url: 'wss://localhost:1/ws'` to the `WebSocketTransport` constructor options. Navigate to perps. The exact Sentry error fires within seconds.

### Rate limit exhaustion (reproduced locally)

Recipe at `.task/28141/artifacts/recipe.json` — rapid switching between 8 markets. Without the branch fixes: 31 x `429 Too Many Requests`. With fixes: 0 errors (recipe passes 28/28).

---

## Release & Deployment Status

| Version | Contains rate limit fix? | Production status |
|---|---|---|
| **7.70.0+4130** | NO | **Active in app stores** — 217K perps errors/7d |
| **7.71.0+4199** | NO | RC/QA — 7K perps errors/7d (internal) |
| **7.69.0+4015** | NO | Previous release — 8K perps errors/7d |
| **#28141 branch** | YES (Layer 1) | In progress, not shipped |

---

## Proposed Actions

### Immediate
1. **Land #28141** with rate limit mitigation (already validated via recipe)
2. **Suppress background WS failures** — don't Sentry-log `"Failed to establish WebSocket connection"` when app is backgrounded
3. **Ship to production** via OTA or 7.72.0

### Short-term
4. **Cache/debounce `getUserFills`** — fires 2 REST calls per market detail mount
5. **Skip candle REST fetch on warm cache** — `connectNow()` still fetches even when cache has data

### Medium-term
6. **Increase rews maxRetries or add app-level retry-on-foreground** — 5 retries in 60s is too aggressive for mobile
7. **Error cascade deduplication** — 1 Sentry event per connection drop, not N
