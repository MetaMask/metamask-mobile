# MM Pay Fiat Deposit — Plan B: mobile eligibility, resolution, limit validation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the mobile app, gate the Money-Account "Deposit Funds" entry by asset
buyability, resolve the best provider + payment method, and validate the entered fiat
amount against the provider's static buy limits — disabling Continue with a localized
min/max error until the amount is in range.

**Architecture:** Consumes Plan A's `RampsController:getBestProviderForAsset` (via the
preview build). New mobile ramps hook `useRampsBuyLimits` + eligibility predicate; reuses
existing `getProviderBuyLimit` / `getProviderLimitMessage`. Validation surfaces through the
existing pending-amount alert system (modeled on `useInsufficientMoneyAccountBalanceAlert`).
No global ramps selection mutation; per-flow state stays in TPC `fiatPayment` via the
existing `updateFiatPayment` action. All changes scoped to the fiat `moneyAccountDeposit`
context.

**Tech Stack:** React Native, TypeScript, Redux/reselect, `@tanstack/react-query`, Jest.

**Spec:** `docs/superpowers/specs/2026-06-05-mmpay-fiat-deposit-amount-limits-design.md` (Parts 1-3).

**Repo for this plan:** `/Users/amitabh/Dev/consensys/metamask-mobile-test-money-account`. Depends on Plan A's preview build. Everything here lands in `test-money-account` for the final build.

---

## Prerequisite

- [ ] Plan A merged + preview build published. Bump `@metamask/ramps-controller` to the
  preview version in `package.json` (same pattern as the TPC preview swap done earlier),
  run `yarn`, confirm `RampsController:getBestProviderForAsset` is in the typings.

## File Structure

- Create: `app/components/UI/Ramp/hooks/useRampsBuyLimits.ts` (+ `.test.ts`) — limits hook.
- Create: `app/components/UI/Ramp/utils/canFiatDepositAsset.ts` (+ `.test.ts`) — eligibility predicate (or a hook if it needs messenger/selectors).
- Modify: `app/components/UI/Money/components/MoneyAddMoneySheet/MoneyAddMoneySheet.tsx` — gate the Deposit Funds option.
- Modify: `app/components/Views/confirmations/hooks/pay/useAutomaticTransactionPayToken.ts` — resolve provider via ramps + fetch its payment methods (Part 2).
- Modify: `app/components/Views/confirmations/constants/alerts.ts` — add `AlertKeys.FiatBuyAmountLimit`.
- Create: `app/components/Views/confirmations/hooks/alerts/useFiatBuyLimitAlert.ts` (+ `.test.ts`).
- Modify: `app/components/Views/confirmations/hooks/alerts/usePendingAmountAlerts.ts` — invoke the new alert.
- Modify: `app/components/Views/confirmations/hooks/alerts/useConfirmationAlerts.ts` — register it.
- Modify: `app/components/Views/confirmations/hooks/transactions/useTransactionCustomAmountAlerts.ts` — add the key to the three filter arrays.

---

### Task 1: `useRampsBuyLimits` hook

**Files:**
- Create: `app/components/UI/Ramp/hooks/useRampsBuyLimits.ts`
- Test: `app/components/UI/Ramp/hooks/useRampsBuyLimits.test.ts`

- [ ] **Step 1: Write failing tests** (mock `Engine.context.RampsController.getBestProviderForAsset`, `selectUserRegion`, and `useFormatters`)

```ts
// below-min -> amountLimitError set; in-range -> null; above-max -> error;
// no provider (getBestProviderForAsset -> null) -> { amountLimitError: null, minAmount: undefined };
// uses userRegion.country.currency for the limits bucket.
```
Cover: below-min, in-range, above-max, null-provider graceful, currency selection.

- [ ] **Step 2: Run to verify fail**

