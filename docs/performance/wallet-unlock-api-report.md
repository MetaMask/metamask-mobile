# Wallet Unlock API Call Report

Source: HAR capture of the first ~10.5s after unlocking the wallet (122 requests total).

## Summary

Unlock doesn't trigger one coordinated flow — roughly 15 independent features each
bootstrap their own data the moment the wallet unlocks, regardless of which tab is
active. Several of these fire exact duplicate requests, and a few individual calls
are slow enough to matter on their own.

| Feature                                  | Host(s)                                                                    | Calls | Total time |
| ---------------------------------------- | -------------------------------------------------------------------------- | ----- | ---------- |
| Staking/Lending (Earn)                   | `staking.api.cx.metamask.io`                                               | 17    | 4653 ms    |
| Perps markets (Terminal)                 | `terminal.dev-api.cx.metamask.io`                                          | 3     | 4500 ms    |
| Perps candles/prices (HyperLiquid)       | `api.hyperliquid.xyz`                                                      | 11    | 3802 ms    |
| Money/Veda vault APY                     | `api.sevenseas.capital`                                                    | 1     | 2092 ms    |
| Metro dev image assets                   | `192.168.1.43:8081` (dev-only)                                             | 15    | 1278 ms    |
| User storage (prefs/addressbook/wallets) | `user-storage.api.cx.metamask.io`                                          | 6     | 1278 ms    |
| Predict (Polymarket)                     | `polymarket.com`, `gamma-api`, `data-api`                                  | 13    | 1367 ms    |
| Infura RPC                               | `mainnet/polygon/monad-mainnet.infura.io`                                  | 8     | 1891 ms    |
| Spot prices                              | `price.api.cx.metamask.io`                                                 | 3     | 900 ms     |
| Accounts API                             | `accounts.api.cx.metamask.io`                                              | 4     | 872 ms     |
| Rewards                                  | `rewards.uat-api.cx.metamask.io`                                           | 2     | 856 ms     |
| Remote config/flags                      | `client-config.api.cx.metamask.io`                                         | 2     | 692 ms     |
| On-ramp                                  | `on-ramp.dev-api`, `on-ramp-cache.uat-api`                                 | 7     | 575 ms     |
| Chomp (quests)                           | `chomp.api.cx.metamask.io`                                                 | 1     | 340 ms     |
| Notifications                            | `notification.api.cx.metamask.io`                                          | 1     | 331 ms     |
| Tokens/icons/misc                        | `tokens.api`, `token.api`, `static.cx`, GitHub, Contentful, Braze, Segment | ~20   | ~470 ms    |

## Issues, ranked

### 1. Exact duplicate calls (pure waste)

Same URL/body fired twice with no dedupe:

- **`terminal.dev-api.../v1/perpetuals`** — 3x, 1.2-1.6s each (~4.5s wasted).
  `PerpsAlwaysOnProvider`'s `marketData.prewarm()` and `prices.prewarm()` both call
  `TerminalMarketService.fetchMarkets()` with no in-flight promise lock.
  File: `app/components/UI/Perps/services/PerpsConnectionManager.ts:1443`
- **`rewards.../public/rewards/ois`** — 2x, 22ms apart, identical body.
  `RewardsController` reacts to both `KeyringController:unlock` and
  `AccountTreeController:selectedAccountGroupChange`, which fire almost together.
  File: `app/core/Engine/controllers/rewards-controller/RewardsController.ts:866`
- **`on-ramp-cache.../regions/networks`** — 2x, 4ms apart. `RampOrders` /
  `useFetchRampNetworks` has no dedupe (looks like a double-mount).
- **`staking.api...`** — 4 duplicate pairs (`lending/1/markets`,
  `pooled-staking/eligibility`, `pooled-staking/stakes/1`,
  `lending/positions/...`). `EarnController.init()` and account-group/network-change
  listeners overlap with no request coalescing.
- **`chainid.network/chains.json`** — 2x. Two independent fetchers:
  `app/components/hooks/useSafeChains.ts` (has a module-level cache) and
  `app/core/RPCMethods/networkChecker.util.ts` (separate axios call, no shared cache).

### 2. Slowest single calls (latency, not duplication)

- **`api.sevenseas.capital/performance/monad/...`** — 2.09s, single call, from
  `MoneyAccountBalanceService.getVaultApy`. Third-party, uncached, for a feature most
  users may never open.
- **`terminal.../v1/perpetuals`** — 1.2-1.6s each, x3 (also a dedupe bug, see above).
- **HyperLiquid candle snapshots** — up to 740ms per call, 11 calls in two ~1s-apart
  batches for the same coins, from `useHomepageSparklines` — the effect appears to
  re-run and re-fetch candles it just fetched.

### 3. Scope/eagerness problem (architectural)

There's no single "on-unlock bootstrap saga" — instead ~8 independent listeners each
do their own thing with no coordination: `RewardsController`, `CardController`,
`MoneyAccountUpgradeController`, `EarnController.init()`, `PerpsAlwaysOnProvider`,
`RampOrders` mount, etc. Features like Predict/Polymarket (13 calls), Perps
(14 calls, ~8.3s combined), Money/Veda (2s), and Chomp all fetch full data on unlock
even if the user never opens those tabs — likely because they render as always-on
Homepage sections rather than being gated behind screen focus/visibility.

### 4. Minor/noise

- 404s to `raw.githubusercontent.com/.../eip155:999/{ETH,BTC}.svg` — wasted calls for
  icons that don't exist, no local fallback check before hitting GitHub.
- Metro dev-server image re-fetches (`eth-logo-new.png` x8, `linea-mainnet-logo.png`
  x3) — dev-only artifact, but hints at unnecessary re-renders in whatever list
  renders those icons.

## Suggested investigation order

1. Perps `/v1/perpetuals` triple-call — single root cause, ~4.5s saved, one file
2. Rewards OIS duplicate POST — simple guard/debounce
3. `chainid.network` duplicate fetch — share one cache between the two call sites
4. On-ramp networks duplicate — dedupe/guard double-mount
5. Staking/lending duplicate GETs — needs request coalescing across `EarnController` listeners
6. HyperLiquid candle double-batch in `useHomepageSparklines`
7. Architectural question: should Perps/Predict/Money/Chomp fetch on unlock at all, or gate behind visibility/screen-focus?
