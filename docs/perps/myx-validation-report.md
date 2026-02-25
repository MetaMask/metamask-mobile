# MYX Provider Validation Report

**Date:** 2026-02-25
**Branch:** `fet/perps/myx-reads-write`
**Includes:** endTime fix, `sdk.` token prefix, always-on WS, Phase 2 try/catch

---

## Architecture Changes (This Session)

1. **Always-on WebSocket** — WS connects at `MYXClientService` construction time (matching HyperLiquid pattern). No more lazy `connectWebSocket()` from `subscribeToKline()`. Individual subscriptions (kline, tickers) subscribe/unsubscribe on the already-open socket.
2. **`sdk.` token prefix** — `getAccessToken` callback prepends `sdk.` to tokens before returning them to the SDK, working around the SDK's missing prefix for WS auth.
3. **Phase 2 resilience** — `subscribeToCandles` Phase 2 (WS) failure no longer erases REST data.
4. **Removed:** `connectWebSocket()`, `disconnectWebSocket()`, `#wsConnected` field. `disconnect()` calls `subscription.disconnect()` directly.

---

## Testnet (chainId 97, api-beta.myx.finance)

| Category  | Method                    | Result       | Data                                             |
| --------- | ------------------------- | ------------ | ------------------------------------------------ |
| Init      | Provider registered       | PASS         | `myx` in providers map                           |
| Init      | getMarkets()              | **FAIL**     | 0 markets returned                               |
| Prices    | getMarketDataWithPrices() | FAIL         | 0 tickers (no markets)                           |
| Candles   | subscribeToCandles()      | SKIP         | no markets to query                              |
| WS        | WebSocket connection      | PASS         | connected at init (always-on)                    |
| Auth      | isReadyToTrade()          | **UNTESTED** | returns `ready:true` but auth is never validated |
| Positions | getPositions()            | **UNTESTED** | returns `[]` — cannot distinguish auth state     |
| Orders    | getOrders()               | **UNTESTED** | returns `[]` — same                              |
| Account   | getAccountState()         | **UNTESTED** | returns all zeroes — same                        |

---

## Mainnet (chainId 56, api.myx.finance)

| Category        | Method                          | Result       | Data                                                               |
| --------------- | ------------------------------- | ------------ | ------------------------------------------------------------------ |
| Init            | Provider registered             | PASS         | `myx` in providers map                                             |
| Init            | getMarkets()                    | PASS\*       | 26 markets — but all junk (see below)                              |
| Prices          | getMarketDataWithPrices()       | **FAIL**     | 26 tickers, all prices `$0`                                        |
| Candles REST 1h | subscribeToCandles("MYX","1h")  | PASS         | 100 candles (endTime fix works)                                    |
| Candles REST 1h | subscribeToCandles("BTCB","1h") | **FAIL**     | 0 candles                                                          |
| Candles REST 1D | subscribeToCandles("BTCB","1D") | **FAIL**     | 0 candles                                                          |
| Candles REST 5m | subscribeToCandles("BTCB","5m") | **FAIL**     | 0 candles                                                          |
| Candles WS      | Sustained kline updates         | **PASS**     | 3 WS callbacks in 65s (always-on WS + `sdk.` prefix fix confirmed) |
| Prices WS       | Live ticker update              | **PASS**     | 2 callbacks received (WS fix confirmed)                            |
| Auth            | isReadyToTrade()                | **UNTESTED** | see below                                                          |
| Positions       | getPositions()                  | **UNTESTED** | see below                                                          |
| Orders          | getOrders()                     | **UNTESTED** | see below                                                          |
| Account         | getAccountState()               | **UNTESTED** | see below                                                          |

---

## What Actually Works

| Feature                  | Testnet          | Mainnet                        |
| ------------------------ | ---------------- | ------------------------------ |
| Provider registration    | Yes              | Yes                            |
| Market list              | No (0 markets)   | Partial (26 junk pools)        |
| Prices/tickers           | No               | No (all $0)                    |
| REST candles             | N/A              | MYX token only                 |
| WS connection            | Yes (always-on)  | Yes (always-on)                |
| WS candles               | N/A (no markets) | **Yes** — 3 callbacks in 65s   |
| WS prices                | N/A              | **Yes** — 2 callbacks received |
| Auth                     | Not validated    | Not validated                  |
| Positions/Orders/Account | Not validated    | Not validated                  |

---

## What Changed (Fixed)

| Issue                     | Before                                               | After                                      |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------ |
| WS `SOCKET_NOT_CONNECTED` | WS connected lazily in `subscribeToKline()`          | WS connects at construction (always-on)    |
| WS auth 9401 Unauthorized | SDK `subscription.auth()` missing `sdk.` prefix      | `getAccessToken` prepends `sdk.` prefix    |
| Phase 2 erases REST data  | WS failure in `subscribeToCandles` wiped candles     | try/catch preserves REST candles           |
| Public API surface        | `connectWebSocket()`/`disconnectWebSocket()` exposed | Removed — WS lifecycle internal to service |

---

## Why Auth is Untested

**We are NOT authenticated.** The results above that show `ready:true` / `[]` / zeroes are misleading:

1. **`myxClient.auth()` is synchronous** — stores signer + `getAccessToken` callback. No API call. Our code sets `#authenticated = true` immediately.
2. **No mainnet credentials exist.** `.js.env` has testnet-only creds. `firstNonEmpty` fallback passes testnet credentials to the mainnet SDK instance.
3. **MYX API returns empty data without erroring** — cannot distinguish "authenticated + empty" from "unauthenticated + default response".
4. **`sdk.` prefix workaround applied** — should fix WS auth once credentials are correct.

---

## Outstanding Issues

### 1. Mainnet markets are community/meme pools

26 markets returned, mostly junk (Chinese text, memes, duplicates). Not the BTC/ETH/SOL perpetuals needed.

**Root cause:** MYX Multi-Pool model — anyone can create pools. We fetch ALL pools unfiltered.

### 2. All prices are $0

Every ticker: `price: "$0"`, `volume: "$0.00"`. Either adapter mapping is broken (30-decimal format) or these pools have zero activity.

### 3. Testnet returns 0 markets

`api-beta.myx.finance` returns no pools.

### 4. `baseSymbol` missing on all markets

Returned shape missing `baseSymbol`, `symbol`, `quoteSymbol`.

### 5. Candles only work for MYX token

`subscribeToCandles("MYX", "1h")` → 100 candles. `subscribeToCandles("BTCB", "1h")` → 0 candles.

---

## Next Steps

1. ~~**Retest WS**~~ — **DONE** (2026-02-25): WS candles PASS (3 callbacks), WS prices PASS (2 callbacks). Always-on WS + `sdk.` prefix fix confirmed working.
2. **Validate auth** — Call token API directly or attempt a testnet order
3. **Market filtering** — Get curated pool list from MYX, or filter by volume > 0 / known symbols
4. **Price mapping** — Debug raw ticker response vs adapter (30-decimal conversion?)
5. **Mainnet credentials** — Get dedicated mainnet `appId`/`apiSecret` from MYX team
