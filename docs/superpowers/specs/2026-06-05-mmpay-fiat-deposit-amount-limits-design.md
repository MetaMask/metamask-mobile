# MM Pay Money-Account Fiat Deposit — Eligibility, Provider/Payment Resolution & Amount Validation

**Date:** 2026-06-05
**Status:** Approved design, pending implementation plan

## Problem

The Money Account "Deposit Funds" (fiat) flow has several dead-end / correctness gaps:

1. **No amount validation.** `custom-amount-info` lets the user enter any fiat amount and
   proceed, with no check against the provider's buy limits.
2. **Entry point isn't correctly eligibility-gated.** "Deposit Funds" is gated by
   `isFiatDepositEnabled && rampRoutingDecision !== UNSUPPORTED` (MoneyAddMoneySheet.tsx:138-139).
   `rampRoutingDecision` is a UB1/legacy signal (Key fact #8), and the gate never checks
   whether a provider actually supports the *deposit asset* in the region.
3. **Provider/quote selection is hardcoded and scattered.** The fee quote path
   (`getFiatQuotes` → `RampsController:getQuotes` → `pickBestFiatQuote`) hardcodes
   `/providers/transak-native-staging`, and provider auto-selection lives in mobile
   (`determinePreferredProvider` + `RampsBootstrap`) which is fragile (null in
   non-Transak regions, depends on a temporary bootstrap).
4. **Quote errors aren't surfaced.** `getFiatQuotes` swallows the ramps quote error.

We want the flow to behave like UB2: an eligibility-gated entry, a resolved
provider + payment method, client-side limit validation **first**, a fee quote only when
limits pass, and all quote errors surfaced to the input screen — with no dead ends. The
provider/quote-selection logic is centralized in `RampsController` so both this flow and
UB2 (later) share one implementation.

## Goals

- **Eligibility gate:** show/enable "Deposit Funds" only when the deposit asset is buyable
  in the user's region.
- **Centralized, asset-aware best-provider/best-quote selection in `RampsController`**,
  using its persisted `orders` + reliability-sorted `providers`. No mobile re-implementation,
  no global selection mutation.
- **Client-side limit validation first:** after the user stops typing, validate against the
  provider's `provider.limits` before any quote; show a localized min/max error and disable
  Continue when out of range.
- **Quote only when limits pass.**
- **UB2-faithful error surfacing:** surface the quote error categories UB2 surfaces, combined
  client-limit-first.
- **Reusable for UB2:** the controller methods are the seam UB2 adopts in a fast-follow.
- Keep the MM Pay / confirmations layer ignorant of provider/region/reliability concepts.

## Non-Goals

- Migrating UB2 (`BuildQuote`) onto the new controller methods now (Future Work — fast-follow).
- A new LaunchDarkly flag.
- Proactive "Min · Max" hint before typing (validation is on stop-typing).

## UB2-flow code constraint

Use only UB2-flow code: `app/components/UI/Ramp/Views|hooks|utils|queries` (the V2
RampsController + React Query layer) and the `@metamask/ramps-controller` /
`@metamask/transaction-pay-controller` packages. Do **not** use the legacy
`app/components/UI/Ramp/Aggregator/**` or `Deposit/**` subtrees, the `fiatOrders` reducer,
`@consensys/on-ramp-sdk`, `useRampsSmartRouting`, or `rampRoutingDecision`.

## Key facts established during design

1. **MM Pay fetches the ramps quote when there's an amount + payment method.** The TPC
   `QuoteRefresher` subscribes to `TransactionPayController:stateChange` and re-runs
   `refreshQuotes`; for fiat, `getFiatQuotes` calls the ramps quote path to compute
   provider + relay fees → totals. Driven by `fiatPayment.amountFiat` landing in TPC
   state, so the client controls when it fires.
2. **The ramps quote response is `{ success, error }`**; `error` carries backend
   per-provider messages incl. limit messages. `getFiatQuotes` currently swallows it.
3. **Buy limits are static per (provider, currency, paymentMethod)** —
   `provider.limits.fiat[currency][paymentMethodId]` → `{ minAmount, maxAmount }`,
   token-independent (`getProviderBuyLimit`).
4. **Payment-method ids are standardized slugs** (`bank_transfer`, …) used as limit keys
   across all providers (provider-agnostic).
5. **Payment methods are provider-scoped** and the query takes an explicit `providerId`
   (`rampsPaymentMethodsOptions`), so they can be fetched for a chosen provider without
   touching global `providers.selected`.
6. **`RampsController` is the authority for V2 data and holds everything the cascade
   needs in persisted state:** `providers` (region-scoped, **reliability-sorted** by the
   backend; mobile preserves order) and `orders: RampsOrder[]` (`persist: true`,
   RampsController.ts:267,323 — "the controller is the authority for V2 orders … and
   persists them"). Reliability signals available **in code**: `providers.data` is backend
   reliability-sorted (order preserved), and quotes carry a `reliability` score and
   `isMostReliable`/`isBestRate` tags (`RampsService.ts:289,299-301`). (A backend
   `getMostReliableProvider` endpoint exists but is **not** wrapped in core/mobile — do
   not rely on it; use the sorted `providers.data` + quote tags.) So best-provider/
   best-quote can be computed **inside the controller** from its own state.
7. **`providerSupportsAsset(provider, assetId)`** checks token support.
8. **`rampRoutingDecision` is UB1/legacy — do not use it.** It lives in `fiatOrders`,
   set by `useRampsSmartRouting` (which imports `@consensys/on-ramp-sdk`, references
   `FIAT_ORDER_PROVIDERS.AGGREGATOR`, `useRampsUnifiedV1Enabled`). UB2-pure eligibility
   comes from the region-scoped providers list instead.
9. **Today's deposit gate** = flag + UB1 `rampRoutingDecision !== UNSUPPORTED`
   (MoneyAddMoneySheet.tsx:138-139). This work replaces the `rampRoutingDecision` leg.
10. **UB2 uses BOTH limit mechanisms, client-first.** `BuildQuote`'s `useProviderLimits`
    (client `provider.limits`) → `amountLimitError` is primary and gates Continue;
    `providerQuoteError` (`quotesResponse.error[0].error`) is the fallback;
    `inlineQuoteError = amountLimitError ?? providerQuoteError`. `getProviderLimitMessage`
    has a `backendError` param for the structured→backend fallback.
11. **Live keyboard alert template = `useInsufficientMoneyAccountBalanceAlert`** (real
    pending-amount alert; in `usePendingAmountAlerts` + `useConfirmationAlerts` + the
    `useTransactionCustomAmountAlerts` filter arrays). `PerpsDepositMinimum` is orphaned —
    do not model on it.
12. **Asset is the key to avoiding a null provider.** The cascade filters by
    `providerSupportsAsset`, so it returns null only when no provider supports the asset.
    Both flows know the asset before they need a provider: money account at deposit init;
    UB2 after the token-selection screen. So the controller methods are only called with a
    known asset.

## Design

The best-provider cascade and best-quote pick move **into `RampsController`** (core),
additive (existing `setSelectedProvider` / `determinePreferredProvider` / `getQuotes`
untouched). Mobile and `getFiatQuotes` delegate to them. Four implementable parts.

### State management & multi-consumer safety (guardrail)

`RampsController` is shared by multiple flows (UB2 buy, money-account deposit, …). Its
state splits into two kinds, and the distinction is load-bearing:

- **Shared DATA — safe to read from any flow:** `providers.data` (region-scoped,
  reliability-sorted), `orders` (persisted), `userRegion`. Region/account-scoped, not
  flow-specific.
- **Shared SELECTION — single-valued, UB2-owned, do NOT multi-write:** `providers.selected`,
  `tokens.selected`, `paymentMethods.selected`, `providerAutoSelected`. There is exactly
  one slot each; they represent UB2's interactive selection. Writing them from another flow
  corrupts UB2's state.

Rules this design follows:
1. **The new methods are PURE queries.** `getBestProviderForAsset` / `getBestQuote` read
   only DATA (`providers.data` + `orders`) and **return** a result. They MUST NOT mutate
   any `.selected` slot or `providerAutoSelected`, and MUST take `assetId` **explicitly**
   (never fall back to `tokens.selected`, which `getQuotes` does at RampsController.ts:1635).
   This makes them safe for concurrent consumers.
2. **Money account never writes ramps SELECTION state.** Its per-flow choice (selected
   payment method) lives in **TPC `fiatPayment`** state (per-transaction, isolated).
3. **No change to the single-selection model.** It stays UB2-only; new consumers use pure
   queries + their own state. When UB2 later adopts these methods, it may still drive its
   `.selected` slots from the query *results* — but the queries themselves never mutate them.

### Part 0 — New `RampsController` methods (the single source of truth)

- **`RampsController.getBestProviderForAsset(assetId)`** → `Provider | null`. Computes the
  cascade from the controller's own state: most-recent **completed** `RampsOrder`'s
  provider (previously-used) → **Transak** default → most-reliable supporting provider
  (reliability-sorted `providers`) → null; all filtered by `providerSupportsAsset` +
  region (providers are region-scoped). Exposed as `RampsController:getBestProviderForAsset`.
  This is the one place provider selection lives.
- **`RampsController.getBestQuote({ assetId, amount, paymentMethods, walletAddress, … })`**
  → the single best ramps quote (or its error). Internally fetches quotes and selects the
  best provider's quote via the same cascade (`getBestProviderForAsset`). Replaces the
  hardcoded `pickBestFiatQuote`. Exposed as `RampsController:getBestQuote`. Callers
  (`getFiatQuotes`, and UB2 later) never deal with provider ids — they ask for the best
  quote and get it.
- Both require `assetId` (Key fact #12) so they never return a spurious null, **and so
  they never read the shared `tokens.selected` slot** (see State management guardrail).
- Both are **pure/read-only** w.r.t. selection state — they compute from `providers.data`
  + `orders` and return; no `.selected` / `providerAutoSelected` mutation.

Mobile-side consumers (all delegate; no provider logic in mobile):
- **`useRampsBuyLimits({ amount, paymentMethodId })`** — calls
  `RampsController:getBestProviderForAsset(assetId)` for the provider, then existing
  `getProviderBuyLimit` + `getProviderLimitMessage` (with `backendError` fallback). Returns
  `{ minAmount, maxAmount, amountLimitError, currency }`. Read-only.
- **Error-combination helper** — `inlineError = amountLimitError ?? quoteError` (UB2 parity),
  extracted so UB2 can share it.

### Part 1 — Eligibility gate (UB2-pure)

- **`canFiatDepositAsset({ assetId })`** = feature flag enabled **AND**
  `RampsController:getBestProviderForAsset(assetId) != null`. The provider-availability
  check covers both "region supported" and "asset buyable here" (region-scoped providers),
  so no separate region check — and **no UB1 `rampRoutingDecision`**.
- In `MoneyAddMoneySheet`, replace the `isFiatDepositEnabled && rampRoutingDecision !== UNSUPPORTED`
  condition (lines 138-139) with `canFiatDepositAsset`. Fail-closed while providers/region
  load (option hidden/disabled until resolved).

### Part 2 — Money-account-scoped provider + payment resolution (no global mutation)

On entering the fiat deposit flow (asset known):
- Get the provider via `RampsController:getBestProviderForAsset(assetId)`.
- Fetch **that provider's** payment methods via the parameterized query
  (`rampsPaymentMethodsOptions({ regionCode, fiat, assetId, providerId })`).
- Select the best eligible payment method (existing `maxDelayMinutesForPaymentMethods`
  rule) and write `fiatPayment.selectedPaymentMethodId` to TPC via `updateFiatPayment`.
- Replaces the money-account fiat path's reliance on global `providers.selected` (in
  `useAutomaticTransactionPayToken`). Mutates only TPC `fiatPayment` state — never global
  ramps selection — so UB2 is unaffected. Resolves the non-Transak dead end.

### Part 3 — Amount validation, quote gating, error surfacing (input screen)

After the user stops typing (debounced via `amountHumanDebounced`):
1. **Client-side limit validation first** — `useRampsBuyLimits` (→ `getBestProviderForAsset`,
   then static `provider.limits`). No network.
2. **If limits fail** — show the localized min/max error, disable Continue, and **do not
   commit `amountFiat` to TPC** → no quote for a known-invalid amount.
3. **If limits pass** — commit `amountFiat` → the fee quote runs (`getFiatQuotes` →
   `RampsController:getBestQuote`) → on error, `getBestQuote`'s returned error is surfaced
   (by the TPC-team dependency) as the **fallback** leg. (Out of this work's scope.)
4. **Combine UB2-style:** `inlineError = amountLimitError ?? quoteError`; `amountInputHasError`
   also accounts for fetch error / generic no-quotes. Continue enabled only with an amount,
   no limit error, a settled usable quote (mirrors UB2's `canContinue`).

Alert wiring (modeled **exactly on `useInsufficientMoneyAccountBalanceAlert`**):
- New `AlertKeys.FiatBuyAmountLimit` in `constants/alerts.ts`.
- New `useFiatBuyLimitAlert` hook: takes `{ pendingAmount }`, sources `paymentMethodId`
  from `useTransactionPayFiatPayment()` and the asset from transaction metadata, gates on
  fiat `moneyAccountDeposit`, calls `useRampsBuyLimits`, returns a blocking `Alert[]`
  (`field: RowAlertKey.Amount`, `Severity.Danger`, `isBlocking: true`) carrying the
  combined error.
- Invoke in `usePendingAmountAlerts`, register in `useConfirmationAlerts`, add the key to
  the `PENDING_AMOUNT_ALERTS` / `KEYBOARD_ALERTS` / `ON_CHANGE_ALERTS` arrays in
  `useTransactionCustomAmountAlerts`. (Not the orphaned `PerpsDepositMinimum`.)

## Ownership & change-scope boundary

This work is constrained to the **Ramps domain** and **how ramps is used** — it must
**not change another controller's state**, specifically the TransactionPayController (TPC).

**In scope (this work):**
- `@metamask/ramps-controller`: `getBestProviderForAsset` + `getBestQuote` (+ messenger
  actions). Both **return their error in the response** (no separate state field).
- Mobile ramps (`app/components/UI/Ramp/**`): `useRampsBuyLimits`, the error-combination helper.
- Mobile "how ramps is used": eligibility gate in `MoneyAddMoneySheet`; Part 2 provider +
  payment resolution; Part 3 client-side limit validation, alert wiring, Continue-gating.
  Part 2 uses the **existing** `updateFiatPayment` action the current flow already calls —
  no new TPC state or TPC code.
- **The in-scope validation is the client-side limit check** (`useRampsBuyLimits` over
  static `provider.limits`) — needs no quote and no TPC change.

**Out of scope (TPC / core team — PR #8987 dependency):**
- Rewriting `getFiatQuotes` to call `RampsController:getBestQuote` and deleting
  `pickBestFiatQuote` (TPC package code).
- Surfacing the fee-quote error to the input screen — depends on the `getFiatQuotes`
  change. **No new TPC state field is needed:** `getBestQuote` returns the error in its
  response, so the TPC team reads it from there and surfaces it however they choose. We
  explicitly do **not** add `fiatPayment.quoteError`.

### Core change required

- **`RampsController` (in scope):** add `getBestProviderForAsset(assetId)` and
  `getBestQuote({ assetId, ... })` + messenger actions. `getBestQuote` returns the best
  quote **or** the structured error **in its return value** (no-success → backend
  per-provider error; fetch failure), reusing Shane's `LIMIT_EXCEEDED`/`QUOTE_FAILED`
  classification approach (PR #31079; that PR fixed `useHeadlessBuy().getQuotes`, a path
  this flow does not use, so it does not cover this flow).
- **`getFiatQuotes` (TPC — out of scope, dependency):** replace `RampsController:getQuotes`
  + `pickBestFiatQuote` (hardcoded Transak) with `RampsController:getBestQuote({ assetId, ... })`,
  combine with the relay quote for fees, and surface `getBestQuote`'s returned error. The
  ramps primitive makes this a minimal change. Delete `pickBestFiatQuote`. **No new TPC
  state field** — the error rides in the quote response.

## Quote-error parity with UB2

The client-side `amountLimitError` (row 1) is the **in-scope** validation. The remaining
rows are surfaced by the TPC-team dependency reading `getBestQuote`'s returned error — **no
TPC state field**; the error rides in the quote response.

| UB2 (`BuildQuote`) | Source | Money-account equivalent |
|---|---|---|
| `amountLimitError` | client `provider.limits` | `useRampsBuyLimits` → `getBestProviderForAsset` (**in scope**) |
| `providerQuoteError` | `quotesResponse.error[0].error` | `getBestQuote` return error (`LIMIT_EXCEEDED`), surfaced by TPC team |
| `hasGenericNoQuotes` | empty quote, no provider error | `getBestQuote` return error (`QUOTE_FAILED`), surfaced by TPC team |
| `quoteFetchError` | network error | `getBestQuote` return error (`QUOTE_FAILED`), surfaced by TPC team |
| `inlineQuoteError = amountLimitError ?? providerQuoteError` | combination | shared error-combination helper |

## Data / UX flow

1. **Tap "Deposit Funds"** → `canFiatDepositAsset` (via `getBestProviderForAsset`) gates the
   option. If eligible: resolve provider + best payment method (Part 2).
2. Amount screen, keyboard up, `$0`, Continue disabled.
3. **Type → stop** → client limit check (no network).
4. **Out of range** → red amount + min/max error + Continue disabled + **no quote**.
5. **In range** → commit amount → `getFiatQuotes` → `getBestQuote` (asset known) → fees;
   on quote error, surface as fallback; Continue enabled when the quote is good.

## Assumptions to verify during implementation

- **A1:** `RampsController.getProviders(regionCode)` resolves to the reliability-sorted
  regions-v2 endpoint and order is preserved through the cached query (so
  `getBestProviderForAsset`'s reliability fallback is correct).
- **A2:** `userRegion` (`regionCode`, `country.currency`) is populated by
  `GeolocationController` at Engine startup (UB2 path), independent of `RampsBootstrap`.
- **A3:** `fiatPayment.selectedPaymentMethodId` slug matches the
  `provider.limits.fiat[currency][paymentMethodId]` key shape.
- **A4:** The deposit `assetId` is in the CAIP form `providerSupportsAsset` / the
  payment-methods query / `getBestQuote` expect.
- **A5:** Committing `amountFiat` to TPC is the sole trigger for the fiat quote (so gating
  the commit gates the quote).
- **A6:** `RampsController` persisted `orders` contain enough to extract the most-recent
  completed order's provider for the cascade (status + `provider.id`).
- **A7:** The `getFiatQuotes` rewrite to call `getBestQuote` (and surface its returned
  error) lands in core PR #8987 (TPC team). This work ships the `RampsController` methods
  + mobile usage independently; no new TPC state field.

## Testing

- `RampsController.getBestProviderForAsset`: each cascade branch (completed-order provider →
  Transak → reliability fallback → null), token-support filtering, reliability-order
  preservation, region scoping, persisted-orders input.
- `RampsController.getBestQuote`: returns the best provider's quote; returns/propagates the
  structured error when no success; passes `assetId` through.
- **Purity / multi-consumer safety:** assert `getBestProviderForAsset` and `getBestQuote`
  do **not** mutate `providers.selected` / `tokens.selected` / `paymentMethods.selected` /
  `providerAutoSelected`, and do not read `tokens.selected` (require explicit `assetId`).
  Verify a money-account call leaves a pre-set UB2 selection unchanged.
- `getFiatQuotes`: uses `getBestQuote`, stays provider-agnostic, combines with relay fees,
  propagates the quote error into TPC state; `pickBestFiatQuote` removed.
- `useRampsBuyLimits`: below-min / above-max / in-range; graceful when provider/limits
  missing; `backendError` fallback; read-only.
- `canFiatDepositAsset`: true only when flag + `getBestProviderForAsset != null`; no
  `rampRoutingDecision`.
- Part 2: payment methods fetched for the resolved provider; best method written to TPC;
  non-Transak region resolves a provider; no global mutation.
- Part 3: limit error blocks Continue and suppresses the quote; passing limits commits and
  allows the quote; quote-error categories surface and combine client-first; alert only in
  fiat `moneyAccountDeposit` context.

## Future work (out of scope; the "evolve to simplify everywhere" path)

- **Migrate UB2 (`BuildQuote`) onto `RampsController.getBestQuote` / `getBestProviderForAsset`.**
  UB2 knows the asset after the token-selection screen, so it can call the same controller
  methods (no null), replacing its inline `useRampsQuotes` + `sortQuotes` + `selectedProvider`
  effects + `useProviderLimits` and the `inlineQuoteError` logic. Both flows then converge on
  one provider/quote-selection implementation in the controller.
- Preserve `providerAutoSelected` (soft/firm) semantics if/when these methods are used to
  *set* the selected provider in the UB2 path: orders/Transak → firm, reliability fallback →
  soft. This feature never sets the provider (read-only), so the flag is untouched here.

## Boundary summary

MM Pay passes primitives (`assetId`, `amount`, `paymentMethodId`) and consumes
`RampsController` methods / thin mobile hooks. All provider discovery, region scoping,
reliability ranking, Transak defaulting, order-history preference, limits, and best-quote
selection live in `RampsController` (using its persisted state). No global ramps selection
is mutated (UB2 unaffected), and the controller methods are the shared seam UB2 adopts next.
