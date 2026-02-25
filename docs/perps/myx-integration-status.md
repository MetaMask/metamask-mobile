# MYX Integration Status

**Date:** 2026-02-25
**Branch:** `fet/perps/myx-reads-write`

---

## Executive Summary

MYX provider is **integrated for public reads**. Markets, prices, candles (REST + WS), and price streams all work on both networks. Pools without ticker data are filtered out automatically.

| Metric              | Testnet         | Mainnet                             |
| ------------------- | --------------- | ----------------------------------- |
| Pools on API        | 2               | 27                                  |
| Active (with price) | 1 (KNY=$65,629) | 3 (WBTC=$65k, MYX=$0.40, WBNB=$602) |
| Candles             | Yes             | Yes                                 |
| WS streams          | Yes             | Yes                                 |
| Auth                | Unverified      | Unverified                          |
| Tests passed        | 10/14           | 10/14                               |

---

## Network Configuration

| Environment | Chain ID | Network          | REST API            | WebSocket                     |
| ----------- | -------- | ---------------- | ------------------- | ----------------------------- |
| Mainnet     | 56       | BNB Chain        | `api.myx.finance`   | `wss://oapi.myx.finance/ws`   |
| Testnet     | 421614   | Arbitrum Sepolia | `api-test.myx.cash` | `wss://oapi-test.myx.cash/ws` |

The SDK selects the API host based on `isTestnet` passed to `MyxClient`.

---

## Market Filtering

MYX uses a **Multi-Pool Model** — anyone can create pools. Most pools are inactive (no ticker data from the API).

`getMarketDataWithPrices()` in `MYXProvider.ts` filters out pools that have no ticker data, so only active pools with real prices are returned to the UI.

### Testnet

| Symbol | Price   | Candles | Chain              |
| ------ | ------- | ------- | ------------------ |
| KNY    | $65,629 | Yes     | Arb Sepolia 421614 |

1 filtered out (SGLT — paused, no data).

### Mainnet

| Symbol | Price   | Candles | Volume |
| ------ | ------- | ------- | ------ |
| WBTC   | $65,585 | —       | $0     |
| MYX    | $0.40   | Yes     | $50.34 |
| WBNB   | $602    | —       | $0     |

24 filtered out (community/meme tokens, dead duplicates).

---

## API Endpoints (verified curl commands)

### Mainnet (chainId 56)

```bash
# List all pools
curl -s 'https://api.myx.finance/openapi/gateway/scan/pools?chainId=56' \
  | python3 -m json.tool | head -60

# Tickers
MYX_POOL="0x4486a8e524308e9f426f0500bee2b0ac2c421a5d849836d4891f3cb17457e2ef"
curl -s "https://api.myx.finance/openapi/gateway/quote/candle/tickers?chainId=56&poolIds=${MYX_POOL}" \
  | python3 -m json.tool

# Candles (interval: 1=1m, 5=5m, 60=1h, 1440=1d)
ENDTIME=$(date +%s)
curl -s "https://api.myx.finance/openapi/gateway/quote/candles?chainId=56&poolId=${MYX_POOL}&interval=60&endTime=${ENDTIME}&limit=5" \
  | python3 -m json.tool
```

### Testnet (chainId 421614)

```bash
curl -s 'https://api-test.myx.cash/openapi/gateway/scan/pools?chainId=421614' \
  | python3 -m json.tool
```

---

## Active Pool IDs (Mainnet)

| Symbol | poolId                                                               |
| ------ | -------------------------------------------------------------------- |
| MYX    | `0x4486a8e524308e9f426f0500bee2b0ac2c421a5d849836d4891f3cb17457e2ef` |
| WBTC   | `0x082c5d94e37ef9d51d9475eb54f8e4a3765e8dd09c49213864f77652a9f51cf9` |
| WBNB   | `0x76593937ac0157ec106833688834765e57f2d8ad0a7bf35bb75334de4d589bc6` |

---

## Current Blockers

1. **Auth never validated** — `myxClient.auth()` is sync, empty results prove nothing.
2. **No mainnet credentials** — `.js.env` has testnet creds only.
3. **Limited active pools** — only 3 mainnet pools have data. May need curated list from MYX team.

---

## What We Need from MYX Team

1. **Curated pool list** — which `poolId`s to display, or confirmation that ticker-based filtering is sufficient.
2. **Testnet guidance** — current testnet has 1 active test token (KNY).
3. **Mainnet credentials** — dedicated `appId` / `apiSecret`.
4. **Auth validation endpoint** — API call that confirms auth status.
