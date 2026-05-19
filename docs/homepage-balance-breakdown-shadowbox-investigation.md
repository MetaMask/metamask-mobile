# Homepage Balance Breakdown — Shadowbox Investigation

**TL;DR:** There is no aggregator. The four pipelines disagree on currency, scope (address vs AccountGroup), polling cadence (30s → 10min → WS), and even the loading-state contract. Naïvely summing them will produce a number that flickers, drifts vs the existing wallet header, and silently undercounts users with multi-EVM AccountGroups. The selectors the brief refers to (`selectAccountGroupBalance`, `selectAssetsDefiPositionsBalance`) don't exist in mobile — closest equivalents below.

## 1. Selector / pipeline map (actual names in repo)

| Domain | "Selector" you'd actually wire | Returns | Source | Cadence | Currency |
|--------|-------------------------------|---------|--------|---------|----------|
| **Liquid Tokens** | `selectBalanceBySelectedAccountGroup(popularChainIds)` — `app/selectors/assets/balances.ts:184` | `AccountGroupBalance.totalBalanceInUserCurrency` (number) | `calculateBalanceForAllWallets` in `@metamask/assets-controllers` (EVM token balances + multichain balances + token rates + currency rates) | TokenBalances 30s, TokenRates 30min, MultichainAssetsRates 180s, CurrencyRate 180s | User currency ✅ |
| **DeFi** | `selectDefiPositionsByEnabledNetworks` — `app/selectors/defiPositionsController.ts` | `Record<chainId, GroupedDeFiPositions>` with nested `aggregatedMarketValue` per protocol/chain | `DeFiPositionsController` REST → `defiadapters.api.cx.metamask.io/positions/{addr}` | 600,000ms (10 min) + on `transactionConfirmed` + on `selectedAccountGroupChange` | USD hardcoded in UI ⚠️ |
| **Perps — Available** | `usePerpsLiveAccount().account.availableBalance` (HL withdrawable) | string | HyperLiquid WS `webData2/3` via `PerpsStreamManager.account` | WS push, throttled (default 1s, homepage 5s) | USD ✅, converted via `selectConversionRateBySymbol(state, 'usd')` only inside unused `usePerpsPortfolioBalance` |
| **Perps — Equity (incl. uPnL)** | `usePerpsLiveAccount().account.totalBalance` (HL `accountValue`) | string | same WS | same | same |
| **Perps — uPnL only** | `usePerpsLiveAccount().account.unrealizedPnl` | string | same WS | same | same |
| **Predict — Available** | `usePredictBalance()` (React Query → `PolymarketProvider.getBalance` → on-chain `balanceOf` USDC on Polygon proxy) | number (USDC) | RPC | RQ `staleTime`: 10s, controller cache `validUntil`: now+1s | USDC hardcoded ⚠️ |
| **Predict — Active Bet Value** | does not exist — must derive Σ `position.currentValue` from `usePredictPositions()` | — | Polymarket Data API REST `/positions` | RQ `staleTime`: 5s, optimistic poll 2s while orders open | USDC |
| **Predict — uPnL** | dedicated REST `/upnl` via `useUnrealizedPnL` | `{cashUpnl, percentUpnl}` | Polymarket | RQ 10s | USDC |

Homepage already mounts all four sections (`app/components/Views/Homepage/Homepage.tsx:62-176`) plus `PerpsConnectionProvider`/`PerpsStreamProvider`, so the selector wiring exists at runtime — but no parent component reads them all.

## 2. Aggregation consistency: Total ≠ Tokens + DeFi + Perps + Predict

Even on a "well-behaved" account these four numbers will fail to reconcile. Concrete drift sources:

### A. Currency drift

- **Tokens:** user-selected fiat (EUR, GBP, …) via `CurrencyRateController`.
- **DeFi:** hardcoded `currency: 'USD'` in `DeFiPositionsListItem.tsx:160`.
- **Perps:** USD strings via `formatPerpsFiat`; only `usePerpsPortfolioBalance` does the USD→userCurrency multiply, and that hook is unused in production UI (grep shows tests only).
- **Predict:** USDC, no fiat conversion at all.

→ A naïve sum will compute userCurrency + USD + USD + USDC and call it a single fiat number. Off by FX rate to USD/USDC for non-USD users.

### B. Scope drift (address vs AccountGroup)

