# Autoresearch: assets-migration.ts derived-state selectors (MetaMask Mobile)

## Objective

Speed up the derived-state selector bodies in
`app/selectors/assets/assets-migration.ts` — the AssetsController-state
migration selectors that rebuild `accountsByChainId`, `allTokens`,
`allIgnoredTokens`, `tokenBalances`, multichain asset/balance maps, currency
rates, and `marketData` from raw engine state. They re-run on every relevant
state change (each balance/price/info update) and are hot in the Oct 22 2026
Hermes profile (profile run 39731720623, commit 9b830f28): ~266ms cumulative
self time across onboarding/Money-Home/Perps scenarios, concentrated in
`getTokensControllerAllIgnoredTokens` (:270), `getAccountTrackerControllerAccountsByChainId`
(:69, :120), `isStakedTokenAssetId` (:46-51), `getTokensControllerAllTokens`
(:97, :109), `getTokenBalancesControllerTokenBalances` (:302-319),
`getCurrencyRateControllerCurrencyRates` (:579),
`getTokenRatesControllerMarketData` (:641-656),
`getMultichainAssetsRatesControllerConversionRates` (:524), and
`parseBalanceWithDecimals` (:756-772).

Engine: Hermes CLI (`ios/Pods/hermes-engine/destroot/bin/hermes -O`), median of
3 process runs via `./.auto/measure.sh`.

## How the bench works

- `.auto/bench/original-module.js` — production file transpiled TS->JS at the
  baseline commit. FROZEN. This is the parity reference.
- `.auto/bench/candidate-module.js` — the experiment surface. Same code,
  edited freely. `measure.sh` reassembles `workload.js` (deps + original +
  candidate + fixtures) before every run.
- Parity: both implementations run over every fixture (main/small/empty) and
  the JSON of every selector output (key order included) must match, else
  `SELF_CHECK=FAIL` and measure.sh exits non-zero.
- `primary_ms` = wall time of one full selector suite over the `main` fixture
  (49 accounts, ~590 assets, 12 chains), averaged over 20 in-process
  iterations, median of 3 hermes processes. Baseline ~23.6ms.
- Per-selector secondary metrics `sel_*` show where the time is
  (baseline: tokenBalances 5.3ms, marketData 4.6ms, allTokens 4.45ms,
  currencyRates 3.8ms, accountsByChainId 3.4ms).
- Scaling sweep: write `.auto/bench/scale.json`
  `{"scale":0.5|1|2,"iters":20}` then run measure.sh; restore
  `{"scale":1,"iters":20}` afterwards. A keep must win at 0.5, 1 and 2.

## Known optimization directions (ideas, not requirements)

- `isStakedTokenAssetId` re-parses each assetId (`parseCaipAssetType`) and
  checksums the address even though every caller already parsed the id.
- `getTokensControllerAllIgnoredTokens` iterates ALL accounts for EVERY hidden
  asset; the EVM-account list can be derived once.
- `getTokensControllerAllTokens` / `getMultiChainAssetsControllerAccountsAssets`
  build `allAssets` via `Object.fromEntries([…new Set([…])]…)` — allocation
  heavy; plain loops produce identical output.
- `parseCaipAssetType` is regex-based and called 1-2x per asset per selector
  over the same recurring ids — a bounded cache changes no semantics.
- `getCurrencyRateControllerCurrencyRates` sorts every asset id with
  `localeCompare` only so native entries win per symbol.
- Beware aliasing: pushing the SAME array into multiple accounts is a behavior
  change (consumers may mutate); if avoiding per-account arrays, `slice()` them.

## How to Run

`./.auto/measure.sh` reassembles and runs the workload under Hermes, prints
`METRIC` lines, exits non-zero on crash or `SELF_CHECK=FAIL`.
`./.auto/checks.sh` runs the production jest suite (60 tests).

## Files in Scope

- `app/selectors/assets/assets-migration.ts` — the only production file that
  may change (and only on a keep, mirroring the winning candidate diff).
- `.auto/bench/candidate-module.js` — the experiment surface.
- Everything else under `.auto/` may be edited for tooling.

## Off Limits

- Any other production file.
- Tests, except adding coverage. Do not edit tests to force a pass.
- Exported behavior: selector outputs must stay identical (values AND key
  insertion order) for identical inputs, including thrown errors for invalid
  CAIP ids.
- The inlined dependency copies (`.auto/bench/lib/deps.js`) and the fixtures
  (`.auto/bench/lib/fixtures.js`) are frozen — they define parity.
- `@metamask/*` upstream packages — wins must land in this file.

## Constraints

- `.auto/checks.sh` must pass before a keep.
- No new runtime dependencies on the hot path.
- No Node-only APIs. This runs on Hermes (0.14.1 CLI: no `class` syntax; `?.`,
  `??=`, spread, BigInt, Map/Set are fine).
- Stop after 25 experiments or 3 hours.

## What's Been Tried

(run 0) Baseline: candidate identical to original. See `.auto/log.jsonl`.
