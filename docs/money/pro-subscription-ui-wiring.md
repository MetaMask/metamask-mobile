# Money Account Pro — remaining UI wiring

Tracking plan for connecting MetaMask Pro (product `money_account_plus`) to `@metamask/subscription-controller` **9.1.0**.

Package status: app and `@metamask/wallet` both resolve **9.1.0**. The previous preview pin (`9.0.0-preview-c89c65ec1` via `previewBuilds`) is gone.

## What is already live

| Area               | Where                                                                            | Behavior                                                                                             |
| ------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Engine             | `SubscriptionController`, `SubscriptionService`, `SubscriptionDelegationService` | Owned by `@metamask/wallet`; mobile supplies fetch, env, and Sentry for the service                  |
| Feature gate       | `subSUB990AbtestProSubscriptionFlow`                                             | Control hides Pro. Treatment shows it. Dev override: `MM_PRO_SUBSCRIPTION_FLOW_ENABLED=true`         |
| Entry              | Money header                                                                     | **Join Pro** vs **Pro**, based on an active Plus subscription                                        |
| Checkout           | `ProSubscription` → `useStartProSubscription`                                    | `getPricing` → `prepareDelegation` → `startSubscriptionWithCrypto` (delegation, Money account payer) |
| Balance error      | `useStartProSubscription`                                                        | Insufficient Money funds maps to `pro_subscription.insufficient_balance`                             |
| Subscriber routing | `useIsProSubscriber`                                                             | Paywall if not subscribed, Pro Hub if subscribed                                                     |
| Polling            | Money Home only                                                                  | `useSubscriptionPolling` while the A/B is on, signed in, unlocked, and foregrounded                  |

Checkout still skips CHOMP verify and intent registration (`skipChompInteractions: true`). Local delegation hash plus Authenticated User Storage persist still run. Treat that as an open product decision (step 8), not as unfinished UI.

## What is still mock or unwired

Screens exist. Data and mutations do not.

| Surface             | File                                              | Gap                                                                                                                                    |
| ------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Pro Hub stats       | `app/components/Views/ProHub/ProHub.constants.ts` | `MOCK_PRO_HUB_STATS` (lifetime earnings, Money balance, mUSD back)                                                                     |
| Trade allowances    | same file, `MOCK_TRADE_ALLOWANCES`                | Swaps / Perps / Predict used-vs-cap                                                                                                    |
| Membership          | `screens/Membership/Membership.constants.ts`      | `MOCK_MEMBERSHIP_STATS`, `MOCK_PAYMENT_DETAILS`                                                                                        |
| Invoices / support  | `screens/Membership/Membership.tsx`               | Empty `TODO` handlers                                                                                                                  |
| Earned              | `screens/Earned/Earned.constants.ts`              | `MOCK_EARNED_DATA`                                                                                                                     |
| Cancel              | `screens/CancelMembership/`                       | Survey flips local step to success. No `cancelSubscription`. Date and amounts are mock. Reason ids do not match `CANCELLATION_REASONS` |
| Success screen      | `screens/Success/Success.tsx`                     | Hardcoded name `Aly`                                                                                                                   |
| Subscriber selector | `app/selectors/subscriptionController.ts`         | Hand-rolled active check plus a debug `console.log`. Package already exports `selectIsActiveSubscriber`                                |
| Polling             | `useSubscriptionPolling`                          | Mounted only on Money Home, so Pro Hub can be stale if the user never opens Money                                                      |

## What 9.1.0 can and cannot supply

The controller is enough for billing, membership, entitlements, metered benefit usage, and cancel/uncancel. It does not compute dollar earnings.

| UI need                           | Controller API                                                                                        | Notes                                                                                                                                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Is the user on Plus               | `selectIsActiveSubscriber(state, PRODUCT_TYPES.MONEY_ACCOUNT_PLUS)`                                   | Active includes `active`, `trialing`, `provisional`                                                                                                                                                     |
| Plan, interval, renew date, payer | `Subscription` on `state.subscriptions`                                                               | `interval`, `currentPeriodEnd`, `paymentMethod`, `cancelAtPeriodEnd`, `cancelType`, `trialEnd`                                                                                                          |
| Price copy                        | `state.pricing` via `selectMoneyAccountPlusPricing`                                                   | Already used on the paywall                                                                                                                                                                             |
| Feature gates                     | `state.productEntitlements` + `selectHasEntitlement` / `selectIsUsageAvailable`                       | `swapFeeWaiver`, `perpsFeeWaiver`, `predictFreeTx`, `premiumApy`                                                                                                                                        |
| Trade usage bars                  | `getBenefits()` → `state.benefits`                                                                    | `swaps` / `perps` / `predict` remaining vs cap. Requires an active Plus subscriber                                                                                                                      |
| Cancel                            | `cancelSubscription({ subscriptionId, cancelAtPeriodEnd, cancellationReason, cancellationFeedback })` | Reason codes: `too_expensive`, `not_using_benefits`, `benefits_not_as_expected`, `something_did_not_work`, `unhappy_with_support`, `other`. Success refreshes subscriptions, entitlements, and benefits |
| Undo cancel                       | `unCancelSubscription({ subscriptionId })`                                                            | No UI yet                                                                                                                                                                                               |
| Card checkout / portal            | `startSubscriptionWithCard`, `getBillingPortalUrl`, `updatePaymentMethod`                             | Not this flow. Pro checkout is crypto delegation                                                                                                                                                        |

