# Homepage Balance Breakdown — Full Implementation Plan

> Based on: POC branch (40 files shipped), `docs/homepage-balance-breakdown-shadowbox-investigation.md`, and team task list.
>
> **Scope note:** DeFi is excluded from the first iteration. The POC `useDefiSlice` exists on the branch and the DeFi column renders, but no DeFi-specific hardening work is planned until a future iteration.

---

## 1. Landmines & Mitigations

### L1 — Hero total vs wallet header drift *(critical)*
**Problem:** `useBalanceBreakdown` sums all four slices; `AccountGroupBalance` uses `selectBalanceBySelectedAccountGroup` (tokens only). The hero inside the breakdown will show a larger number than the header above it on the same screen — guaranteed "numbers don't match" tickets within the first day.  
**Mitigation:** Make `AccountGroupBalance` consume `useBalanceBreakdown().hero.totalFiat` when the flag is on. Same source drives both numbers.  
**Owner ticket:** T-H1.

### L2 — USDC is treated as $1.00 (Predict) *(medium)*
**Problem:** Predict returns USDC amounts; `useFiatNormalizer` treats USDC as USD 1:1. During a depeg event, the breakdown overstates Predict balance.  
**Mitigation:** Keep the 1:1 assumption behind a constant `USDC_DEPEG_TOLERANCE` comment. Add a remote config hook for `usdc_rate_enabled` if the PM decides to fetch a real USDC rate later — the plumbing is one config check in `useFiatNormalizer`.

### L3 — Perps WS re-render frequency *(medium)*
**Problem:** `usePerpsLiveAccount` can fire up to 10 Hz on volatile pairs. `PERPS_HOMEPAGE_THROTTLE_MS = 1000` is applied in `usePerpsSlice`, but the throttle is per-subscriber — if multiple components inside the breakdown tree each call `usePerpsLiveAccount`, the throttle multiplies.  
**Mitigation:** Only `usePerpsSlice` should call `usePerpsLiveAccount`. No child component should call it independently. Currently holds — enforce by lint or component API design.

---

## 2. Product Decisions

Decisions marked **open** still need a PM answer before the linked ticket can start.

### Resolved

| # | Question | Decision |
|---|----------|---------|
| **PD-1** | Does the wallet header total reflect the full portfolio? | ✅ **Yes** — header = full portfolio. T-H1 implements this. |
| **PD-2** | Which Perps number in the slice total? | ✅ **`totalBalance` / equity (includes uPnL)** — implemented in POC. |
| **PD-3** | Which Predict number in the slice total? | ✅ **`availableBalance + Σ position.currentValue`** — implemented in POC. |
| **PD-4** | Predict active bets: cost-basis vs mark? | ✅ **Mark (`currentValue`)** — what the API returns today. |
| **PD-5** | Full screen or bottom sheet? | ✅ **Full screen** — stack navigation already in place. |

### Open

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| **PD-6** | How are geo-blocked / ineligible users shown? | (A) Row hidden entirely (B) Row greyed as "Not available in your region" (C) Row shown with $0 | Implemented as **B**; needs copy approval from PM |
| **PD-7** | USDC peg assumption for Predict balances? | (A) 1 USDC = $1.00 USD (B) Fetch live rate | **A for now** — flag for PM review |

---

## 3. Tickets + ETA

Sizing: **1 senior mobile dev** familiar with the controller architecture + **1 QA/E2E** resource.  
Calendar day estimates are from merge of POC to production-ready PR.  
Items marked **✅ Done in POC** are complete and tested.

---

### Phase 0 — POC (already shipped on branch)

The POC covers ~40 files and implements the full end-to-end feature flow:

**UI components:** `BreakdownDonutChart` (dim, segment gap), `BreakdownHeroValue` (count-up animation, `adjustsFontSizeToFit`), `BreakdownLegend` (animated enter/exit), `BreakdownListItem` (avatar, progress bar, delta, P&L %), `BreakdownDrilldownList` (skeleton + error states), `BreakdownActionFooter` (CTA buttons).

**Data hooks:** `useTokensSlice` (symbol grouping, top-N drilldown, 1d delta), `usePerpsSlice` (MtM positions, category grouping, session uPnL fallback), `usePredictSlice` (available balance + open positions by category), `useDefiSlice` (protocol grouping, poll on mount — not hardened in iteration 1), `useBalanceBreakdown` (central aggregator: theme colors, percentages, hero delta), `useFiatNormalizer` (USD/USDC → user currency).

**Integration:** Full navigation stack wired (`MainNavigator` → `BalanceBreakdownScreen`), feature-flagged tap-to-breakdown on `AccountGroupBalance`, theme-aware slice and donut colors from `useTheme()`, privacy mode masking on all hero and drilldown values, analytics events for open, slice tap, and drilldown CTA tap.

**Tests:** 51 unit tests across all hooks, utils, and the view; E2E smoke spec covering open, overview, drilldown, and CTA navigation.

---

### Phase 1 — Production readiness (target: 1-2 weeks)

#### Block 0 — POC code polish *(do first, unblocks everything)*

| # | Ticket | Scope | ETA |
|---|--------|-------|-----|
| **T-POLISH** | Full pass over all POC files: remove debug artefacts and `console.log`s, resolve inline `TODO`s, enforce strict TypeScript (no implicit `any`), normalise naming conventions, ensure no hardcoded test values remain, verify file/component organisation matches team standards | All `BalanceBreakdown/` files | 2 d |

#### Block A — Hero reconciliation

