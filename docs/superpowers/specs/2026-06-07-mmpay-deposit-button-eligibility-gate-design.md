# MM Pay — Deposit Button Eligibility Gate

**Date:** 2026-06-07
**Branch:** new branch off `test-money-account`
**PR target:** `test-money-account`

## Problem

The "Deposit funds" button in `MoneyAddMoneySheet` is gated only on flag + best provider (`useCanFiatDepositAsset`). It does not check whether any eligible payment methods exist for the user's region. Users in regions with a provider but no eligible payment methods (e.g. India) see the button, tap it, enter the amount screen, and only then get a "Coming soon in your region" message that blocks the confirm button.

The gate should happen at the button — not inside the deposit flow.

## Goal

- "Deposit funds" is disabled with a "Coming soon" tag when no eligible payment methods exist for the user's region.
- "Deposit funds" is hidden entirely when the fiat deposit flag is off (no change to existing flag behaviour).
- The "Coming soon in your region" UI on the amount screen is removed.
- No loading flicker: provider + payment method data is pre-fetched in `MoneyHomeView` so the result is in cache by the time the sheet opens.

## Architecture

### Pre-fetch: `MoneyHomeView`

`MoneyHomeView` is always mounted while the user is on the Money tab. Add a single `useMoneyAccountDepositPaymentMethods()` call (no args) to warm the React Query cache. No result consumed — pure prefetch.

Because both queries (`getBestProviderForAsset` and `rampsPaymentMethodsOptions`) use the user's region code from Redux in their query keys, they automatically refetch whenever the region changes in settings.

**Cold-cache behaviour (first app open):** On the very first mount, the queries fire when `MoneyHomeView` renders. If the user taps "Add money" before both queries complete, `isReady` is still `false`, so `useCanFiatDepositAsset` returns `false` and the Deposit button appears disabled+tagged. Once the queries settle (typically <1 s), `canDeposit` updates and the button enables for supported regions. This brief flash is an accepted tradeoff — it is rare (requires a fast tap immediately after cold launch), short-lived, and preferable to letting users enter a flow that cannot succeed.

### Gate hook: `useCanFiatDepositAsset`

Replace the current implementation (which only checks provider existence) to also check eligible payment methods:

```ts
export function useCanFiatDepositAsset({ isFiatDepositFlagEnabled }): boolean {
  const { paymentMethods, isReady } = useMoneyAccountDepositPaymentMethods();
  const { maxDelayMinutesForPaymentMethods } = useMMPayFiatConfig();

  if (!isFiatDepositFlagEnabled || !isReady) return false;

  return pickEligiblePaymentMethod(paymentMethods, maxDelayMinutesForPaymentMethods) != null;
}
```

- Delegates provider lookup to `useMoneyAccountDepositPaymentMethods()` with no args — it resolves the asset ID from the same LD flag (`useMoneyAccountFiatDepositAssetId`) that the current implementation uses, so the cache key is identical and no duplicate network calls occur.
- `isReady` is `true` only when both provider + payment methods have resolved successfully. Fail-closed while loading or on network error — errors are treated the same as "unavailable" (button stays disabled+tagged). This is the correct behaviour for a fiat purchase entry point: if we cannot confirm eligibility, do not let users start a flow that may fail.
- Public interface (`boolean` return) is unchanged. **Only one production consumer:** `MoneyAddMoneySheet.tsx`. Tests in `useCanFiatDepositAsset.test.ts` and `MoneyAddMoneySheet.test.tsx` will need updating.
- Region changes automatically invalidate the cache and trigger a refetch (query key includes `regionCode`).

### Entry point: `MoneyAddMoneySheet`

Extend the `Option` interface with an optional `tag` field (string). Change the Deposit option from a conditional spread (shown only when `canDeposit`) to an always-present entry when the flag is enabled:

```ts
...(isFiatDepositEnabled
  ? [{
      label: strings('money.add_money_sheet.deposit_funds'),
      description: strings('money.add_money_sheet.deposit_funds_description'),
      icon: IconName.AttachMoney,
      onPress: handleDepositFunds,
      testID: MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
      disabled: !canDeposit,
      tag: !canDeposit ? strings('money.add_money_sheet.coming_soon') : undefined,
    }]
  : [])
```

The render loop renders a `Tag` inline with the label when `item.tag` is set. The "Receive external" row is a separate hardcoded `<View>` below the map and is **not** touched by this change — only the Deposit row gains the `tag` field, rendered inside the existing `options.map()` loop.

When `canDeposit` is `false` (either loading or truly unavailable):
- Row is disabled (grayed icon, muted text, no `onPress`)
- "Coming soon" tag appears inline with the label

When `canDeposit` is `true`:
- Row is enabled, no tag

When flag is off:
- Row is absent entirely (existing behaviour)

### Amount screen: `custom-amount-info.tsx`

Remove the `isMoneyAccountFiatUnavailable` block: the hidden-keyboard state, "Coming soon in your region" text, and `disableConfirm` from the confirm button. Users who reach the amount screen already have an eligible payment method (they passed the button gate).

### Deleted file

`useIsMoneyAccountDepositFiatAvailable.ts` — no longer consumed anywhere, delete.

**Atomicity:** The amount screen cleanup and the file deletion must land in the same PR as the gate changes. The file is imported by `custom-amount-info.tsx`; deleting it without removing the import would break the build.

## Data flow

```
MoneyHomeView mounts
  → useMoneyAccountDepositPaymentMethods() [cache warm]
      → getBestProviderForAsset (React Query, keyed on assetId + regionCode)
      → rampsPaymentMethodsOptions (React Query, keyed on regionCode + fiat + assetId + providerId)

User taps "Add money"
  → MoneyAddMoneySheet opens
      → useCanFiatDepositAsset
          → useMoneyAccountDepositPaymentMethods() [cache hit — instant]
          → pickEligiblePaymentMethod(paymentMethods, maxDelayMinutes)
          → returns true/false
      → Deposit button: enabled or disabled+tagged

User changes region in Settings
  → Redux updates selectUserRegion
  → query key changes → React Query refetches
  → MoneyHomeView (still mounted) picks up new result
```

## Files changed

| File | Change |
|------|--------|
| `app/components/UI/Money/Views/MoneyHomeView/MoneyHomeView.tsx` | Add `useMoneyAccountDepositPaymentMethods()` call |
| `app/components/UI/Ramp/hooks/useCanFiatDepositAsset.ts` | Replace implementation; add `useMoneyAccountDepositPaymentMethods` + `pickEligiblePaymentMethod` |
| `app/components/UI/Money/components/MoneyAddMoneySheet/MoneyAddMoneySheet.tsx` | Extend `Option` with `tag`; change Deposit from conditional-hide to conditional-disable+tag |
| `app/components/Views/confirmations/components/info/custom-amount-info/custom-amount-info.tsx` | Remove `isMoneyAccountFiatUnavailable` block |
| `app/components/Views/confirmations/hooks/pay/useIsMoneyAccountDepositFiatAvailable.ts` | Delete |

## Testing

- **Unit: `useCanFiatDepositAsset`** — mock `useMoneyAccountDepositPaymentMethods` and `pickEligiblePaymentMethod`; assert `false` when flag off, `false` when `!isReady`, `false` when no eligible method, `true` when eligible method found.
- **Unit: `MoneyAddMoneySheet`** — assert Deposit option absent when flag off; disabled+tagged when `canDeposit: false`; enabled, no tag when `canDeposit: true`.
- **Manual: India region** — set region to India, open Money tab, tap "Add money" — Deposit button should appear disabled with "Coming soon" tag. Amount screen should no longer show "Coming soon" message.
- **Manual: Supported region** — set region to US/UK, open Money tab, tap "Add money" — Deposit button enabled, tapping enters amount screen normally.
- **Manual: Region change** — start in a supported region (button enabled), change region to India in settings, return to Money tab, tap "Add money" — button should be disabled+tagged.