Out of scope for this package (do not block the wiring steps on them):

- Lifetime / monthly **dollar** earnings (Money yield, Card cashback). Those stay on Money and Card data.
- Invoice PDFs. Card users can open `getBillingPortalUrl` later; crypto has no portal.
- Priority-support deep link.

## Wiring plan

Do the steps in order. Each step should land with unit tests before the next one starts. Keep the A/B gate; do not show live data when the treatment is off.

### Step 0 — Clean the subscriber read

**Goal:** one source of truth for “is this user on Plus”, with no debug logging.

- Remove the `console.log` in `selectIsMoneyAccountPlusSubscriber`.
- Switch `useIsProSubscriber` to `selectIsActiveSubscriber` from `@metamask/subscription-controller` against `PRODUCT_TYPES.MONEY_ACCOUNT_PLUS`.
- Delete the local `ACTIVE_SUBSCRIPTION_STATUSES` copy if nothing else needs it. `ACTIVE_SUBSCRIPTION_STATUSES` is exported from the package constants in 9.1.0.

**Done when:** Money header still routes to the paywall or Pro Hub, and the selector test covers active / trialing / provisional / canceled.

### Step 1 — Selectors for the Plus subscription and benefits

**Goal:** UI reads controller state, not mock constants.

Add selectors next to the existing ones in `app/selectors/subscriptionController.ts`:

- Plus subscription: first subscription whose products include `MONEY_ACCOUNT_PLUS` and whose status is active (reuse `selectIsActiveSubscriber` or `selectSubscriptionByProduct` plus status).
- Benefits slice: `state.benefits` (`swaps`, `perps`, `predict`, `billingPeriodId`).
- Entitlement helper wrappers only if call sites should not import controller selectors directly. Prefer the package selectors.

**Done when:** selectors return `undefined` / fail closed when the slice is missing, and tests cover a Plus crypto subscription plus a Shield-only subscription.

### Step 2 — Poll on every Pro surface

**Goal:** Pro Hub and Membership see fresh subscriptions and benefits without requiring a Money Home visit.

- Call `useSubscriptionPolling({ enabled: isProSubscriptionEnabled })` from `ProHub` (and therefore its child routes only if they can be opened without Pro Hub; Membership and Cancel are pushed from Pro Hub, so the hub mount is enough while it stays under the stack).
- If Cancel or Membership can be deep-linked without Pro Hub mounted, poll there too.
- After a successful checkout, `startSubscriptionWithCrypto` already refreshes local state. Polling is the steady-state path.

**Done when:** opening Pro Hub with the treatment on starts exactly one poll (existing `usePolling` dedupes by input), and leaving the flow stops it.

### Step 3 — Fetch benefits when the hub is focused

**Goal:** trade allowance rows have real usage.

- On Pro Hub focus, if `useIsProSubscriber()` is true, call `SubscriptionController.getBenefits()`.
- `getBenefits` throws `UserNotSubscribed` when the user is not an active Plus subscriber. Do not call it on the paywall.
- Map `state.benefits` onto the existing trade rows:
  - `swaps.consumedMicroUsd` / `capMicroUsd` (currency)
  - `perps.consumedMicroUsd` / `capMicroUsd` (currency)
  - `predict.consumedTxCount` / `capTxCount` (count)
- Hide or zero a row when the matching entitlement is false (`selectHasEntitlement` / `selectIsUsageAvailable`).
- Loading and error: keep the row skeletons or the last value; do not fall back to `MOCK_TRADE_ALLOWANCES` in production.

**Done when:** `MOCK_TRADE_ALLOWANCES` is test-only, and a benefits fixture renders the three rows.

### Step 4 — Membership payment details

**Goal:** plan, price, payer, and renewal come from the subscription record.

Bind `Membership` to the Plus `Subscription`:

| UI row           | Source                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Plan             | `interval` → monthly / annual copy, product name Pro                                                                                  |
| Total            | matching price from `selectMoneyAccountPlusPricing` (not a hardcoded `$49.99`)                                                        |
| Paying with      | `paymentMethod.type === 'crypto'` → Money account and shortened `payerAddress`. Card branch can show brand + last4 if it ever appears |
| Renews on        | `currentPeriodEnd` (or `trialEnd` while `trialing`)                                                                                   |
| Cancel scheduled | `cancelAtPeriodEnd` → show end date and an undo affordance (step 6)                                                                   |