| # | Ticket | Scope | ETA |
|---|--------|-------|-----|
| **T-H1** | Wire `AccountGroupBalance` header to consume `useBalanceBreakdown().hero.totalFiat` when `homepageBalanceBreakdownEnabled` is on | `AccountGroupBalance.tsx`, `useBalanceBreakdown` | 1 d |
| **T-H2** | Update `AccountGroupBalanceChange` 1d delta on the header to use `useBalanceBreakdown().hero.delta` when breakdown enabled | `AccountGroupBalance.tsx` | 0.5 d |

#### Block B — UX polish

| # | Ticket | Scope | ETA |
|---|--------|-------|-----|
| **T-U3** | Add retry/error-state affordance on slice rows with `status='error'` — small inline error icon + pull-to-refresh copy update | `BreakdownLegend.tsx`, `BreakdownListItem.tsx` | 0.5 d |
| **T-U4** | `BreakdownActionFooter`: add navigation targets for Perps and Predict slices (currently only Tokens + DeFi have routes); confirm routes with PM | `BreakdownActionFooter.tsx`, `SLICE_NAV_CONFIG` | 0.5 d |
| **T-U5** | Confirm and QA privacy mode masking on `heroSupplementalPnlText`; ensure Analytics events don't leak raw values in privacy mode | `BreakdownHeroValue.tsx`, analytics events | 0.5 d |

#### Block C — Cleanup

| # | Ticket | Scope | ETA |
|---|--------|-------|-----|
| **T-TOKEN-2** | Verify `homepageSectionsV1Enabled` guard in `useTokensSlice` is still correct once flag is graduated; remove guard or rename selector | `useTokensSlice.ts` | 0.5 d |

#### Block D — Testing & analytics

| # | Ticket | Scope | ETA |
|---|--------|-------|-----|
| **T-QA1** | Expand E2E smoke spec: drilldown for Perps and Predict legend rows; CTA navigation for each; add geo-blocked fixture (Predict/Perps ineligible) | `balance-breakdown.spec.ts`, `BalanceBreakdownView.ts` POM, fixtures | 3 d |
| **T-QA2** | Unit tests: privacy-mode leakage guard on analytics events, USDC 1:1 conversion passthrough | `useBalanceBreakdown.test.ts`, slice hook tests | 0.5 d |
| **T-QA3** | Analytics: confirm `BALANCE_BREAKDOWN_SLICE_TAPPED` fires for donut-tap path; add `source: 'donut'` property | `BalanceBreakdownView.tsx` | 0.5 d |
| **T-QA4** | Reassure snapshot for `BalanceBreakdownView` with all four slices loading + drilldown switch | `tests/reassure/` | 0.5 d |

**Phase 1 total: ~10 working days (~2 calendar weeks).**

---

### Phase 2 — Production hardening

| # | Ticket | Scope | ETA |
|---|--------|-------|-----|
| **T-H4** | Graduate `homepageBalanceBreakdownEnabled` from remote flag to shipped; clean up flag selector and conditional branches | `featureFlagController/homepage/index.ts`, `AccountGroupBalance.tsx` | 1 d |
| **T-PERF2** | Audit `selectBalanceBySelectedAccountGroup` memoization in breakdown context; ensure `popularChainIds` ref is stable (mirror `AccountGroupBalance.tsx` `popularChainIdsKey` pattern) | `useTokensSlice.ts` | 0.5 d |
| **T-UNIFY1** | Migrate remaining callers of `useGetTotalFiatBalanceCrossChains` to `selectBalanceBySelectedAccountGroup` to kill dual-pipeline drift permanently | Cross-app, high coordination risk | 5 d |
| **T-PRIV1** | Unified privacy-mode contract: define a single `usePrivacyAwareFormat(value, currency)` hook used by all slices so masking behavior is consistent | New hook, replace per-component `getPrivacyMaskText` calls | 2 d |

**Phase 2 total: ~9 working days (~2 calendar weeks).**

---

## 4. Recommended Delivery Order

```
Week 1     T-POLISH (2d) — POC code polish, unblocks all other work
           T-H1 (1d), T-H2 (0.5d) — reconcile header
           T-U4 (0.5d) — action footer routes

Week 2     T-U3 (0.5d), T-U5 (0.5d) — UX polish
           T-TOKEN-2 (0.5d) — cleanup
           T-QA2 (0.5d), T-QA3 (0.5d) — fast unit/analytics tests
           T-QA4 (0.5d) — Reassure snapshot
           [QA runs T-QA1 in parallel across both weeks — 3d]
           → Feature-flag enabled for internal dogfood

Week 3–4   Phase 1 QA, bug bash, geo-blocked device testing
           → Phase 1 ships

Week 5–7   Phase 2:
           T-H4 (1d) → T-PERF2 (0.5d) → T-PRIV1 (2d) → T-UNIFY1 (5d)*
           (* high blast-radius — start cross-team coordination in Week 3)

Ongoing    Phase 3 picked up as capacity allows
```

---

## 5. Open Questions for Engineering

1. **T-UNIFY1 blast radius**: migrating `useGetTotalFiatBalanceCrossChains` callers touches screens outside the breakdown. Does this need a canary / A/B release, or a single coordinated PR with the assets team?
2. **DeFi iteration 2 scope**: once DeFi is back in scope, deferred items are: stale-data UX (`defi_stale` warning + "last updated Xm ago"), `useFocusEffect` re-poll on screen focus, event-driven invalidation on `transactionConfirmed`, DeFi selector shallow-equal memoization, receipt-token dedupe (`aToken`/`cToken` double-count between `TokensController` and `DeFiPositionsController`), and per-protocol icons in drilldown rows.