- **Tokens:** AccountGroup aware; sums all EVM and non-EVM accounts in the selected group via `calculateBalanceForAllWallets`.
- **DeFi:** keyed by a single EVM address (`selectedEvmAccount.address`).
- **Perps:** `getAccountsFromSelectedAccountGroup().find(isEvmAccountType)` — first EVM account only.
- **Predict:** same — `getEvmAccountFromSelectedAccountGroup()` returns first EVM match (`app/components/UI/Predict/utils/accounts.ts:14`).

→ Multi-EVM AccountGroups (Hardware + HD + Ledger in the same group) get tokens summed across all but DeFi/Perps/Predict computed against only one. Total will be lower than reality.

### C. Network scope drift

- `selectBalanceBySelectedAccountGroup(chainIds)` honors the user's enabled networks via `useNetworkEnablement`.
- `selectAccountGroupBalanceForEmptyState` (the one used by `useIsZeroBalanceAccount`, `TokensSection`, `useMusdConversionFlowData`) uses all configured mainnets.
- **DeFi:** `selectDefiPositionsByEnabledNetworks` again honors enabled networks; `selectDefiPositionsByChainIds` is explicit.
- **Perps:** protocol-bound (HyperLiquid on Arbitrum) — `chainId` is a non-question, but onboarding requires Arbitrum existence (`ensureArbitrumNetworkExists`).
- **Predict:** protocol-bound (Polygon).

→ Switching enabled networks moves Tokens + DeFi but not Perps/Predict; the breakdown will reorder weirdly.

### D. Loading-state semantics differ

- **Tokens:** no explicit loading flag; balance is always a number (zero before hydration).
- **DeFi:** `undefined`=loading, `null`=fetch error, `{}`=successful empty (`useDeFiPositionsForHomepage`).
- **Perps:** `selectPerpsInitializationState` enum + WS connection state + per-hook throttle.
- **Predict:** React Query `isLoading`/`isFetching`/`isError`.

→ A breakdown showing "$0" because DeFi=`null` silently is misleading vs "—" / skeleton.

### E. Polling cadence mismatch

- DeFi 10-min polling means a Total Balance can be stale by minutes after a deposit. There's no event-bus push from a successful Aave deposit into `DeFiPositionsController` other than `transactionConfirmed` (which only fires for confirmed wallet-originated txs — not external position changes).
- Perps WS pushes constantly; the homepage's 5s throttle still means the Total flashes ~12 times/min during volatile markets.
- Predict optimistic 2s polling kicks in only while there's an open order; otherwise uPnL/positions can be stale up to 10s.

### F. Double-count risk

- aTokens / cTokens / staking receipt tokens may appear in `TokensController.allTokens` **and** in `DeFiPositionsController` adapter output. There is no dedupe layer between them.
- Perps `totalBalance` **already embeds** `unrealizedPnl`. If a designer wants to show "Equity = X, of which Unrealized PnL = Y", that's fine; if they want to show both `availableBalance` **and** `unrealizedPnl` **and** `totalBalance` in a column, the math won't visually add up because position notional ≠ margin held.
- **mUSD:** `MusdAggregatedRow` uses token rates path (Liquid Tokens). If mUSD is also surfaced anywhere as a "Cash" or "Earn" position, it'll be counted twice.

### G. Ignored tokens silently included

`selectTokensStateForBalances` forces `allIgnoredTokens: {}` and `allDetectedTokens: {}` (`balances.ts:134-141`). The aggregated total includes tokens the user has hidden in the asset list. Already a bug today; will be visible once Total Balance becomes a hero number.

### H. Two parallel "totals" already in app

`useGetTotalFiatBalanceCrossChains` / `useSelectedAccountMultichainBalances` use a different path (BigNumber, AccountTracker-based) than `selectBalanceBySelectedAccountGroup` (`calculateBalanceForAllWallets`). Comparing the Shadowbox total to existing screens will surface penny-level drift constantly.

### I. `perpsBalances` 24h history is dead state

`PerpsControllerState.perpsBalances` and `accountValue1dAgo` are declared but never written anywhere in the controller (grep clean). `usePerpsPortfolioBalance` reads them and silently returns zeros for the historical leg. Don't trust the "vs yesterday" delta from this hook for the breakdown.

## 3. Performance impact on Homepage render cycle

Concrete things you're stacking on `Homepage.tsx`:

- `selectBalanceBySelectedAccountGroup(popularChainIds)` is a **factory selector** — every distinct array ref creates a new memoized instance. Wallet view mitigates with `popularChainIdsKey` + `useMemo` (`AccountGroupBalance.tsx:59`). The breakdown component must do the same or recompute the entire wallet aggregation on every parent render.
- The underlying `createSelector` in `balances.ts` uses default reference equality, not `createDeepEqualSelector`. `TokenBalancesController` updates every 30s rewrite `tokenBalances` deep — this currently fires recomputes even if no value changed.
- WS perps account pushes hit Redux on every fill/funding/PnL tick (~10 Hz on volatile pairs); the `throttleMs` is per-`usePerpsLiveAccount` subscriber, not global. A breakdown that subscribes once is fine; if it also mounts skeleton sub-components that each call `usePerpsLiveAccount`, you're multiplying subscriptions.
- React Query for Predict: balance + positions + uPnL = 3 queries × ≥5s interval; key is per-address. Mounting the breakdown on top of the existing `PredictionsSection` doubles the query subscribers (TanStack dedupes the network call but not the React subscription overhead).
- DeFi state object (`allDeFiPositions`) is large (per-address × per-chain × per-protocol). A `useSelector` returning it without an output equality check will rerender on any unrelated chain's update.

**Bottom line:** render cost itself is fine if you (a) memoize selector factories at consumer, (b) use `createDeepEqualSelector` or `useSelectorWithEquality(shallowEqual)` for the aggregator, (c) subscribe once at the breakdown component and pass props down. The real perf risk is the perps WS firing setState 10 Hz — bound it to ≥1s for the breakdown specifically.

## 4. Landmines + mitigations

| # | Landmine | Mitigation for Shadowbox prototype |
|---|----------|-------------------------------------|
| **L1** | Currencies don't match (user fiat / USD / USDC) | Convert everything to user currency via `CurrencyRateController` before sum. For USDC treat as 1.00 USD (with a feature flag to use real `selectConversionRateBySymbol(state, 'usdc')` when available). Expose a debug overlay showing each component in both raw and converted form. |
| **L2** | Multi-EVM-in-AccountGroup undercount for DeFi/Perps/Predict | Document the limit in Shadowbox (banner: "showing primary EVM account only"). Long-term: refactor selectors to iterate `getAccountsFromSelectedAccountGroup().filter(isEvmAccountType)` and sum. |
| **L3** | DeFi 10-min staleness | Trigger `_executePoll()` manually on Shadowbox mount + on `accountChange`/`transactionConfirmed`. Add visible "last updated Xs ago" tooltip behind a debug flag. |
| **L4** | Token/DeFi double-count for receipt tokens | Skip dedupe in v0; expose a "delta vs sum" debug line so QA can spot inflation. Long-term: maintain a denylist of receipt-token contracts in `DeFiPositionsController` and exclude them from `TokensController` aggregation, OR mark them `isProtocolReceipt` and skip in the Liquid math. |
| **L5** | Perps `totalBalance` vs `availableBalance` + uPnL confusion | Pick **ONE** convention and document it next to the selector. Recommendation: use `totalBalance` (equity) as "Perps balance" and surface `unrealizedPnl` separately as a delta-only signal. |
| **L6** | Predict "Active Bet Value" undefined | New helper: `selectPredictActiveBetValue` = sum(`positions.map(p => p.currentValue)`). Expose `usePredictActiveBetValue()` next to `usePredictBalance()`. |
| **L7** | Loading-state semantics inconsistent | Adapter layer: each domain's "result" wrapped as `{ status: 'loading'\|'ready'\|'error', value, lastUpdatedAt }`. Breakdown shows skeleton until all `status=ready` (or error fallbacks). |
| **L8** | `allIgnoredTokens: {}` silently includes hidden tokens | File the bug regardless. For Shadowbox, document that hero number will diverge from per-token rows that DO honor ignored. |
| **L9** | Two existing "total" code paths (`calculateBalanceForAllWallets` vs `useGetTotalFiatBalanceCrossChains`) | Pick `calculateBalanceForAllWallets` as canonical. Add a tracked deprecation issue for the legacy hook to avoid future regressions. |
| **L10** | Reselect factory selectors recreated each render | Memoize `popularChainIds` array ref with stable key (mirror `AccountGroupBalance` `popularChainIdsKey` pattern). |
| **L11** | WS-driven re-render storm from Perps | Wrap Perps subscription with explicit `throttleMs: 1000` (or higher) for breakdown consumer; gate aggregator `setState` behind `requestAnimationFrame` debounce. |
| **L12** | `perpsBalances` historical state dead | Don't display "vs yesterday" delta until that field is wired (or compute manually with a per-render snapshot stored in a separate slice). |
| **L13** | Eligibility/geoblock returns no data, not zero | Aggregator must treat "ineligible" as omit from sum with a footnote, not "0". Use `selectPerpsEligibility` and `PolymarketProvider.isEligible`. |
| **L14** | Persisted controller state shows stale balances on cold start before refresh | Mirror `AccountGroupBalance` 3s artificial loading state (`ACCOUNT_GROUP_BALANCE_FETCH_TIMEOUT`). Same race exists for all four. |
| **L15** | DeFi error = `null` collapses entire DeFi line | Aggregator should treat DeFi=`null` as "exclude with error icon", not "0". Show the rest of the breakdown intact. |
| **L16** | Network filter drift between header (`selectBalanceBySelectedAccountGroup`) and empty-state (`selectAccountGroupBalanceForEmptyState`) | Pick one for the breakdown. Recommend `selectBalanceBySelectedAccountGroup` (matches the wallet hero) so the breakdown reconciles to the existing header. |
| **L17** | Predict caches at 1s `validUntil`, optimistic 2s — visible jitter on PnL during trading | Display Predict numbers with a fixed 1-decimal precision and round; debounce update to ≥2s. |
| **L18** | Cross-domain refresh fan-out (`refresh()` in `Homepage.tsx:188` already awaits 11 refs) | Add the breakdown to that `Promise.allSettled` chain rather than driving a separate refresh. |

