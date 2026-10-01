# Predict Pro membership in Predict

This describes the legacy Polymarket Predict flow. `PredictNext` is out of
scope.

## Core rule

Predict Pro is a fee-waiver benefit, not a client-side permission system.

- `SubscriptionController:getBenefits()` tells mobile whether it may show and prepare the waiver.
- Only the MetaMask service fee is waived.
- Provider fees, market fees, and Pay-With-Any-Token deposit fees remain.
- The `builderCode` is fetched from the Subscriptions Benefits API.
- The backend validates the benefit and owns allowance consumption.

## End-to-end flow

### Order Preview

```mermaid
flowchart TD
  A[Predict screen] --> B[Request order preview]
  B --> C[Get subscription benefits]
  C --> D{Waiver appears available?}
  D -->|Yes| E[Membership policy<br/>MetaMask fee = 0<br/>use member builderCode]
  D -->|No or request fails| F[Standard policy<br/>use default fee and builder]
  E --> G[Build preview]
  F --> G
  G --> H[Show fees and order totals]
```

### Order Place

```mermaid
flowchart TD
  A[User taps Place order] --> B[Use the current page preview]
  B --> C{Balance covers preview total?}
  C -->|No| D[Deposit or Pay-With-Any-Token]
  D --> E[Submit after deposit]
  C -->|Yes| E[Submit now]
  E --> F[PredictController.placeOrder]
  F --> G[Get benefits once for this submission]
  G --> H{Current waiver available?}
  H -->|Yes| I[Attach membership fee policy]
  H -->|No or request fails| J[Use standard fee policy]
  I --> K[Validate and sign the CLOB order]
  J --> K
  K --> L[Relayer receives the signed order]
  L --> M[Backend validates and meters the benefit]
  M --> N[Order accepted or rejected]
```

For Pay-With-Any-Token, the post-deposit submission is a separate
`placeOrder` invocation and therefore gets its own benefits lookup. A retry
within the same invocation reuses the already selected policy.

## Membership decision

Mobile presents the waiver only when all of these are true:

```mermaid
flowchart LR
  A[getBenefits response] --> B{eligible = true}
  B -->|No| S[Standard fee]
  B -->|Yes| C{builderCode is present}
  C -->|No| S
  C -->|Yes| D{exhausted = false}
  D -->|No| S
  D -->|Yes| E{remainingTxCount > 0}
  E -->|No| S
  E -->|Yes| W[MetaMask fee waived]
```

`remainingTxCount` is only a preflight signal. Mobile does not decrement it,
reserve it, or decide whether a trade is ultimately entitled to the benefit.

## What is signed and submitted

When the membership route is selected:

1. Mobile builds the order with the member `builderCode`.
2. The user signs that order using the normal CLOB EIP-712 flow.
3. The relayer receives the signed order and submits it to the CLOB.
4. The benefits backend validates the order and the current benefit state.
5. The benefits backend consumes the allowance according to its contract and returns
   the order result.

The standard route uses the default builder code and normal MetaMask fee.

## Stale benefits and fees

The preview can become stale while the user remains on the page. The next
active-page preview refreshes the benefits snapshot. At submission, the
controller obtains one current benefits response before validation and signing.
The backend remains authoritative if the benefit changes between those steps.

The fee result is:

- eligible membership: MetaMask service fee waived;
- inactive, exhausted, missing, malformed, or unavailable benefit: standard
  MetaMask fee;
- all cases: provider, market, and deposit fees remain separate.
