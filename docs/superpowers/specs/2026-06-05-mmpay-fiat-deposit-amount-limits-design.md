# MM Pay Money-Account Fiat Deposit — Eligibility, Provider/Payment Resolution & Amount Validation

**Date:** 2026-06-05
**Status:** Approved design, pending implementation plan

## Problem

The Money Account "Deposit Funds" (fiat) flow has several dead-end / correctness
gaps:

1. **No amount validation.** The custom-amount screen (`custom-amount-info`) lets the
   user enter any fiat amount and proceed, with no check against the provider's buy
   limits. Out-of-range amounts fail later instead of being caught at input.
2. **Entry point isn't correctly eligibility-gated.** "Deposit Funds" is gated today by
   `isFiatDepositEnabled && rampRoutingDecision !== UNSUPPORTED` (MoneyAddMoneySheet.tsx:138-139).
   `rampRoutingDecision` is a **UB1/legacy** signal (see Key fact #8) — we should not
   depend on it under the UB2-only constraint. And it does **not** check whether a
   provider actually supports the *deposit asset* in the region, so users can still
   enter a flow that can't complete.
3. **Provider/payment resolution is fragile.** The flow relies on whatever provider
   `RampsBootstrap` happened to select globally (Transak, or `null` in non-Transak
   regions). In non-Transak regions with no order history, no provider is selected →
   no payment methods load → the flat flow can get stuck.
4. **Quote errors aren't surfaced.** When the fee quote fails (limit, provider, or
   network error), the error is swallowed in core rather than shown on the input
   screen the way UB2 does.

We want the Money Account fiat deposit to behave like UB2 (`BuildQuote`): an
eligibility-gated entry point, a resolved provider + payment method, client-side
limit validation **first**, a fee quote only when limits pass, and all quote errors
surfaced back to the input screen — with no dead ends.

## Goals

- **Eligibility gate:** show/enable "Deposit Funds" only when the deposit asset is
  buyable in the user's region; otherwise hide/disable it.
- **Robust provider + payment resolution:** on entering the flow, resolve the best
  provider for the asset and auto-select the best payment method, sourced without
  depending on or mutating global ramps selection state (UB2 must be unaffected), and
  without getting stuck loading.
- **Client-side limit validation first:** after the user stops typing, validate the
  amount against the provider's `provider.limits` *before* any quote. Show a localized
  min/max error and disable Continue when out of range.
- **Quote only when limits pass:** do not fetch the fee quote for an amount already
  known to be out of limits.
- **UB2-faithful error surfacing:** surface all quote error categories UB2 surfaces
  (network/fetch error, backend per-provider error, generic no-quotes, plus the client
  limit error) to the input screen, combined client-limit-first.
- **Reusable primitives:** build the Ramps-domain pieces generic so UB2 can adopt them
  in a fast-follow.
- Keep the MM Pay / confirmations layer ignorant of provider/region/reliability
  concepts — it consumes simple Ramps-domain hooks.

## Non-Goals

- Unifying UB2 (`BuildQuote`) onto these primitives now (see Future Work — fast-follow).
- Adding a new LaunchDarkly flag.
- Changing `determinePreferredProvider`'s existing cascade (we reuse it and only
  replace its `null` tail).
- Proactive "Min $X · Max $Y" hint before the user types (validation is on stop-typing;
  raw min/max are exposed by the hook for optional future display).

## UB2-flow code constraint

Use only UB2-flow code. The UB2 flow lives under `app/components/UI/Ramp/Views`,
`hooks`, `utils`, `queries` (the V2 RampsController + React Query layer). Do **not**
use the legacy `app/components/UI/Ramp/Aggregator/**` or `app/components/UI/Ramp/Deposit/**`
subtrees.

## Key facts established during design

1. **MM Pay fetches the ramps quote when there's an amount + payment method.** The TPC
   `QuoteRefresher` subscribes to `TransactionPayController:stateChange` and re-runs
   `refreshQuotes` on an interval whenever transaction-pay state exists. For fiat,
   `getFiatQuotes` calls `RampsController:getQuotes` to compute provider + relay fees →
   totals. The quote is driven by `fiatPayment.amountFiat` landing in TPC state, so the
   client controls when it fires by controlling when it commits the amount.