Run: `yarn jest app/components/UI/Ramp/hooks/useRampsBuyLimits.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectUserRegion } from '../../../../selectors/rampsController';
import Engine from '../../../../core/Engine';
import { getProviderBuyLimit } from '../utils/providerLimits';
import { getProviderLimitMessage } from '../utils/getProviderLimitMessage';
import { useFormatters } from '../../../hooks/useFormatters';

export function useRampsBuyLimits({
  assetId,
  amount,
  paymentMethodId,
  backendError,
}: {
  assetId?: string;
  amount: number;
  paymentMethodId?: string | null;
  backendError?: string | null;
}) {
  const userRegion = useSelector(selectUserRegion);
  const currency = userRegion?.country?.currency ?? 'USD';
  const { formatCurrency } = useFormatters();

  const provider = useMemo(
    () => (assetId ? Engine.context.RampsController.getBestProviderForAsset(assetId) : null),
    [assetId],
  );

  const limit = useMemo(
    () => getProviderBuyLimit(provider, currency, paymentMethodId),
    [provider, currency, paymentMethodId],
  );

  const amountLimitError = useMemo(
    () =>
      getProviderLimitMessage({
        provider,
        fiatCurrency: currency,
        paymentMethodId,
        amount,
        currency,
        formatCurrency,
        backendError,
      }),
    [provider, currency, paymentMethodId, amount, formatCurrency, backendError],
  );

  return {
    minAmount: limit?.minAmount,
    maxAmount: limit?.maxAmount,
    amountLimitError,
    currency,
  };
}
```

> `getBestProviderForAsset` is synchronous (pure read). Confirm the messenger/Engine
> exposes it synchronously; if only the messenger action exists, call
> `Engine.controllerMessenger.call('RampsController:getBestProviderForAsset', assetId)`.

- [ ] **Step 4: Run to verify pass** — `yarn jest app/components/UI/Ramp/hooks/useRampsBuyLimits.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/UI/Ramp/hooks/useRampsBuyLimits.ts app/components/UI/Ramp/hooks/useRampsBuyLimits.test.ts
git commit -m "feat(ramp): add useRampsBuyLimits hook"
```

---

### Task 2: `canFiatDepositAsset` eligibility + gate the Deposit Funds option

**Files:**
- Create: `app/components/UI/Ramp/utils/canFiatDepositAsset.ts` (+ `.test.ts`)
- Modify: `app/components/UI/Money/components/MoneyAddMoneySheet/MoneyAddMoneySheet.tsx`

- [ ] **Step 1: Write failing tests for `canFiatDepositAsset`**

True only when flag enabled AND `getBestProviderForAsset(assetId) != null`; false when
flag off, or provider null (region/providers unresolved or asset unsupported). Must NOT
reference `rampRoutingDecision`.

- [ ] **Step 2: Run to verify fail** — `yarn jest app/components/UI/Ramp/utils/canFiatDepositAsset.test.ts` → FAIL.

- [ ] **Step 3: Implement**

```ts
import Engine from '../../../../core/Engine';

export function canFiatDepositAsset({
  assetId,
  isFiatDepositFlagEnabled,
}: {
  assetId?: string;
  isFiatDepositFlagEnabled: boolean;
}): boolean {
  if (!isFiatDepositFlagEnabled || !assetId) return false;
  return Engine.context.RampsController.getBestProviderForAsset(assetId) != null;
}
```

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Gate the option in `MoneyAddMoneySheet.tsx`**

Replace the condition at lines ~138-139:
```ts
// before:
...(isFiatDepositEnabled && rampRoutingDecision !== UnifiedRampRoutingType.UNSUPPORTED ? [ ... ] : [])
// after:
...(canFiatDepositAsset({ assetId: depositAssetId, isFiatDepositFlagEnabled: isFiatDepositEnabled }) ? [ ... ] : [])
```
Remove the now-unused `rampRoutingDecision` / `getRampRoutingDecision` import **only if**
nothing else in the file uses it. Source `depositAssetId` from the money-account deposit
asset already known in this sheet/its hook.

- [ ] **Step 6: Update/extend `MoneyAddMoneySheet` tests**

Deposit Funds shown when `canFiatDepositAsset` true; hidden when false (flag off / no
supporting provider). Run: `yarn jest app/components/UI/Money/components/MoneyAddMoneySheet`.

- [ ] **Step 7: Commit**

```bash
git add app/components/UI/Ramp/utils/canFiatDepositAsset.ts app/components/UI/Ramp/utils/canFiatDepositAsset.test.ts app/components/UI/Money/components/MoneyAddMoneySheet/
git commit -m "feat(ramp): gate Deposit Funds by asset buyability (drop UB1 rampRoutingDecision)"
```