## 5. Product decisions you must force before implementation

- What is **"Total Balance"**? (A) Liquid only (current header) (B) Liquid + DeFi (passive) (C) Liquid + DeFi + Perps equity + Predict mark (D) C minus uPnL (cost-basis only) — **Recommend C**, with uPnL surfaced as a delta below.
- **Which Perps number?** `availableBalance`, `totalBalance` (equity, includes uPnL), or both as separate rows. **Recommend `totalBalance`** — matches Hyperliquid convention.
- **Which Predict number?** `availableBalance` only, or `availableBalance` + Σ `position.currentValue`. **Recommend the sum** (matches "what's mine in this product").
- **Currency for ineligible/geo-blocked users:** omit from breakdown vs show row with "Not available in your region".
- **Multi-EVM AccountGroup behavior (now):** show primary EVM only, primary + warning, or fail-open and aggregate all.
- **Hidden tokens (L8):** include or honor user's hide setting? If honor, fix `selectTokensStateForBalances` first.
- **Stale-data UX:** hide row, show last-good w/ timestamp, or show skeleton while refetching?
- **Privacy mode:** each domain handles `privacyMode` differently today. Define the masking contract for the breakdown.
- **Should breakdown reconcile to wallet header?** If yes, the header must move to the same selector set; if no, expect users to file "numbers don't match" tickets.
- **Cost-basis vs mark for active bets (Predict):** API returns `currentValue` (mark). Confirm this is what product wants — not `initialValue` (cost basis).
- **Currency unit for USDC:** treat as $1.00 (ignore depeg risk) or fetch real rate?
- **mUSD/Cash bucket:** is "Cash" its own row or rolled into Liquid? Today `MusdAggregatedRow` lives in Liquid path.

## 6. Tickets + ETAs

Sized assuming 1 senior mobile dev familiar with the controller architecture, calendar days from kickoff to PR-ready.

### Phase 1 — Shadowbox prototype (3 weeks total, can ship behind feature flag)