2. **`RampsController:getQuotes` returns `{ success, error }`** — the `error` array
   carries backend per-provider messages, including limit messages
   ("Minimum purchase is $X"). Core's `getFiatQuotes` currently **swallows** this
   (returns `[]`), so today it never reaches the client.
3. **Buy limits are static per (provider, currency, paymentMethod)** —
   `provider.limits.fiat[currency][paymentMethodId]` → `{ minAmount, maxAmount }`;
   **token-independent** (`getProviderBuyLimit`, providerLimits.ts:19).
4. **Payment-method ids are standardized slugs** (e.g. `bank_transfer`,
   `debit_credit_card`) used directly as keys across every provider's limits
   (providerLimits.test.ts:41; BuildQuote passes `selectedPaymentMethod.id` straight in).
   So a payment-method id is provider-agnostic.
5. **Payment methods are provider-scoped at fetch time** — the React Query is keyed by
   `providerId` and takes it as an explicit param
   (`rampsPaymentMethodsOptions({ regionCode, fiat, assetId, providerId })`,
   paymentMethods.ts:12,38). So payment methods can be fetched for a *computed* provider
   without touching global `providers.selected`.
6. **Providers list is region-scoped + reliability-sorted by the backend.** The query
   is keyed by `regionCode` → `getProviders(regionCode)` (regions-v2, "reliability
   sorting"); mobile does not re-sort, so order is preserved. A dedicated
   `getMostReliableProvider` endpoint also exists (crypto/fiat/payments filters, no
   amount) but is not required — the cached sorted list suffices.
7. **`providerSupportsAsset(provider, assetId)`** checks token support client-side
   (providerSupportsAsset.ts).
8. **`rampRoutingDecision` is a UB1/legacy util — do not use it.** It
   (`UnifiedRampRoutingType`, `setRampRoutingDecision`) lives in the legacy
   `app/reducers/fiatOrders/` state, and `useRampsSmartRouting` (which sets it) imports
   the legacy `@consensys/on-ramp-sdk`, references `FIAT_ORDER_PROVIDERS.AGGREGATOR`,
   and uses `useRampsUnifiedV1Enabled`. Per the UB2-only constraint we avoid it.
   **UB2-pure eligibility comes from the region-scoped providers list instead:** because
   `getProviders(regionCode)` returns only providers available in the user's region,
   `selectBestProviderForAsset(asset) != null` already means "region supported AND a
   provider sells this asset here." `userRegion` (`selectUserRegion`, RampsController) is
   UB2 state; if it's unset the providers query is disabled → empty → gate fails closed.
9. **Today's deposit gate = flag + UB1 `rampRoutingDecision`.** The option-rendering gate
   is `isFiatDepositEnabled && rampRoutingDecision !== UnifiedRampRoutingType.UNSUPPORTED`
   (MoneyAddMoneySheet.tsx:138-139), where `isFiatDepositEnabled` is the flag check
   (`enabledTransactionTypes.includes(moneyAccountDeposit)`). This work **replaces** the
   UB1 `rampRoutingDecision` leg with the UB2-pure provider-availability check (Key fact
   #8) and adds the per-asset dimension.
10. **UB2 uses BOTH limit mechanisms, client-first.** `BuildQuote` runs `useProviderLimits`
    (client-side `provider.limits`) → `amountLimitError` as the **primary** check that
    gates Continue, and falls back to the backend `providerQuoteError`
    (`quotesResponse.error[0].error`) only when the quote is empty. Combined:
    `inlineQuoteError = displayedAmountLimitError ?? providerQuoteError ?? null`, and
    `amountInputHasError = rampsError || quoteFetchError || inlineQuoteError || hasGenericNoQuotes`.
    Note: UB2's `useProviderLimits` does **not** pass `backendError` — UB2 surfaces the
    backend leg separately via `providerQuoteError`. The `getProviderLimitMessage` util
    *supports* a `backendError` param (structured `provider.limits` → backend-error
    fallback); our new `useRampsBuyLimits` uses that param to consolidate both legs in
    one place (a small, intentional improvement over UB2's split handling).
11. **The live keyboard alert template is `useInsufficientMoneyAccountBalanceAlert`**
    (a real pending-amount alert: invoked in `usePendingAmountAlerts`, registered in
    `useConfirmationAlerts`, keys listed in the `useTransactionCustomAmountAlerts` filter
    arrays). `AlertKeys.PerpsDepositMinimum` is an orphaned key with no emitter — do not
    model on it.

## Design

Built as generic Ramps-domain primitives plus money-account wiring, in four parts.
Each numbered part can be a separate PR.

### Part 0 — Shared Ramps-domain primitives (generic; UB2-adoptable)

- **`selectBestProviderForAsset({ providers, completedOrders, assetId })`** — new util,
  `app/components/UI/Ramp/utils/selectBestProviderForAsset.ts`. `providers` is the
  region-scoped, reliability-sorted list. Filters by `providerSupportsAsset`, then runs
  `determinePreferredProvider` **unchanged** (orders → Transak → null) scoped to the
  supporting subset, and replaces its `null` tail with the most-reliable supporting
  provider (`supporting[0]`). Returns the provider or `null` (only when nothing supports
  the asset).
- **`useRampsBuyLimits({ amount, paymentMethodId, backendError })`** — new hook,
  `app/components/UI/Ramp/hooks/useRampsBuyLimits.ts`. Resolves the provider (see Part 2
  for how it's supplied in the money-account flow), reads region currency, and returns
  `{ minAmount, maxAmount, amountLimitError, currency }` via the existing
  `getProviderBuyLimit` + `getProviderLimitMessage`. The `backendError` param is passed
  through to `getProviderLimitMessage` so the structured-limit → backend-error fallback
  happens in one place. **Read-only** — must not call `setSelectedProvider` or mutate
  `providers.selected` / `providerAutoSelected`.
- **Error combination** mirrors UB2: `inlineError = amountLimitError ?? quoteError`.
  Extract as a small shared helper so both flows combine identically.

### Part 1 — Eligibility gate (separate; entry point)

- **`canFiatDepositAsset({ assetId })`** — UB2-pure Ramps-domain predicate:
  feature flag enabled **AND** `selectBestProviderForAsset({ region-scoped providers,
  completedOrders, assetId }) != null`. The single provider-availability check covers
  both "region supported" and "asset buyable here" because the providers list is
  region-scoped (Key fact #8) — no separate region check needed.
- **Drops the UB1 `rampRoutingDecision` dependency** from the gate (per the UB2-only
  constraint). In `MoneyAddMoneySheet`, replace the
  `isFiatDepositEnabled && rampRoutingDecision !== UNSUPPORTED` condition (lines 138-139)
  with `canFiatDepositAsset`. The option is shown/enabled only when it's true; hidden or
  disabled otherwise. No dead-end entry.
- Fail-closed while loading: if `userRegion`/providers haven't resolved, the predicate is
  false (option hidden/disabled) until data is available, rather than showing an option
  that can't proceed.

### Part 2 — Money-account-scoped provider + payment resolution (no global mutation)

On entering the fiat deposit flow (asset known):
- Compute `selectBestProviderForAsset(assetId)` (read-only).
- Fetch **that provider's** payment methods via the parameterized query
  (`rampsPaymentMethodsOptions({ regionCode, fiat, assetId, providerId })`) — **not**
  via global `providers.selected`.
- Select the best eligible payment method (respecting the existing
  `maxDelayMinutesForPaymentMethods` rule) and write it to TPC
  `fiatPayment.selectedPaymentMethodId` via `updateFiatPayment`.
- This replaces the money-account fiat path's reliance on global `providers.selected`
  (currently in `useAutomaticTransactionPayToken`). It mutates only TPC `fiatPayment`
  state (this flow's own state), never global ramps selection — so UB2 is unaffected.
- Resolves the non-Transak-region dead end (a provider is chosen, so payment methods
  load) and keeps provider/payment/limits mutually consistent.

### Part 3 — Amount validation, quote gating, error surfacing (the input screen)

Order of operations after the user stops typing (debounced, via existing
`amountHumanDebounced`):

1. **Client-side limit validation first** — `useRampsBuyLimits({ amount, paymentMethodId })`
   over `provider.limits`. No network.
2. **If limits fail** — surface the localized min/max error on the input screen and
   disable Continue, and **do not commit `amountFiat` to TPC** → no quote is fetched for
   a known-invalid amount.
3. **If limits pass** — commit `amountFiat` to TPC → the quote refreshes (fees) → if the
   quote returns an error, surface it as the **fallback** leg.
4. **Combine errors UB2-style:** `inlineError = amountLimitError ?? quoteError`;
   `amountInputHasError` also accounts for fetch error, backend per-provider error, and
   generic no-quotes. Continue is enabled only when there's an amount, no limit error,
   the quote settled, and a usable quote exists (mirrors UB2's `canContinue`).

Alert wiring (disables Continue + shows inline error during keyboard entry), modeled
**exactly on `useInsufficientMoneyAccountBalanceAlert`**:
- New `AlertKeys.FiatBuyAmountLimit` in `constants/alerts.ts`.
- New `useFiatBuyLimitAlert` hook: takes `{ pendingAmount }`, sources `paymentMethodId`
  from `useTransactionPayFiatPayment()` and the deposit asset from transaction metadata,
  gates on fiat `moneyAccountDeposit` context, calls `useRampsBuyLimits`, returns a
  blocking `Alert[]` (`field: RowAlertKey.Amount`, `Severity.Danger`, `isBlocking: true`)
  carrying `amountLimitError` (and the quote-error fallback) when present.
- Wire it the way `useInsufficientMoneyAccountBalanceAlert` is wired: invoke in
  `usePendingAmountAlerts`, register in `useConfirmationAlerts`, and add the new key to
  the `PENDING_AMOUNT_ALERTS` / `KEYBOARD_ALERTS` / `ON_CHANGE_ALERTS` arrays in
  `useTransactionCustomAmountAlerts`. (Do **not** follow the orphaned `PerpsDepositMinimum`.)

### Core change required (for UB2-faithful quote-error surfacing)

**Why this must be a core change, not "route via the mobile `getQuotes`".** MM Pay
collects the **total fees in the controller**: `getFiatQuotes` combines the ramps quote
(provider/network fee) with the relay quote (relay + source/target network + MetaMask
fee) into the fee buckets and totals the UI renders (combineQuotes → calculateTotals).
The mobile `useHeadlessBuy().getQuotes` helper returns only the **raw ramps quote** — it
has no relay-combined total — so MM Pay cannot source its fees from it. The fee-bearing
quote therefore **must** go through the controller, which means quote errors must be
surfaced **from the controller path**.

`getFiatQuotes` (core, `@metamask/transaction-pay-controller`) **already calls
`RampsController:getQuotes` under the hood and already has the full `{ success, error }`
response in scope** — the same response (and error shape) UB2 reads directly. It simply
**discards** it: when `pickBestFiatQuote(quotes)` finds no match it throws a generic
error and the surrounding `catch` returns `[]`, dropping `quotes.error`. So nothing needs
to be newly fetched in core — the error is already there. The change is to **capture
`quotes.error` at that point instead of throwing it away** and **propagate** the
structured error
— distinguishing the ramps backend per-provider rejection (e.g. the limit message in
`quotes.error`), an empty no-quotes result, and a relay/fetch failure — into TPC state
(e.g. a `fiatPayment` quote-error field or on the quotes result), so the mobile input
screen can render the same error categories UB2 does and combine them client-limit-first.
This is part of core PR #8987.

**Reuse Shane's classification, not his code path.** PR #31079
(`fix/headless-buy-getquotes-surface-rejections`, already merged) added
`LIMIT_EXCEEDED` vs `QUOTE_FAILED` classification of provider rejections — but in
`useHeadlessBuy().getQuotes`, a helper the money-account fiat flow does **not** call
(it uses `startHeadlessBuy` with a pre-fetched quote, and its fees come from the
controller). So Shane's PR does **not** cover this flow's quote-error surfacing. Reuse
his classification *approach* (the limit-vs-rate regex / error shape) when the core
change surfaces the error so the messages classify consistently; do not attempt to route
MM Pay's fee quote through that helper.

## Quote-error parity with UB2

| UB2 (`BuildQuote`) | Source | Money-account equivalent |
|---|---|---|
| `amountLimitError` | client `provider.limits` | `useRampsBuyLimits` (Part 0/3) |
| `providerQuoteError` | `quotesResponse.error[0].error` | surfaced from core via the Core Change |
| `hasGenericNoQuotes` | empty quote, no provider error | derived from surfaced quote state |
| `quoteFetchError` | network error from quote call | surfaced from core via the Core Change |
| `inlineQuoteError = amountLimitError ?? providerQuoteError` | combination | shared error-combination helper (Part 0) |

## Data / UX flow

1. **Tap "Deposit Funds"** → `canFiatDepositAsset` gates the option. If eligible, enter
   flow; resolve provider + best payment method for the asset (Part 2).
2. **Amount screen renders**, keyboard up, `$0`, Continue disabled. No error.
3. **User types → stops (debounce)** → client-side limit check (Part 3 step 1).
4. **Out of range** → red amount + "Minimum/Maximum deposit is $X" + Continue disabled +
   **no quote**.
5. **In range** → commit amount → quote (fees) → on quote error, surface as fallback;
   Continue enabled when the quote is good.

## Assumptions to verify during implementation

- **A1:** `RampsController.getProviders(regionCode)` resolves to the reliability-sorted
  regions-v2 endpoint and order is preserved through the cached query.
- **A2:** `userRegion` (`regionCode`, `country.currency`) is populated by
  `GeolocationController` at Engine startup, independent of `RampsBootstrap`, in the UB2
  path.
- **A3:** `fiatPayment.selectedPaymentMethodId` matches the slug key shape used in
  `provider.limits.fiat[currency][paymentMethodId]`.
- **A4:** The deposit `assetId` available to the flow is in the CAIP form
  `providerSupportsAsset` / the payment-methods query expect.
- **A5:** Committing `amountFiat` to TPC is the sole trigger for the fiat quote (so
  gating the commit gates the quote). Confirm no other path triggers it for this flow.
- **A6:** The core `getFiatQuotes` error-propagation change lands in PR #8987 and exposes
  enough granularity for the parity table.

## Testing

- `selectBestProviderForAsset`: each cascade branch (previous order → Transak →
  reliability fallback → null), token-support filtering, reliability-order preservation.
- `useRampsBuyLimits`: below-min / above-max / in-range; null/undefined graceful when
  provider/region/limits missing; `backendError` fallback path; read-only (never calls
  `setSelectedProvider`).
- `canFiatDepositAsset`: true only when flag enabled **and** a supporting provider exists
  for the asset in the region (`selectBestProviderForAsset != null`); false when the flag
  is off, region/providers unresolved, or no provider supports the asset. Does not consult
  `rampRoutingDecision`.
- Part 2 resolution: payment methods fetched for the computed provider; best method
  written to TPC; non-Transak region resolves a provider (no dead end); no global
  selection mutation.
- Part 3: limit error blocks Continue and suppresses the quote; passing limits commits
  amount and allows the quote; quote-error categories surface and combine client-first;
  alert only active in fiat `moneyAccountDeposit` context.
- Reuse existing `getProviderBuyLimit` / `getProviderLimitMessage` / `providerSupportsAsset`
  tests; don't duplicate.

## Future work (out of scope, enabled by this design)

- **Unify UB2 (`BuildQuote`) onto the shared primitives** — adopt
  `selectBestProviderForAsset`, `useRampsBuyLimits` (replacing inline `useProviderLimits`),
  and the shared error-combination helper. Preserve the `providerAutoSelected` soft/firm
  semantics: when selection is *set* (UB2 path), map orders/Transak → firm
  (`autoSelected: false`) and the reliability fallback → soft (`autoSelected: true`).
  **This feature never sets the provider** (`useRampsBuyLimits` is read-only), so the flag
  is untouched here.

## Boundary summary

MM Pay passes primitives (`assetId`, `amount`, `paymentMethodId`) and consumes simple
Ramps-domain hooks; all provider discovery, region scoping, reliability ranking, Transak
defaulting, and limits lookup live behind those hooks. No global ramps state is mutated,
so UB2 is unaffected; the primitives are generic so UB2 can adopt them later.