---

### Task 3: Part 2 — provider + payment resolution (scoped to fiat moneyAccountDeposit)

**Files:**
- Modify: `app/components/Views/confirmations/hooks/pay/useAutomaticTransactionPayToken.ts`
- Test: its existing `.test.ts`

- [ ] **Step 1: Write failing tests**

For the fiat `moneyAccountDeposit` + `autoSelectFiatPayment` path: the hook resolves the
provider via `getBestProviderForAsset(assetId)`, fetches **that provider's** payment
methods (parameterized `providerId`), and writes the best eligible method to
`fiatPayment.selectedPaymentMethodId` via the existing `updateFiatPayment`. Assert: other
flows (perps/predict, non-fiat) are unchanged; no global `setSelectedProvider` call.

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement** — in the `autoSelectFiatPayment` branch, derive the provider
from the deposit asset via `getBestProviderForAsset`, request payment methods for that
`providerId` (via `rampsPaymentMethodsOptions`/the payment-methods query), pick the first
eligible by `maxDelayMinutesForPaymentMethods`, and `updateFiatPayment` with its id. Gate
the whole change behind the fiat `moneyAccountDeposit` context so other consumers of this
hook are untouched. Do **not** call `setSelectedProvider`.

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/Views/confirmations/hooks/pay/useAutomaticTransactionPayToken.ts app/components/Views/confirmations/hooks/pay/useAutomaticTransactionPayToken.test.ts
git commit -m "feat(confirmations): resolve fiat deposit provider + payment via ramps (no global mutation)"
```

---

### Task 4: `AlertKeys.FiatBuyAmountLimit` + `useFiatBuyLimitAlert`

**Files:**
- Modify: `app/components/Views/confirmations/constants/alerts.ts`
- Create: `app/components/Views/confirmations/hooks/alerts/useFiatBuyLimitAlert.ts` (+ `.test.ts`)

- [ ] **Step 1: Add the key**

Add `FiatBuyAmountLimit = 'FiatBuyAmountLimit'` to `AlertKeys`.

- [ ] **Step 2: Write failing tests for `useFiatBuyLimitAlert`** (model on `useInsufficientMoneyAccountBalanceAlert.test.ts`)

Returns a blocking alert (`field: RowAlertKey.Amount`, `Severity.Danger`, `isBlocking: true`)
with the limit message when `useRampsBuyLimits` reports `amountLimitError` for a fiat
`moneyAccountDeposit`; returns `[]` when in range, when not fiat moneyAccountDeposit, or no
payment method.

- [ ] **Step 3: Run to verify fail** → FAIL.

- [ ] **Step 4: Implement** (mirror `useInsufficientMoneyAccountBalanceAlert`)

```ts
import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { TransactionMeta, TransactionType } from '@metamask/transaction-controller';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayFiatPayment } from '../pay/useTransactionPayData';
import { useRampsBuyLimits } from '../../../../UI/Ramp/hooks/useRampsBuyLimits';

export function useFiatBuyLimitAlert({ pendingAmount }: { pendingAmount?: string } = {}): Alert[] {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const fiatPayment = useTransactionPayFiatPayment();
  const paymentMethodId = fiatPayment?.selectedPaymentMethodId;
  const assetId = /* deposit asset from transactionMeta (CAIP) */;

  const isFiatDeposit =
    hasTransactionType(transactionMeta, [TransactionType.moneyAccountDeposit]) &&
    Boolean(paymentMethodId);

  const amount = Number(pendingAmount ?? fiatPayment?.amountFiat ?? '0');
  const { amountLimitError } = useRampsBuyLimits({ assetId, amount, paymentMethodId });

  return useMemo(() => {
    if (!isFiatDeposit || !amountLimitError) return [];
    return [{
      key: AlertKeys.FiatBuyAmountLimit,
      field: RowAlertKey.Amount,
      message: amountLimitError,
      severity: Severity.Danger,
      isBlocking: true,
    }];
  }, [isFiatDeposit, amountLimitError]);
}
```

- [ ] **Step 5: Run to verify pass** → PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/Views/confirmations/constants/alerts.ts app/components/Views/confirmations/hooks/alerts/useFiatBuyLimitAlert.ts app/components/Views/confirmations/hooks/alerts/useFiatBuyLimitAlert.test.ts
git commit -m "feat(confirmations): add fiat buy amount-limit alert"
```