| # | Ticket | Files / scope | ETA |
|---|--------|-----------------|-----|
| **T1** | Add `selectPredictActiveBetValue` + `usePredictActiveBetValue` hook (sum `position.currentValue` for selected EVM) | new file `app/components/UI/Predict/hooks/usePredictActiveBetValue.ts` + selectors index | 1 d |
| **T2** | Add `usePerpsBreakdownBalance({throttleMs: 1000})` returning `{available, equity, unrealizedPnl, status}` from `usePerpsLiveAccount` + eligibility + initialization state | new file under `app/components/UI/Perps/hooks/` | 1 d |
| **T3** | Add `useDeFiBreakdownBalance` returning `{totalUsd, status, lastUpdatedAt}` summing `aggregatedMarketValue` over enabled networks; trigger `_executePoll()` on mount and on tx-confirmed | new file under `app/components/UI/DeFiPositions/hooks/` | 1 d |
| **T4** | Currency normalizer `useFiatNormalizer()`: takes `(amount, fromCurrency)` returns `(amount, userCurrency)` using `selectConversionRateBySymbol`; handles `usd`, `usdc` (depeg=ignore), already-user-currency passthrough | new util in `app/components/UI/HomepageBreakdown/utils/` | 1 d |
| **T5** | Aggregator hook `useHomepageBalanceBreakdown()` composing T1–T4 + `selectBalanceBySelectedAccountGroup(popularChainIds)`; returns `{ rows: [{key, label, valueFiat, status, error}], totalFiat, totalStatus, drift }` where `drift` is a debug field showing per-domain raw values | new file under `app/components/UI/HomepageBreakdown/` | 2 d |
| **T6** | Shadowbox UI component `<HomepageBalanceBreakdown />` using Box/Text/Skeleton from design system, with debug overlay (toggle via dev menu) showing per-row currency, source, last-updated, raw-vs-converted | new dir `app/components/UI/HomepageBreakdown/` + tests | 3 d |
| **T7** | Wire into `Homepage.tsx` behind new remote feature flag `homepageBalanceBreakdownEnabled` (default off); add Storybook | edit `Homepage.tsx`, add flag selector, default-flag entry | 1 d |
| **T8** | Unit tests covering: missing eligibility, DeFi=`null`, Predict `positions=undefined`, currency conversion, multi-EVM warning, ignored-token inclusion, Perps `totalBalance` already includes uPnL | tests | 2 d |
| **T9** | Integration test on Wallet view + dev menu toggle + screenshot baseline | E2E + Reassure baseline | 2 d |
| **T10** | Telemetry: emit `homepage_breakdown_rendered` with per-row status, conversion rates used, drift % vs existing header for QA monitoring | analytics events | 1 d |

**Phase 1 total:** ~15 working days (3 calendar weeks).

### Phase 2 — Production hardening (4 weeks)

| # | Ticket | ETA |
|---|--------|-----|
| **T11** | Fix `selectTokensStateForBalances` to honor `allIgnoredTokens` (L8). Coordinate with assets-controllers maintainers if behavior change needs an upstream PR | 3 d (coord risk +) |
| **T12** | Multi-EVM AccountGroup support for DeFi selectors: iterate group EVM addresses, sum `aggregatedMarketValue`. Mirror in Perps + Predict provider layer | 5 d |
| **T13** | Receipt-token denylist + dedupe pass between `TokensController` and `DeFiPositionsController` | 4 d |
| **T14** | Wire `perpsBalances` historical writes in `PerpsController` so `usePerpsPortfolioBalance` 24h delta works (or remove the dead state) | 3 d |
| **T15** | Convert balance selectors in `balances.ts` to `createDeepEqualSelector` for output stability; benchmark with Reassure | 2 d |
| **T16** | Reduce DeFi polling on stale (event-driven invalidation on bridge/swap/approve confirmations not just direct tx) | 3 d |
| **T17** | Unify `useGetTotalFiatBalanceCrossChains` callers onto `selectBalanceBySelectedAccountGroup` to kill the dual-pipeline drift | 5 d |
| **T18** | Privacy mode contract for breakdown (consistent masking across all 4 rows) | 1 d |

**Phase 2 total:** ~26 working days (5–6 calendar weeks).

### Phase 3 — Optional but recommended (concurrent)

| # | Ticket | ETA |
|---|--------|-----|
| **T19** | Move existing wallet header (`AccountGroupBalance`) to consume `useHomepageBalanceBreakdown().totalFiat` so header and breakdown are guaranteed-consistent | 2 d |
| **T20** | Bug bash + dogfood with EU/RO/DE accounts (geo-blocked Perps + Predict) | 3 d |
| **T21** | Performance: replace `useSelector(selectFoo)` patterns with `useSelectorMemo` where outputs are stable objects | 3 d |

**Speculative call (flagged):** I'd push hard on **T19** in Phase 1 actually — you don't want a Shadowbox where the hero in the breakdown disagrees with the hero on the same screen. Ship the breakdown driving both numbers from day one.
