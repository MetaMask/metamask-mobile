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
- Use `getBenefits()` only as the mobile eligibility/preflight signal.
- Keep subscription validation, allowance metering, and the final fee decision
  in the backend.

## Step 1: Confirm the backend contract

Confirm the small client-facing contract:

- the client preflight: call
  `SubscriptionController:getBenefits` through `PredictControllerMessenger`
  before calculating the fee preview;
- the response fields that mean “fee waiver available”;
- the member `builderCode` and the standard builder fallback;
- the backend response for a stale, exhausted, or inactive benefit;
- the backend-owned validation and allowance-metering behavior for direct
  orders, retries, and Pay-With-Any-Token orders.

The mobile response is a hint and may be stale. Refresh it through the existing
Predict page preview lifecycle, but the backend remains authoritative for
validation and metering.

## Step 2: Add one client-side Predict fee policy

Build a small Predict-specific policy around
[`app/selectors/subscriptionController.ts`](../../app/selectors/subscriptionController.ts).

Expose the subscription action through
[`app/core/Engine/messengers/predict-controller-messenger/index.ts`](../../app/core/Engine/messengers/predict-controller-messenger/index.ts)
and call it from `PredictController`; do not access `Engine.context` directly
from the controller.

The policy should:

- use the backend response to determine whether the current order can use the
  waiver;
- return the membership `builderCode` when the waiver is available;
- set the effective MetaMask fee to zero when available, otherwise preserve
  the configured standard fee;
- fail closed for missing, stale, inactive, exhausted, or malformed benefits;
- avoid implementing a client-side allowance counter or meter.

Return the effective builder code, effective MetaMask fee, and whether the UI
may present the benefit. The benefit count is used only to choose the current
UI/submission path; it is not part of fee arithmetic. Do not mutate the global
[`protocol/definitions.ts`](../../app/components/UI/Predict/providers/polymarket/protocol/definitions.ts)
environment value at runtime.

## Step 3: Apply the policy to previews

Update:

- [`usePredictOrderPreview.ts`](../../app/components/UI/Predict/hooks/usePredictOrderPreview.ts)
- [`queries/orderPreview.ts`](../../app/components/UI/Predict/queries/orderPreview.ts)
- [`providers/polymarket/utils.ts`](../../app/components/UI/Predict/providers/polymarket/utils.ts)
- [`utils/orders.ts`](../../app/components/UI/Predict/utils/orders.ts)

Refresh benefits and the fee portion of the preview:

- when the Predict page gains focus;
- through the existing active-page preview refresh;

Ensure the current policy is reflected consistently in:

- BUY all-in cost;
- SELL net proceeds;
- balance checks;
- deposit amounts;
- rewards display;
- fee breakdown UI.

Do not add benefit counts or a fee-policy identity to preview query keys.
Explicit benefits/preview refreshes handle stale fee displays. A benefit change
only changes the MetaMask service-fee path and builder code; market and
provider fees remain unchanged.

Keep `marketFee` separate and non-waivable by this client policy.

## Step 4: Add the member builder code to signed orders

Update
[`protocol/orderCodec.ts`](../../app/components/UI/Predict/providers/polymarket/protocol/orderCodec.ts)
so `buildProtocolUnsignedOrder()` accepts an explicit per-order builder code,
with the current protocol code as the default.

Update
[`PolymarketProvider.ts`](../../app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts)
to:

1. use the per-order fee policy selected by `PredictController`;
2. pass the selected builder code into the order codec;
3. include the code in the signed EIP-712 order;
4. omit unnecessary Permit2 fee authorization when the effective service fee
   is zero;
5. preserve correct FAK/FOK behavior.

## Step 5: Keep order submission lean

Update
[`PredictController.ts`](../../app/components/UI/Predict/controllers/PredictController.ts)
to resolve the current fee policy once per `placeOrder` invocation, before
market validation and provider submission. Reuse that preview for direct orders,
Pay-With-Any-Token orders, and the existing retry attempt.

Keep
[`usePredictPlaceOrder.ts`](../../app/components/UI/Predict/hooks/usePredictPlaceOrder.ts)
focused on balance, deposit, loading, and presentation behavior. It should use
the preview already produced by the page instead of issuing another preview
request when the user taps the order button.

Handle:

- stale or unavailable benefits;
- backend rejection of the member route;
- direct BUY and SELL;
- Pay-With-Any-Token BUY.

Do not block order completion on a second benefits request after success or
failure. The next active-page preview obtains the next benefits snapshot, while
the backend remains responsible for consuming the allowance atomically.

## Step 6: Test and verify

Add focused tests for:

- active, inactive, loading, missing, and exhausted benefits;
- only the intended MetaMask fee being waived;
- market and deposit fees remaining intact;
- benefits refresh while the Predict page is active;
- one fee-policy lookup per order submission;
- builder code propagation into the signed order;
- Permit2 omission for waived orders;
- post-deposit retry using the existing order preview.

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
- [`app/components/UI/Predict/hooks/usePredictPlaceOrder.ts`](../../app/components/UI/Predict/hooks/usePredictPlaceOrder.ts)
