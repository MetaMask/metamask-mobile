# MYX Provider Validation Report

**Date:** 2026-02-25
**Branch:** `fet/perps/myx-reads-write`
**Script:** `scripts/perps/agentic/validate-myx.sh`

---

## Testnet (chainId 421614, Arbitrum Sepolia → `api-test.myx.cash`)

| Category     | Test                     | Result     | Details                          |
| ------------ | ------------------------ | ---------- | -------------------------------- |
| Init         | Provider registered      | PASS       | `myx` in providers map           |
| Init         | Markets loaded           | PASS       | 2 pools, 1 with price data       |
| Init         | Markets have name        | PASS       |                                  |
| Prices       | Tickers with real prices | PASS       | KNY=$65,629                      |
| Candles REST | 1h historical            | PASS       | 101 candles                      |
| Candles REST | 1D historical            | PASS       | 101 candles                      |
| Candles REST | 5m historical            | PASS       | 101 candles                      |
| Candles WS   | Sustained kline updates  | PASS       | 3 WS callbacks                   |
| Prices WS    | Live ticker update       | PASS       | KNY `"65587.50"`                 |
| Auth         | isReadyToTrade           | UNVERIFIED | `auth()` is sync, proves nothing |
| Positions    | getPositions             | UNVERIFIED | 0 (auth not validated)           |
| Orders       | getOrders                | UNVERIFIED | 0 (auth not validated)           |
| Account      | getAccountState          | UNVERIFIED | all zeros (auth not validated)   |
| Ping         | Health check             | PASS       |                                  |

**Summary:** 10 passed, 0 failed, 0 skipped, 4 unverified

### Testnet Markets

2 pools on API, 1 returned after filtering (pools without ticker data are excluded):

| Symbol | Price   | Candles | Volume | Chain              |
| ------ | ------- | ------- | ------ | ------------------ |
| KNY    | $65,629 | Yes     | $0.53  | Arb Sepolia 421614 |

SGLT (Linea Sepolia 59141) is filtered out — paused pool, no ticker data.

---

## Mainnet (chainId 56, BNB Chain → `api.myx.finance`)

| Category     | Test                     | Result     | Details                            |
| ------------ | ------------------------ | ---------- | ---------------------------------- |
| Init         | Provider registered      | PASS       | `myx` in providers map             |
| Init         | Markets loaded           | PASS       | 27 pools, 3 with price data        |
| Init         | Markets have name        | PASS       |                                    |
| Prices       | Tickers with real prices | PASS       | WBTC=$65,585, MYX=$0.40, WBNB=$602 |
| Candles REST | 1h historical            | PASS       | 101 candles (MYX token)            |
| Candles REST | 1D historical            | PASS       | 101 candles (MYX token)            |
| Candles REST | 5m historical            | PASS       | 101 candles (MYX token)            |
| Candles WS   | Sustained kline updates  | PASS       | 3 WS callbacks                     |
| Prices WS    | Live ticker update       | PASS       | MYX `"0.4012..."`                  |
| Auth         | isReadyToTrade           | UNVERIFIED | `auth()` is sync, proves nothing   |
| Positions    | getPositions             | UNVERIFIED | 0 (auth not validated)             |
| Orders       | getOrders                | UNVERIFIED | 0 (auth not validated)             |
| Account      | getAccountState          | UNVERIFIED | all zeros (auth not validated)     |
| Ping         | Health check             | PASS       |                                    |

**Summary:** 10 passed, 0 failed, 0 skipped, 4 unverified

### Mainnet Markets

27 pools on API, 3 returned after filtering:

| Symbol | Price   | Candles | Volume |
| ------ | ------- | ------- | ------ |
| WBTC   | $65,585 | —       | $0     |
| MYX    | $0.40   | Yes     | $50.34 |
| WBNB   | $602    | —       | $0     |

24 pools filtered out — community/meme tokens with no ticker data. MYX uses a Multi-Pool Model where anyone can create pools; most are inactive.

---

## Testnet vs Mainnet Comparison

| Dimension             | Testnet       | Mainnet                         |
| --------------------- | ------------- | ------------------------------- |
| Pools on API          | 2             | 27                              |
| Active (with prices)  | 1             | 3                               |
| Prices                | KNY=$65,629   | WBTC=$65k, MYX=$0.40, WBNB=$602 |
| REST candles          | All intervals | All intervals                   |
| WS candles + prices   | Yes           | Yes                             |
| Auth/positions/orders | Unverified    | Unverified                      |
| Tests passed          | 10/14         | 10/14                           |

---

## Known Issues

1. **Most pools have no ticker data** — API only returns prices for active pools (1/2 testnet, 3/27 mainnet). `getMarketDataWithPrices()` filters these out.
2. **Auth never validated** — `myxClient.auth()` is sync (stores callbacks, no API call). Empty results prove nothing.
3. **No mainnet credentials** — `.js.env` has testnet creds only.

---

## Next Steps

1. **Validate auth** — call token API directly or attempt a testnet order.
2. **Mainnet credentials** — get dedicated `appId`/`apiSecret` from MYX team.
3. **Curated pool list** — get from MYX team which pools to show, or rely on the active-ticker filter.
