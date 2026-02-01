# Perps Rate Limiting & HIP-3 Reconnection Incident - Postmortem

**Incident Period:** Jan 27 - Jan 31, 2026
**Affected Versions:** 7.62.0, 7.62.1, 7.63.0
**Impact:** Trade success rate dropped to 65% (from ~95%), Position close success rate dropped to 54%
**Root Cause:** WebSocket rate limiting due to excessive API calls
**Resolution:** Root cause **was already fixed in main** before the incident was identified. Hotfixed to 7.62.2, cherry-picked to 7.63.0.

---

## Executive Summary

In Dec 2025, we switched to WebSocket transport for better performance. However, HyperLiquid has strict rate limits (2000 msg/min), and several operations bypassed caching. Under heavy usage, this triggered rate limit errors.

**Key symptoms:**

- Orders fail with "Unknown error" messages
- HIP-3 assets (SILVER) fail more than crypto assets after network reconnection
- App restart fixes the issue

---

## Root Cause

Trading methods (`updatePositionTPSL`, `closePosition`, etc.) used `skipCache: true`, forcing fresh API calls on every operation instead of using cached WebSocket data. Under heavy usage, this exceeded HyperLiquid's rate limit.

---

## Why This Took Time to Diagnose

### Ongoing WebSocket Challenges Since HIP-3

WebSocket performance issues have been a recurring challenge since introducing HIP-3 support. Multiple symptoms were reported—slow price updates, order failures after network changes, inconsistent behavior between crypto and HIP-3 assets—but diagnosing the root cause was difficult without proper tooling.

### Debugging Blind: WebSocket Visibility Challenge

WebSocket debugging in React Native has been historically difficult:

- **Metro/Hermes limitation**: WebSocket traffic doesn't appear in the standard debugger
- **Log loss on reconnection**: When testing network reconnection scenarios (airplane mode → background → restore), bringing the app back to foreground loses all previous logs
- **Production-only visibility**: Issues only became visible after 7.62.0 was published to production

We made iterative fixes throughout December and January based on symptoms, but couldn't confirm root causes until this week.

### How We Finally Solved It

**1. MITM Proxy Interception (PR #25155)**

- Intercept all WebSocket frames between the app and HyperLiquid
- See exact message sequences during reconnection
- Debug without losing context when app goes to background
- See: [perps-websocket-monitoring.md](./perps-websocket-monitoring.md)

**2. In-App Debug Page**

- Redirects console logs to an in-app UI
- Allows viewing logs even when Metro is disconnected (airplane mode)
- Preserves log history across app background/foreground cycles

This infrastructure finally gave us the visibility needed to diagnose WebSocket issues. The fixes were already in main (from iterative work since Dec 2025), but we only confirmed the production issue and validated the fixes once we had proper WebSocket observability this week.

---

## Resolution Status

| Branch            | Status                                 |
| ----------------- | -------------------------------------- |
| **main / 7.64.0** | All fixes included                     |
| **7.63.0**        | Needs cherry-pick of #25472 and #25022 |
| **7.62.2**        | Rate limit fixes included, rolling out |

---

## Fixes Applied

1. **WebSocket Reconnection** (#25022) - Added reconnection detection and user notification
2. **Cache-First Pattern** (#25234, #25438) - Trading methods now use cached data instead of forcing API calls

---

## Defensive Improvement: `spotMeta` Caching (#25490)

HIP-3 orders call `spotMeta()` to check collateral type. This call is currently **not cached**, adding an extra API call per HIP-3 order.

While not the root cause of this incident, caching `spotMeta` is a defensive improvement that:

- Reduces unnecessary API calls
- Prevents potential rate limiting during heavy HIP-3 trading
- Improves resilience after network reconnection

**Status:** Being revisited to cache `spotMeta` in `ensureReadyForTrading()` for consistency with other cached metadata.

---

## Sentry Errors

### METAMASK-MOBILE-5DKA / METAMASK-MOBILE-5DC2

These errors show as `undefined` in Sentry with no useful context.

**Root cause:** The HyperLiquid SDK rejects promises with `undefined` when an AbortSignal fires without an explicit reason set. Our error handler converts this to `Error("undefined")`.

**Key insight:** These errors only appear on **7.62.x** versions, **not on 7.64.0 (main)**. This confirms they are symptoms of the rate limiting issue that was already fixed in main, not a separate bug.

| Issue | First Seen | Affected Versions      | On 7.64? |
| ----- | ---------- | ---------------------- | -------- |
| 5DKA  | Jan 29     | 7.62.0, 7.62.1         | No       |
| 5DC2  | Jan 26     | 7.62.0, 7.62.1, 7.62.2 | No       |

---

## Timeline

| Date      | Event                                                                |
| --------- | -------------------------------------------------------------------- |
| Dec 2025  | Switched to WebSocket transport, began iterative fixes               |
| Jan 26    | Reconnection fix merged to main                                      |
| Jan 27    | 7.62.0 released, issues reported                                     |
| Jan 29-30 | Rate limit fixes merged to main                                      |
| Jan 30    | Incident identified, 65% success rate                                |
| Jan 31    | HIP-3 specific issue identified, MITM debugging confirmed root cause |
| Feb 1     | 7.62.2 rolling out with fixes                                        |

---

## Lessons Learned

1. **Prefer aggressive caching** - The original tradeoff was to fetch fresh data before orders to ensure accuracy, but rate limits make aggressive caching the better approach. Trust cached WebSocket data for trading operations.
2. **Test network recovery** - Airplane mode → background → restore is a critical path
3. **WebSocket debugging needs tooling** - Standard React Native debugging is insufficient for WebSocket issues
4. **MITM interception is essential** - Implement early for any WebSocket-heavy feature

---

## Technical Details

For implementation details and code references, see:
**[Technical Deep Dive](./perps-reconnection-technical-deep-dive.md)**
