# Assets Team — Performance Issues & Fixes Guide

**Date:** June 4, 2026
**Sources:** Two independent Hermes sampling profiler traces (Token Details ~140s, Home screen ~26.5s)

This guide covers **only files and components owned by `@MetaMask/metamask-assets`** per CODEOWNERS. Cross-team dependencies are noted where Assets code is affected but the root fix lives elsewhere.

---

## Table of Contents

1. [Files & Components Affected](#1-files--components-affected)
2. [Issue 1: `formatPriceWithSubscriptNotation` called inline without memoization](#issue-1-formatpricewithsubscriptnotation-called-inline-without-memoization)
3. [Issue 2: `createStyles(colors)` recreated every render in TokenListItem](#issue-2-createstylecolors-recreated-every-render-in-tokenlistitem)
4. [Issue 3: `renderHeader()` recreates entire overview subtree on every render](#issue-3-renderheader-recreates-entire-overview-subtree-on-every-render)
5. [Issue 4: `TokenListItem` subscribes to full market-data maps](#issue-4-tokenlistitem-subscribes-to-full-market-data-maps)
6. [Issue 5: `selectAsset` always returns a new object reference](#issue-5-selectasset-always-returns-a-new-object-reference)
7. [Issue 6: `toFormattedAddress` called without memoization in useTokenBalance](#issue-6-toformattedaddress-called-without-memoization-in-usetokenbalance)
8. [Cross-Team Dependencies](#cross-team-dependencies)
9. [Priority Summary](#priority-summary)

---

## 1. Files & Components Affected

| File                                                                 | Component                     | Screen          | Profiler evidence                                                                         |
| -------------------------------------------------------------------- | ----------------------------- | --------------- | ----------------------------------------------------------------------------------------- |
| `app/components/UI/AssetOverview/Price/Price.advanced.tsx`           | `PriceAdvanced`               | Token Details   | 28 render samples, ~295ms; `formatPriceWithSubscriptNotation` at line 579 = 63% of TD CPU |
| `app/components/UI/Tokens/TokenList/TokenListItem/TokenListItem.tsx` | `TokenListItem`               | Home token list | Renders 5 rows on home; each subscribes to full market-data maps                          |
| `app/components/UI/TokenDetails/Views/TokenDetails.tsx`              | `TokenDetails`                | Token Details   | 29 render samples, ~305ms; `renderHeader()` rebuilds tree every render                    |
| `app/components/UI/TokenDetails/hooks/useTokenBalance.ts`            | `useTokenBalance`             | Token Details   | `toFormattedAddress` + `selectAsset` on every re-render                                   |
| `app/selectors/assets/assets-list.ts`                                | `selectAsset`, `assetToToken` | Both screens    | Returns new `TokenI` object on every call, defeating `React.memo`                         |
| `app/components/Views/Homepage/Sections/Tokens/TokensSection.tsx`    | `TokensSection`               | Home            | Parent of `TokenListItem` rows on home                                                    |

---

## Issue 1: `formatPriceWithSubscriptNotation` called inline without memoization

### Where

- **`Price.advanced.tsx` line 579** — Token Details price header
- **`TokenListItem.tsx` lines 756–759** — Home token list rows

### What's happening

`formatPriceWithSubscriptNotation(displayPrice, currentCurrency)` is called **directly inside JSX** on every render. There is no `useMemo` wrapping it, so even if the price hasn't changed (e.g. parent re-renders for an unrelated reason), the function runs again.

This function internally creates `new Intl.NumberFormat(...)` on every call (that's a Predict-team file — see [Cross-Team Dependencies](#cross-team-dependencies)), but even with a cached formatter, the formatting work itself is unnecessary when inputs are stable.

### Profiler evidence

- `formatPriceWithSubscriptNotation` = **99 render samples, ~1,042ms, active for 133s** of the 140s trace
- `PriceAdvanced` re-renders 28 times over 115s (driven by WebSocket bar updates, crosshair, state changes)
- On Home: 5 `TokenListItem` rows × frequent market-data dispatches

---

## Issue 2: `createStyles(colors)` recreated every render in TokenListItem

### Where

**`TokenListItem.tsx` line 170**

### What's happening

```typescript
const styles = createStyles(colors);
```

This creates a **new `StyleSheet` object on every render**. `TokenListItem` is already wrapped in `React.memo`, but the styles are recreated regardless because `createStyles` is called unconditionally inside the component body. This adds GC pressure (new objects allocated and discarded each render) across all 5 home rows.

### Profiler evidence

- `[GC Young Gen]` = **784 samples, ~8,256ms, 9.8% of total CPU** — continuous object allocation is a contributor
- `TokenListItem` renders frequently due to market-data selector subscriptions (see Issue 4)

---

## Issue 3: `renderHeader()` recreates entire overview subtree on every render

### Where

**`TokenDetails.tsx` lines 294–340** — defines `renderHeader()` as a plain function
**`TokenDetails.tsx` lines 359, 370** — passes `header={renderHeader()}` to `MultichainTransactionsView` / `Transactions`

### What's happening

`renderHeader()` is a function that returns a React element tree containing `<AssetOverviewContent>` and `<ActivityHeader>`. It's called inline as `header={renderHeader()}`, which means:

1. Every time `TokenDetails` re-renders (price update, chart state, tx loading, etc.), `renderHeader()` produces a **new React element tree**
2. The receiving component (`Transactions` / `MultichainTransactionsView`) sees a new `header` prop reference → re-renders
3. The entire `AssetOverviewContent` subtree is reconciled, even if none of its inputs changed

### Profiler evidence

- `TokenDetails` = **29 render samples, ~305ms over 104s**
- `AssetOverviewContent` = **16 samples, ~168ms**
- Every re-render of `TokenDetails` forces a full `AssetOverviewContent` + `ActivityHeader` reconciliation

---

## Issue 4: `TokenListItem` subscribes to full market-data maps

### Where

**`TokenListItem.tsx` lines 172–173:**

```typescript
const tokenMarketData = useSelector(selectTokenMarketData);
const currencyRates = useSelector(selectCurrencyRates);
```

### What's happening

Each `TokenListItem` independently subscribes to the **entire** `selectTokenMarketData` map and **entire** `selectCurrencyRates` map. When any token's market data updates (from background polling, WebSocket price feeds, etc.):

1. Redux dispatches the update
2. **Every** `TokenListItem` row runs its `useSelector` → gets a new reference (the map changed) → re-renders
3. Each re-render triggers `formatPriceWithSubscriptNotation`, `selectAsset`, style creation, etc.
4. On home: 5 rows × every market-data tick = 5 unnecessary re-renders for 4 tokens whose price didn't change

This is a classic N×M selector problem: N rows subscribing to a single global map where only 1 row's data changed.

### Profiler evidence

- `dispatch` = **901 samples, ~9,488ms, 11.2% of CPU**
- `checkForUpdates` = **639 samples, ~6,729ms** — Redux checking every subscriber
- `useSelector` = **159 samples, ~1,674ms**

---

## Issue 5: `selectAsset` always returns a new object reference

### Where

**`app/selectors/assets/assets-list.ts` lines 519–585** — `selectAsset` selector
**`app/selectors/assets/assets-list.ts` lines 591–639** — `assetToToken` helper

### What's happening

`selectAsset` is a `createSelector` (not `createDeepEqualSelector`). Its combiner calls `assetToToken()`, which **always allocates a new `TokenI` object literal** (line 596: `return { address: ..., balance: ..., ... }`).

This means:

1. Whenever `selectAssetsBySelectedAccountGroup` changes (any balance or rate update for any token), `selectAsset` re-runs for every `TokenListItem`
2. Each re-run returns a **new object reference** even if the token's actual data is identical
3. `React.memo` on `TokenListItem` compares `asset` by reference → always different → re-renders

There's already a TODO acknowledging this:

```
// Line 518:
// TODO BIP44 - Remove this selector and instead pass down the asset
// from the token list to the list item to avoid unnecessary re-renders
```

Also: `assetToToken` calls `formatWithThreshold` (lines 603–612, 614–622) which creates `Intl.NumberFormat` instances — more formatter construction on every selector run.

### Profiler evidence

- Part of the `checkForUpdates` / `useSelector` overhead (~8% CPU)
- `selectAsset` is called per row × every Redux dispatch that touches asset state

---

## Issue 6: `toFormattedAddress` called without memoization in useTokenBalance

### Where

**`app/components/UI/TokenDetails/hooks/useTokenBalance.ts` lines 52–57**

### What's happening

```typescript
const processedAsset = useSelector((state: RootState) =>
  selectAsset(state, {
    address: toFormattedAddress(token.address), // <-- runs every render
    chainId: token.chainId as Hex,
    isStaked: Boolean(token.isStaked),
  }),
);
```

`toFormattedAddress` performs EVM checksum computation (`toChecksumHexAddress` → `keccak256`) on every render. Since `token.address` doesn't change during the component's lifetime, this is pure waste.

Additionally, the inline selector function `(state) => selectAsset(state, { ... })` creates a **new function reference on every render**, which means React-Redux can't skip the selector call even when nothing changed.

---

## Cross-Team Dependencies

These issues affect Assets-owned screens but the root fix lives in another team's code:

| Issue                                                                                                      | Owner                                 | Impact on Assets                                              | What to ask for                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Intl.NumberFormat` constructor in `formatPriceWithSubscriptNotation` (`Predict/utils/format.ts` line 179) | **@MetaMask/predict**                 | 63% of Token Details CPU, every home token row                | One-line fix: replace `new Intl.NumberFormat(...)` with `getIntlNumberFormatter(...)` from `app/util/intl.ts`. Alternatively, ask to move this utility to a shared location since Assets is the primary consumer. |
| `BadgeWrapper` missing `React.memo` (`app/component-library/...BadgeWrapper.tsx`)                          | **@MetaMask/design-system-engineers** | Re-renders on every modal open on home screen                 | Add `React.memo()` wrapper                                                                                                                                                                                        |
| Perps WebSocket running on Home/Token Details                                                              | **@MetaMask/perps**                   | ~40% CPU on home screen from `HyperLiquidSubscriptionService` | Gate stream hooks with `useIsFocused()`                                                                                                                                                                           |
| `SecurityTrustEntryCard` missing `React.memo`                                                              | **Unowned**                           | ~53ms / 2.2% of Token Details CPU                             | Add `React.memo()` wrapper — Assets could own this fix                                                                                                                                                            |

---

## Priority Summary

| Priority | Issue                                                                   | Est. Impact                                            |
| -------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| **P1**   | #1 — `useMemo` for formatted price in `PriceAdvanced` + `TokenListItem` | Medium — skips redundant formatting on unchanged price |
| **P1**   | #2 — `useMemo` for `createStyles` in `TokenListItem`                    | Low — reduces GC                                       |
| **P1**   | #6 — Memoize `toFormattedAddress` in `useTokenBalance`                  | Low-Medium — eliminates keccak256 per render           |
| **P2**   | #3 — Memoize `renderHeader` in `TokenDetails`                           | ~hundreds ms class                                     |
| **P3**   | #4 — Narrow `TokenListItem` selectors                                   | ~3% Redux overhead                                     |
| **P3**   | #5 — Fix `selectAsset` / `assetToToken` new references                  | Defeats `React.memo` on all rows                       |
| —        | Cross-team: `Intl.NumberFormat` cache in Predict's `format.ts`          | **~1,232ms — single biggest win**                      |
| —        | Cross-team: `BadgeWrapper` `React.memo`                                 | Part of ~7% home re-render fix                         |
