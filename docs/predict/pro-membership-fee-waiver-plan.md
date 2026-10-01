# Predict Pro Membership Fee-Waiver Plan

This plan covers the legacy Polymarket Predict flow. `PredictNext` is out of
scope.

## Rules to preserve

- Use the dedicated Predict Pro entitlement and `benefits.predict` usage.
- Waive only the MetaMask service fee unless the backend contract says
  otherwise.
- Keep Polymarket CLOB market fees and Pay-With-Any-Token deposit fees
  separate.
- Treat `builderCode` as public attribution data, not as authorization.
- The backend must validate the wallet subscription and atomically reserve or
  consume the allowance at order submission.

## Step 1: Confirm the backend contract

Define:

- the client preflight: call
  `SubscriptionController:getBenefits` through `PredictControllerMessenger`
  before preparing and placing the order;
- the authoritative backend rule: only a confirmed taker trade consumes the
  benefit;
- how the backend polls or receives CLOB confirmation and validates the
  `builderCode` before finalizing consumption;
- the member builder code and effective fee response;
- idempotency behavior for retries and duplicate order digests;
- how a pre-order allowance reservation is released when no confirmed trade
  occurs;
- behavior for stale benefits, exhausted caps, inactive subscriptions, FAK
  partial fills, and Pay-With-Any-Token orders.

The client `getBenefits()` result is a preflight hint and may be stale. The
backend must atomically reserve an available allowance before forwarding a
fee-free order, then finalize consumption only after confirming the taker
trade. Otherwise, concurrent orders could all receive the fee waiver before
the post-trade counter is updated.

## Step 2: Add one client-side Predict fee policy

Build a Predict-specific policy around
[`app/selectors/subscriptionController.ts`](../../app/selectors/subscriptionController.ts).

Expose the subscription action through
[`app/core/Engine/messengers/predict-controller-messenger/index.ts`](../../app/core/Engine/messengers/predict-controller-messenger/index.ts)
and call it from `PredictController`; do not access `Engine.context` directly
from the controller.

The policy should use:

- the dedicated Predict entitlement;
- `benefits.predict.builderCode`;
- `remainingTxCount`;
- `exhausted`;
- a fail-closed loading or unknown state.

Return the effective builder code, effective MetaMask fee, and whether the UI
may present the benefit. Do not mutate the global
[`protocol/definitions.ts`](../../app/components/UI/Predict/providers/polymarket/protocol/definitions.ts)
environment value at runtime.

## Step 3: Apply the policy to previews

Update:

- [`usePredictOrderPreview.ts`](../../app/components/UI/Predict/hooks/usePredictOrderPreview.ts)
- [`queries/orderPreview.ts`](../../app/components/UI/Predict/queries/orderPreview.ts)
- [`providers/polymarket/utils.ts`](../../app/components/UI/Predict/providers/polymarket/utils.ts)
- [`utils/orders.ts`](../../app/components/UI/Predict/utils/orders.ts)

Ensure the effective policy is used consistently for:

- BUY all-in cost;
- SELL net proceeds;
- balance checks;
- deposit amounts;
- rewards display;
- fee breakdown UI.

Include the policy identity or version in preview query keys so a membership
change cannot reuse an old fee-bearing preview.

Keep `marketFee` separate and non-waivable by this client policy.

## Step 4: Add the member builder code to signed orders

Update
[`protocol/orderCodec.ts`](../../app/components/UI/Predict/providers/polymarket/protocol/orderCodec.ts)
so `buildProtocolUnsignedOrder()` accepts an explicit per-order builder code,
with the current protocol code as the default.

Update
[`PolymarketProvider.ts`](../../app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts)
to:

1. revalidate the effective fee policy immediately before signing;
2. pass the selected builder code into the order codec;
3. include the code in the signed EIP-712 order;
4. omit unnecessary Permit2 fee authorization when the effective service fee
   is zero;
5. preserve correct FAK/FOK behavior.

## Step 5: Revalidate submission and refresh benefits

Update
[`PredictController.ts`](../../app/components/UI/Predict/controllers/PredictController.ts)
to revalidate immediately before provider submission, including the
post-deposit retry path.

Handle:

- allowance unavailable;
- backend rejection of the member route;
- duplicate/retried orders;
- direct BUY and SELL;
- Pay-With-Any-Token BUY.

After a successful or definitively failed order, refresh or invalidate the
SubscriptionController benefits snapshot so `remainingTxCount` does not stay
stale. Use
[`useMoneyAccountPlusBenefits.ts`](../../app/components/Views/ProHub/hooks/useMoneyAccountPlusBenefits.ts)
as the existing benefits-refresh reference.

## Step 6: Test and verify

Add focused tests for:

- active, inactive, loading, missing, and exhausted benefits;
- only the intended MetaMask fee being waived;
- market and deposit fees remaining intact;
- builder code propagation into the signed order;
- Permit2 omission for waived orders;
- retries and idempotency;
- post-deposit revalidation;
- benefits refresh after order completion.

Run the focused Predict tests, TypeScript checks, and lint with Yarn.

## Main files

- [`app/selectors/subscriptionController.ts`](../../app/selectors/subscriptionController.ts)
- [`app/core/Engine/messengers/predict-controller-messenger/index.ts`](../../app/core/Engine/messengers/predict-controller-messenger/index.ts)
- [`app/components/UI/Predict/hooks/usePredictOrderPreview.ts`](../../app/components/UI/Predict/hooks/usePredictOrderPreview.ts)
- [`app/components/UI/Predict/queries/orderPreview.ts`](../../app/components/UI/Predict/queries/orderPreview.ts)
- [`app/components/UI/Predict/providers/polymarket/utils.ts`](../../app/components/UI/Predict/providers/polymarket/utils.ts)
- [`app/components/UI/Predict/utils/orders.ts`](../../app/components/UI/Predict/utils/orders.ts)
- [`app/components/UI/Predict/providers/polymarket/protocol/orderCodec.ts`](../../app/components/UI/Predict/providers/polymarket/protocol/orderCodec.ts)
- [`app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts`](../../app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts)
- [`app/components/UI/Predict/controllers/PredictController.ts`](../../app/components/UI/Predict/controllers/PredictController.ts)
