# MM Pay Fiat Deposit — Amount Limit Validation

**Date:** 2026-06-05
**Status:** Approved design, pending implementation plan

## Problem

On the Money Account "Deposit Funds" (fiat) flow, the custom-amount screen
(`custom-amount-info`) lets the user enter a fiat amount and confirm, but it does
**not** validate that amount against the on-ramp provider's buy limits. A user can
enter an amount below the provider minimum or above the provider maximum, proceed
through the entire flow, and only hit a failure later. We want to validate the
entered amount against the provider's min/max **as soon as the user finishes
typing**, show a clear min/max error, and keep the Continue button disabled until
the amount is within range.

## Goals

- After the user stops typing (debounced), show a localized limit error
  ("Minimum deposit is $X" / "Maximum deposit is $Y") when the amount is out of range.
- Keep the Continue/Confirm button disabled while the amount is out of range.
- Provide instant feedback — limit validation must not wait on a pricing quote
  round-trip (limits are static per provider/currency/payment-method).
- Keep the MM Pay / confirmations layer **ignorant of all Ramps-specific concepts**
  (providers, provider selection, reliability ranking, regions). It passes
  primitives in and gets a result out.

## Non-Goals

- Changing how pricing quotes are fetched or how the headless buy executes.
- Changing `determinePreferredProvider`'s existing cascade logic.
- Adding any new backend endpoint or new LaunchDarkly flag.
- Building proactive "Min $X · Max $Y" hint text before the user types (only the
  error-on-violation behavior is in scope; raw min/max are exposed by the hook for
  optional future display).

## Key facts established during design

These shaped the design and must hold for it to work:

1. **The screen already auto-selects a fiat payment method.**
   `useAutomaticTransactionPayToken` (`autoSelectFiatPayment` path) writes
   `fiatPayment.selectedPaymentMethodId` into `TransactionPayController` state. So
   `custom-amount-info` already has `selectedFiatPaymentMethodId` via
   `useTransactionPayFiatPayment()`.

2. **The deposit token (assetId) is known before the screen renders** — the deposit
   is initiated from the money account home with a known target asset.

3. **The providers list is region-scoped and reliability-sorted by the backend.**
   The mobile providers React Query is keyed by `regionCode`
   (`app/components/UI/Ramp/queries/providers.ts`) and calls
   `RampsController.getProviders(regionCode)`, which hits the `regions-v2` endpoint
   that returns providers "with reliability sorting" (default returned sort). Mobile
   does **not** re-sort, so the cached list preserves backend reliability order.

4. **Buy limits are static per (provider, currency, paymentMethod)** and live on the
   `Provider` object: `provider.limits.fiat[currency][paymentMethodId]`. They do not
   depend on the entered amount or on a quote.
   (`app/components/UI/Ramp/utils/providerLimits.ts`)

5. **Token support is checkable client-side** via `providerSupportsAsset(provider, assetId)`
   (`app/components/UI/Ramp/utils/providerSupportsAsset.ts`).

6. **There is an existing live-keyboard alert pattern.** `AlertKeys.PerpsDepositMinimum`
   is a pending-amount alert evaluated against the debounced amount and surfaced live
   during keyboard entry (red amount + inline message + disabled Continue), wired
   through `usePendingAmountAlerts` → `useTransactionCustomAmountAlerts` and registered
   in `useConfirmationAlerts`. This is the template for our alert.

## Design

Three pieces. All Ramps-domain logic lives in the Ramps layer; MM Pay consumes a
single hook with primitive inputs.

### 1. `selectBestProviderForAsset` (Ramps util)

New file: `app/components/UI/Ramp/utils/selectBestProviderForAsset.ts`

Encapsulates the full "best provider for this token" cascade. Reuses the existing
`determinePreferredProvider` **unchanged**; only replaces its `null` tail with the
reliability winner.

```ts
function selectBestProviderForAsset({
  providers,        // region-scoped AND reliability-sorted (backend order, mobile preserves it)
  completedOrders,
  assetId,
}): Provider | null {
  const supporting = providers.filter((p) => providerSupportsAsset(p, assetId));
  if (!supporting.length) return null;

  // determinePreferredProvider is UNCHANGED: orders → Transak (native) → null,
  // scoped here to providers that support this token.
  const preferred = determinePreferredProvider(completedOrders, supporting)?.provider;
  if (preferred) return preferred;

  // Was null → now the most reliable remaining supporting provider
  // (first in the backend reliability-sorted list).
  return supporting[0];
}
```

Resulting cascade:
1. Previously-used provider (most recent completed order) that supports the token.
2. Transak (native) default, if supported in region for this token.
3. Most reliable remaining supporting provider (first in backend order).
4. `null` only if no provider supports the token at all.

### 2. `useRampsBuyLimits` (Ramps hook — the single consumer-facing API)

New file: `app/components/UI/Ramp/hooks/useRampsBuyLimits.ts`

```ts
useRampsBuyLimits({ assetId, amount, paymentMethodId }): {
  minAmount?: number;
  maxAmount?: number;
  amountLimitError: string | null;
  currency: string;
}
```

Internals (all Ramps-domain, synchronous over already-cached data):
- Read `userRegion` (`selectUserRegion`) → `currency = userRegion.country.currency ?? 'USD'`,
  `regionCode = userRegion.regionCode`.