Leave **earned this month** on the mock or hide it until step 7. Do not invent an earnings field on the subscription.

Invoices: leave the row, but only navigate when `getBillingPortalUrl` is in scope (card). For crypto, hide the row or show a disabled state. Do not ship a no-op press.

**Done when:** `MOCK_MEMBERSHIP_STATS.plan` and `MOCK_PAYMENT_DETAILS` are gone from the screen, and a fixture subscription renders interval, payer, and date.

### Step 5 — Cancel for real

**Goal:** confirming cancel calls the controller and the success date is the subscription period end.

1. Replace local reason ids with `CANCELLATION_REASONS` (or map them explicitly):

   | Current UI id | 9.1.0 code                                                                                  |
   | ------------- | ------------------------------------------------------------------------------------------- |
   | `issue`       | `something_did_not_work`                                                                    |
   | `no_benefits` | `not_using_benefits` or `benefits_not_as_expected` (pick one with design; the API has both) |
   | `no_value`    | `too_expensive`                                                                             |
   | `support`     | `unhappy_with_support`                                                                      |
   | `other`       | `other`                                                                                     |

   The API also has `benefits_not_as_expected`, which the current five-option list does not show. Add it only if design wants six options.

2. On confirm, call:

   ```ts
   await Engine.context.SubscriptionController.cancelSubscription({
     subscriptionId,
     cancelAtPeriodEnd: true,
     cancellationReason,
   });
   ```

   Use `cancelType` on the subscription. `ALLOWED_AT_PERIOD_END` → `cancelAtPeriodEnd: true`. `ALLOWED_IMMEDIATE` is a product choice; default to period end unless design says otherwise. `NOT_ALLOWED` → disable the CTA.

3. Success copy uses `currentPeriodEnd` from the refreshed subscription, not `MOCK_CANCELLATION_END_DATE`.
4. Surface `FailedToCancelSubscription` with the existing error pattern (banner, stay on the survey).
5. Optional free text only if the survey adds a field (`cancellationFeedback`).

**Done when:** confirm calls `cancelSubscription` with a real id and a `CANCELLATION_REASONS` value, and the success step does not render the mock date.

### Step 6 — Uncancel

**Goal:** a subscription with `cancelAtPeriodEnd` can be resumed.

- On Membership, when `cancelAtPeriodEnd` is true, show the scheduled end and a keep-membership action.
- Call `unCancelSubscription({ subscriptionId })`.
- Controller refresh updates status; the row returns to the normal renew date.

**Done when:** the action is hidden unless `cancelAtPeriodEnd` is true, and a successful call clears that flag in a test by mocking the controller state update.

### Step 7 — Earnings screens (separate data; do not block 0–6)

**Goal:** stop pretending subscription state contains dollar earnings.

`MOCK_PRO_HUB_STATS` and `MOCK_EARNED_DATA` are not subscription fields. Options:

- Hide lifetime earnings, Money balance delta, mUSD back, and the Earned screen until Money yield and Card cashback APIs are chosen.
- Or bind them to existing Money / Card selectors in a follow-up, and delete the subscription TODOs so nobody looks for a “membership endpoint” on this controller.

`premiumApy` (`selectHasEntitlement(..., MoneyAccountFeature.PremiumApy)`) can gate Pro APY copy on Money Home. That is an entitlement, not an earnings total.

**Done when:** production Pro Hub does not render `MOCK_PRO_HUB_STATS`, and the Earned screen is either hidden or fed by a named non-subscription source.

### Step 8 — Checkout follow-ups

Not required to wire Hub, but track them with the same feature:

- Remove the hardcoded `Aly` on the success screen (account name, or drop the name).
- Decide `skipChompInteractions`. `false` runs CHOMP verify and intent registration inside `prepareDelegation`. `true` is the current mobile behavior.
- `isTrialRequested` passed into `startSubscriptionWithCrypto` is overwritten by the controller from pricing `trialPeriodDays` and `trialedProducts`. The hook can stop duplicating that rule once tests lock the controller behavior.

## Suggested PR slices

| PR  | Steps   | User-visible result                                              |
| --- | ------- | ---------------------------------------------------------------- |
| 1   | 0, 1, 2 | Correct subscriber routing, no debug log, fresh state on Pro Hub |
| 2   | 3, 4    | Real trade usage and real plan / payment / renew rows            |
| 3   | 5, 6    | Cancel and undo hit the API                                      |
| 4   | 7, 8    | Earnings no longer fake; success copy and CHOMP flag decided     |

## Out of scope

- Shield subscription UI (`startSubscriptionWithCard`, `submitSubscriptionCryptoApproval`).
- Rewards linking (`linkRewards`) unless product asks to opt in during Pro checkout.
- Cohort assignment and sponsorship intents.
- Changing the A/B flag key or rollout percentage (LaunchDarkly).