---

### Task 5: Wire the alert into the pending-amount alert system

**Files:**
- Modify: `app/components/Views/confirmations/hooks/alerts/usePendingAmountAlerts.ts`
- Modify: `app/components/Views/confirmations/hooks/alerts/useConfirmationAlerts.ts`
- Modify: `app/components/Views/confirmations/hooks/transactions/useTransactionCustomAmountAlerts.ts`

- [ ] **Step 1: Write/extend failing tests**

Assert the blocking alert flows through to `useTransactionCustomAmountAlerts` for the
debounced amount (live keyboard entry) and that it appears in `useConfirmationAlerts`.

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement**

- `usePendingAmountAlerts.ts`: invoke `useFiatBuyLimitAlert({ pendingAmount: pendingTokenAmount })` and include it in the returned array (mirror `useInsufficientMoneyAccountBalanceAlert`).
- `useConfirmationAlerts.ts`: invoke `useFiatBuyLimitAlert()` and include in the aggregated list (mirror line ~45).
- `useTransactionCustomAmountAlerts.ts`: add `AlertKeys.FiatBuyAmountLimit` to `PENDING_AMOUNT_ALERTS`, `KEYBOARD_ALERTS`, and `ON_CHANGE_ALERTS`.

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/Views/confirmations/hooks/alerts/usePendingAmountAlerts.ts app/components/Views/confirmations/hooks/alerts/useConfirmationAlerts.ts app/components/Views/confirmations/hooks/transactions/useTransactionCustomAmountAlerts.ts
git commit -m "feat(confirmations): surface fiat amount-limit alert during keyboard entry"
```

---

### Task 6: Quote-gating (don't quote until limits pass) + integration

**Files:**
- Modify: `app/components/Views/confirmations/components/info/custom-amount-info/custom-amount-info.tsx`

- [ ] **Step 1: Write failing test** — when the debounced amount is out of limits
(blocking `FiatBuyAmountLimit` alert present), `handleDone` must NOT commit `amountFiat`
to TPC (so no quote fires); when in range, it commits as today.

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement** — in `handleDone`, guard the `updateFiatPayment({ amountFiat })`
write on there being no blocking amount-limit alert (read via `useAlerts` /
`amountLimitError` from `useRampsBuyLimits`). Continue is already disabled by
`hasBlockingAlerts` (ConfirmButton), so no separate button wiring is needed.

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/Views/confirmations/components/info/custom-amount-info/custom-amount-info.tsx
git commit -m "feat(confirmations): gate fiat quote on amount limits passing"
```

---

### Task 7: Land in `test-money-account` + verify

- [ ] **Step 1: Full unit suite for touched areas**

Run: `yarn jest app/components/UI/Ramp/hooks/useRampsBuyLimits app/components/UI/Ramp/utils/canFiatDepositAsset app/components/Views/confirmations/hooks/alerts app/components/UI/Money/components/MoneyAddMoneySheet`
Expected: PASS.

- [ ] **Step 2: Lint + types** — `yarn lint:tsc` (touched files), `yarn lint`.

- [ ] **Step 3: Merge into `test-money-account`** (the build branch) and let the user
trigger the build. Manual verification (simulator/E2E): tap Deposit Funds (gated), enter a
below-min amount → see "Minimum deposit is $X" + Continue disabled, no quote; enter an
in-range amount → Continue enabled, quote/fees load.

---

## Notes
- All mobile changes are **scoped to the fiat `moneyAccountDeposit` context** — perps,
  predict, and other consumers of the shared hooks are untouched (Backward-compatibility).
- No global ramps selection state is mutated; per-flow state stays in TPC `fiatPayment`
  via the existing `updateFiatPayment` action.
- The fee-quote-error fallback leg (parity rows 2-4) depends on the TPC-team change
  (Plan-A `getBestQuote` consumed by `getFiatQuotes`) and is **out of scope** here; the
  in-scope validation is the client-side limit check.