- Read the cached, region-scoped, reliability-sorted providers list (existing React
  Query keyed by `regionCode`).
- Read `completedOrders` (existing selectors used by `useRampsProviders`:
  legacy fiat orders + controller ramps orders).
- `provider = selectBestProviderForAsset({ providers, completedOrders, assetId })`.
- `limit = getProviderBuyLimit(provider, currency, paymentMethodId)` →
  `{ minAmount, maxAmount }`.
- `amountLimitError = getProviderLimitMessage({ provider, fiatCurrency: currency,
  paymentMethodId, amount, currency, formatCurrency })` (existing util; localized).
- Return `{ minAmount, maxAmount, amountLimitError, currency }`.

Region is handled implicitly: the providers list is region-scoped at fetch time, and
`currency` (from region) selects the correct limits bucket. No region param is needed
in the util.

**Graceful degradation:** if region/providers/provider can't be resolved, or no
limits are published for the provider, the hook returns `amountLimitError: null` and
`undefined` min/max. The caller then does not block — the pre-existing
`useNoPayTokenQuotesAlert` still catches truly un-quotable amounts.

### 3. New `AlertKey` wired through existing pending-amount-alert plumbing (MM Pay)

- Add a new key, e.g. `AlertKeys.FiatBuyAmountLimit`, to
  `app/components/Views/confirmations/constants/alerts.ts`.
- New alert hook `useFiatBuyLimitAlert` in
  `app/components/Views/confirmations/hooks/alerts/`, modeled on the perps-minimum
  alert. It calls `useRampsBuyLimits({ assetId, amount: <debounced fiat amount>,
  paymentMethodId: selectedFiatPaymentMethodId })` and returns a **blocking** alert
  with the `amountLimitError` message when non-null (and only for fiat
  moneyAccountDeposit context).
- Register it in `usePendingAmountAlerts` (so it evaluates against the debounced
  amount and surfaces live during keyboard entry) and include the new key in the
  `PENDING_AMOUNT_ALERTS` / `KEYBOARD_ALERTS` / `ON_CHANGE_ALERTS` arrays in
  `useTransactionCustomAmountAlerts`, mirroring `PerpsDepositMinimum`.

`custom-amount-info` itself needs **no new wiring**: the existing
`useTransactionCustomAmountAlerts` already turns the amount red (`CustomAmount hasAlert`),
shows the inline `AlertMessage`, shows the title on `DepositKeyboard`, and the existing
`ConfirmButton` is already disabled by `hasBlockingAlerts`.

## Data / UX flow

1. User taps "Deposit Funds" → assetId known, fiat payment method auto-selected,
   providers already cached app-wide.
2. Amount screen renders, keyboard up, `$0`, Continue disabled (amount 0). No error.
3. User types → debounced (existing `amountHumanDebounced`); no error mid-keystroke.
4. Debounce settles → `useRampsBuyLimits` evaluates (synchronous, no network):
   - below min → red amount + "Minimum deposit is $X" + Continue disabled
   - above max → red amount + "Maximum deposit is $Y" + Continue disabled
   - in range → no error, Continue enabled
5. Pricing quote still fetches in parallel for fees/totals; limit feedback does not
   wait on it.

## Assumptions to verify during implementation

- **A1:** Mobile's `RampsController.getProviders(regionCode)` resolves to the
  reliability-sorted `regions-v2` providers endpoint and the order is preserved through
  to the cached React Query data the hook reads. (Strongly indicated; verify no
  intermediate re-sort.)
- **A2:** `userRegion` (with `regionCode` and `country.currency`) is populated by
  `GeolocationController` at Engine startup, independent of `RampsBootstrap`, by the
  time the deposit screen renders. (Per `RampsBootstrap` docstring; verify in the
  UB2 path since `RampsBootstrap` is a temporary non-V2 fix.)
- **A3:** The fiat payment method id stored in `fiatPayment.selectedPaymentMethodId`
  matches the key shape used in `provider.limits.fiat[currency][paymentMethodId]`
  (i.e. `getProviderBuyLimit` resolves with it). Verify keying / any sanitization.
- **A4:** The deposit assetId available to `custom-amount-info` is in the CAIP form
  `providerSupportsAsset` expects (it normalizes case but not format).

## Testing

- `selectBestProviderForAsset`: unit tests for each cascade branch — previous order
  wins; Transak default when no order; reliability fallback when no order and no
  Transak; `null` when no supporting provider; respects token-support filtering and
  preserves reliability order.
- `useRampsBuyLimits`: returns correct min/max/error for below-min, above-max, and
  in-range amounts; returns null/undefined gracefully when region/providers/provider
  or limits are missing; uses region currency for the limits bucket.
- Alert wiring: blocking alert appears for out-of-range debounced amount, clears when
  in range, only active in the fiat moneyAccountDeposit context, and disables Continue.
- Reuse existing `getProviderBuyLimit` / `getProviderLimitMessage` / `providerSupportsAsset`
  tests; do not duplicate their coverage.

## Boundary summary

MM Pay passes `{ assetId, amount, paymentMethodId }` and receives
`{ minAmount, maxAmount, amountLimitError, currency }`. All provider discovery,
region scoping, reliability ranking, Transak defaulting, and limits lookup live behind
`useRampsBuyLimits` in the Ramps domain. No Ramps concept leaks into the confirmations
layer.
