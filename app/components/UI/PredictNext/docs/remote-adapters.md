# Remote Venue Adapters Alternative

This document describes an alternative deployment model for the PredictNext adapter layer. The currently documented target architecture keeps venue adapters in the mobile app. This alternative keeps the same `VenueAdapter` contract but allows an adapter implementation to delegate venue-specific work to a MetaMask Predict backend API.

## 1. Summary

PredictNext should support **local** and **remote** venue adapters behind the same canonical `VenueAdapter` seam.

- A **Local Venue Adapter** runs in the mobile app and calls a venue directly, e.g. `PolymarketAdapter` calling Gamma/CLOB/contracts.
- A **Remote Venue Adapter** runs in the mobile app but calls MetaMask's Predict backend, e.g. `MetaMaskPredictApiAdapter`. The backend owns the real venue adapters and calls Polymarket, Kalshi, or future venues.

From product services' perspective, both implementations are identical:

```text
Product services
  -> PredictSessionService.getClient(ownerAddress, venueId)
    -> session-bound PredictClient
      -> VenueAdapter implementation
        -> local venue API OR MetaMask Predict backend API
```

The remote implementation is not a second product architecture. It is another implementation of the same `VenueAdapter` contract.

## 2. Motivation

Prediction venues can make breaking changes faster than MetaMask Mobile can safely release and users can update. Recent examples include Polymarket CLOB v2 changes and Proxy Wallet to Deposit Wallet migration work.

A mobile-local adapter means the app can break when a venue changes:

```text
Mobile PolymarketAdapter knows CLOB v1 payload shape
Polymarket ships CLOB v2 payload shape
Installed mobile clients cannot submit orders until a mobile release ships and users update
```

A remote adapter lets MetaMask change venue integration logic server-side:

```text
Mobile MetaMaskPredictApiAdapter knows stable Predict API contract
Backend PolymarketAdapter knows CLOB v1/v2 venue details
Polymarket ships CLOB v2
Backend adapter is updated
Installed mobile clients keep using the same Predict API contract
```

## 3. Non-goals

The remote adapter model does not mean:

- the backend gets custody of user private keys
- the backend signs wallet payloads without user consent
- mobile becomes a generic opaque-signing surface with no safety checks
- venue-specific product concepts leak into UI components
- local adapters are deleted immediately

The goal is to move volatile venue implementation details to the backend while keeping user authorization and wallet signing on-device.

## 4. Recommended shape

### 4.1 Keep `VenueAdapter` as the only product seam

Do not add a separate `RemotePredictClient` interface. The same contract should support both modes:

```typescript
export interface VenueAdapter {
  readonly venueId: PredictVenueId;
  readonly capabilities: VenueCapabilities;

  fetchEvents(
    params: FetchEventsParams,
    session: PredictVenueSession,
  ): Promise<PaginatedResult<PredictEvent>>;
  getOrderPreview(
    params: OrderPreviewParams,
    session: PredictVenueSession,
  ): Promise<OrderPreview>;
  submitOrder(
    params: SubmitOrderParams,
    session: PredictVenueSession,
  ): Promise<OrderReceipt>;
  createDepositPlan(
    params: CreateDepositPlanParams,
    session: PredictVenueSession,
  ): Promise<FundingPlan>;
  createWithdrawPlan(
    params: CreateWithdrawPlanParams,
    session: PredictVenueSession,
  ): Promise<FundingPlan>;
  createClaimPlan(
    params: CreateClaimPlanParams,
    session: PredictVenueSession,
  ): Promise<FundingPlan>;
  // ...remaining canonical methods
}
```

Then register either implementation for a venue:

```typescript
const adapterRegistry = {
  polymarket: featureFlags.remotePredictAdapters
    ? new MetaMaskPredictApiAdapter({ venueId: 'polymarket', apiClient })
    : new PolymarketAdapter({ gammaClient, clobClient }),

  kalshi: featureFlags.remotePredictAdapters
    ? new MetaMaskPredictApiAdapter({ venueId: 'kalshi', apiClient })
    : new KalshiAdapter({ kalshiClient }),
};
```

`MetaMaskPredictApiAdapter` is a mobile adapter implementation. The backend has its own internal venue adapters.

```text
Mobile
  MetaMaskPredictApiAdapter(venueId: polymarket)
    -> POST /predict/v1/polymarket/orders/submit

Backend
  Predict API router
    -> BackendPolymarketAdapter
      -> Polymarket APIs/contracts
```

### 4.2 Prefer “configured remote adapter per venue” over “MetaMask as a venue”

The backend is not itself a prediction venue. Product state should still say `venueId: 'polymarket'` or `venueId: 'kalshi'`, not `venueId: 'metamask'`.

Use class names such as:

- `MetaMaskPredictApiAdapter`
- `RemoteVenueAdapter`
- `BackendVenueAdapter`

Avoid making `metamask` a product venue unless MetaMask itself becomes the exchange/counterparty.

## 5. Stable backend API contract

The backend API should expose canonical Predict workflows, not venue pass-through endpoints.

Recommended high-level endpoints:

```text
GET  /predict/v1/venues
GET  /predict/v1/venues/:venueId/status

GET  /predict/v1/:venueId/account/readiness
POST /predict/v1/:venueId/account/setup/start
POST /predict/v1/:venueId/account/setup/step
GET  /predict/v1/:venueId/account/setup/status

GET  /predict/v1/:venueId/events
GET  /predict/v1/:venueId/events/:eventId
GET  /predict/v1/:venueId/markets/:marketId/prices
GET  /predict/v1/:venueId/markets/:marketId/history

GET  /predict/v1/:venueId/portfolio/positions
GET  /predict/v1/:venueId/portfolio/activity
GET  /predict/v1/:venueId/portfolio/balance

POST /predict/v1/:venueId/orders/preview
POST /predict/v1/:venueId/orders/prepare
POST /predict/v1/:venueId/orders/submit

POST /predict/v1/:venueId/funding/deposit/prepare
POST /predict/v1/:venueId/funding/withdraw/prepare
POST /predict/v1/:venueId/funding/claim/prepare
POST /predict/v1/:venueId/funding/submit
GET  /predict/v1/:venueId/funding/:fundingId/status
```

Mobile adapter methods map canonical calls to these endpoints. They should not expose Gamma/CLOB/Kalshi endpoint names.

## 6. Signing intent protocol

The hardest part of moving adapters remote is wallet signing. The backend can construct venue-specific payloads, but the mobile app must still request user consent and perform signing with the user's wallet.

The remote adapter should use a stable **Signing Intent** protocol.

### 6.1 Prepare/submit pattern

For operations requiring signatures, use a two-step pattern:

```text
1. Mobile calls backend prepare endpoint with canonical product intent.
2. Backend returns one or more SigningIntents plus an operationId.
3. Mobile displays canonical confirmation UI and signs each intent.
4. Mobile calls backend submit endpoint with operationId + signatures.
5. Backend verifies signatures and submits to the venue.
6. Backend returns canonical receipt.
```

Example order flow:

```text
TradingService.placeOrder()
  -> PredictClient.getOrderPreview(params)
  -> user confirms preview
  -> PredictClient.submitOrder(params)
       MetaMaskPredictApiAdapter:
         POST /orders/prepare
         sign returned SigningIntents
         POST /orders/submit
  -> OrderReceipt
```

The product service still calls one canonical `submitOrder()` method. The remote adapter hides the prepare/sign/submit mechanics inside the adapter implementation.

### 6.2 Signing intent types

The backend may request only signing primitives supported by the installed mobile client.

```typescript
export type SigningIntent =
  | Eip712TypedDataSigningIntent
  | PersonalSignSigningIntent
  | EvmTransactionSigningIntent
  | SolanaTransactionSigningIntent
  | SolanaMessageSigningIntent;

export interface BaseSigningIntent {
  id: string;
  purpose:
    | 'place_order'
    | 'cancel_order'
    | 'deposit'
    | 'withdraw'
    | 'claim'
    | 'account_setup';
  account: string;
  expiresAt: string;
  display: SigningDisplay;
  context: SigningIntentContext;
}

export interface Eip712TypedDataSigningIntent extends BaseSigningIntent {
  kind: 'eip712_typed_data';
  chainId: string;
  domain: unknown;
  types: Record<string, unknown>;
  primaryType: string;
  message: unknown;
}

export interface EvmTransactionSigningIntent extends BaseSigningIntent {
  kind: 'evm_transaction';
  chainId: string;
  transaction: ChainTransactionRequest;
}

export interface SolanaTransactionSigningIntent extends BaseSigningIntent {
  kind: 'solana_transaction';
  cluster: 'mainnet' | 'devnet';
  transaction: ChainTransactionRequest;
}
```

### 6.3 Display and semantic context

Signing payloads must not be fully opaque. Each intent includes a display model and a machine-checkable product context.

```typescript
export interface SigningDisplay {
  title: string;
  description?: string;
  rows: { label: string; value: string }[];
  riskLevel: 'low' | 'medium' | 'high';
  consentText: string;
}

export type SigningIntentContext =
  | {
      type: 'order';
      venueId: PredictVenueId;
      eventId: string;
      marketId: string;
      outcomeId: string;
      side: 'buy' | 'sell';
      size: DecimalString;
      limitPrice: DecimalString;
      maxSpend?: DecimalString;
    }
  | {
      type: 'funding';
      venueId: PredictVenueId;
      operation: FundingOperation;
      amount?: DecimalString;
      network?: ChainNamespace;
      destinationLabel?: string;
    }
  | {
      type: 'account_setup';
      venueId: PredictVenueId;
      step: string;
    };
```

Mobile should render canonical confirmation content from the product context and display rows. Mobile may pass the raw EIP-712 or transaction payload to wallet signing APIs without understanding venue-specific fields.

## 7. Client capability negotiation

Backend flexibility only helps if the backend knows what the installed mobile client can safely handle.

Every Predict API request should include:

```text
X-Predict-Client-Contract-Version: 1
X-MetaMask-Mobile-Version: <app version>
X-Predict-Supported-Signing-Intents: eip712_typed_data,evm_transaction,personal_sign
X-Predict-Supported-Networks: eip155:137,solana:mainnet
```

The backend response may include:

```typescript
export interface PredictApiCompatibility {
  contractVersion: number;
  minSupportedClientContractVersion?: number;
  upgradeRequired?: boolean;
  unsupportedReason?: PredictErrorCode;
}
```

If a venue migration requires a signing primitive unavailable in older clients, the backend must return a canonical `UPGRADE_REQUIRED` or `UNSUPPORTED_CLIENT_CAPABILITY` error rather than returning an unknown payload shape.

## 8. Safety invariants on mobile

Even with backend-owned adapters, mobile must keep lightweight authorization checks:

- signing account equals selected MetaMask account
- venue ID matches the active venue
- intent purpose matches the current workflow
- intent has not expired
- chain/network is allowlisted for Predict
- EVM transaction recipient/spender/verifying contract is allowlisted when known
- max spend or amount does not exceed the user-confirmed preview
- operation ID returned by `/prepare` matches the one sent to `/submit`
- signatures are never reused across operation IDs

These checks protect the user without requiring mobile to know Polymarket CLOB v2 or Kalshi ISV internals.

## 9. Session and auth model

`PredictSessionService` should continue to own app-side session state. For remote adapters, the session contains MetaMask Predict API auth context rather than venue API keys.

Local adapter session example:

```typescript
interface LocalPolymarketSession extends PredictVenueSession {
  mode: 'local';
  clobApiKey: string;
  accountAddress: string;
}
```

Remote adapter session example:

```typescript
interface RemotePredictSession extends PredictVenueSession {
  mode: 'remote';
  accessToken: string;
  ownerAddress: string;
  clientContractVersion: number;
  supportedSigningIntents: SigningIntent['kind'][];
}
```

Raw venue API keys, Kalshi sub-account credentials, Polymarket CLOB credentials, and venue migration state should live on the backend whenever the remote adapter is active.

## 10. Funding plans with remote adapters

Remote adapters still return canonical `FundingPlan`s. The difference is where venue preflight happens.

Local Polymarket example:

```text
PolymarketAdapter.createDepositPlan()
  -> constructs local EVM wallet-transfer plan
```

Remote Polymarket example:

```text
MetaMaskPredictApiAdapter.createDepositPlan()
  -> POST /funding/deposit/prepare
  -> backend determines Proxy Wallet vs Deposit Wallet mechanics
  -> returns canonical FundingPlan with signing intents or wallet transaction request
```

Remote Kalshi example:

```text
MetaMaskPredictApiAdapter.createDepositPlan({ network: 'solana', amount })
  -> backend reserves one-time Solana USDC deposit address
  -> returns FundingPlan(kind: 'wallet_transfer', network: 'solana', afterSubmit: deposit_indication)
  -> mobile signs/sends transfer
  -> adapter calls /funding/submit with txHash
  -> backend submits deposit indication to Kalshi
```

## 11. Account setup with remote adapters

Remote adapters are especially useful for account setup because setup workflows change often and can be venue-specific.

Mobile should keep a canonical step renderer:

```typescript
export type AccountSetupStep =
  | { kind: 'email_otp'; destination: string }
  | { kind: 'phone_otp'; destination: string }
  | { kind: 'profile_form'; fields: AccountSetupField[] }
  | { kind: 'external_link'; url: string; returnUrl?: string }
  | { kind: 'status_wait'; message: string }
  | { kind: 'complete' };
```

Backend decides whether a step means:

- Polymarket Deposit Wallet migration
- Polymarket wallet setup
- Kalshi new-user KYC
- Kalshi existing-user linking
- future venue-specific onboarding

Mobile renders and submits canonical steps only.

## 12. Adapter registry and rollout strategy

The adapter registry should support per-venue deployment mode:

```typescript
export type AdapterDeploymentMode = 'local' | 'remote';

export interface AdapterRegistryConfig {
  defaultMode: AdapterDeploymentMode;
  perVenueMode?: Partial<Record<PredictVenueId, AdapterDeploymentMode>>;
}
```

Rollout examples:

```text
Phase A: polymarket=local, kalshi=none
Phase B: polymarket=local with remote shadow reads
Phase C: polymarket=remote for read APIs, local for order submit
Phase D: polymarket=remote for reads + orders + funding
Phase E: kalshi=remote only
```

The backend can also support shadow comparison:

```text
Mobile local adapter returns result used by app
Remote adapter fetches same result in background
Telemetry compares canonical output shape and major values
```

Shadowing helps prove backend parity before switching production traffic.

## 13. Testing strategy

### Mobile tests

- `MetaMaskPredictApiAdapter` maps backend canonical responses to `VenueAdapter` return types.
- signing intent executor rejects unsupported intent kinds.
- signing intent executor rejects account, venue, chain, expiry, and amount mismatches.
- remote adapter converts backend errors to canonical `PredictErrorCode`s.
- local and remote adapter contract tests share the same fixtures.

### Backend tests

- backend venue adapters map venue DTOs into canonical Predict API responses.
- Polymarket CLOB v1/v2 payload changes are covered behind stable signing intent fixtures.
- Deposit Wallet migration cases return stable account readiness/setup/funding responses.
- Kalshi ISV setup, deposit indication, withdrawal, and automatic settlement cases return canonical workflows.
- compatibility matrix rejects unsupported mobile client capabilities.

### Contract tests

Create shared JSON fixtures for the Predict API contract:

```text
fixtures/predict-api/v1/events.response.json
fixtures/predict-api/v1/order.prepare.eip712.response.json
fixtures/predict-api/v1/funding.deposit.solana.response.json
fixtures/predict-api/v1/account.setup.otp.response.json
```

Both mobile and backend CI should validate against these fixtures or generated schemas.

## 14. Trade-offs

### Benefits

- Venue breaking changes can often be fixed server-side.
- Mobile product services remain venue-agnostic.
- Backend can coordinate migrations such as Proxy Wallet to Deposit Wallet.
- Kalshi-style onboarding and funding workflows fit without bloating mobile adapters.
- Enables runtime venue kill switches, degraded modes, and compatibility gating.

### Costs

- Predict backend becomes a critical path for trading, funding, and portfolio reads.
- Requires strong API versioning and contract tests.
- Requires careful signing intent safety design.
- Adds latency and backend reliability requirements.
- More backend observability, alerting, and incident response needed.

### Main risk

The main risk is turning mobile into an unsafe generic signing client. Avoid that by requiring semantic `SigningIntentContext`, display metadata, allowlists, expiry, operation IDs, and client-side invariant checks.

## 15. Implementation plan

### Step 1 — Document the deployment mode

- Add `AdapterDeploymentMode = 'local' | 'remote'` to adapter docs and foundation types.
- Keep `VenueAdapter` unchanged as the product seam.
- Add `MetaMaskPredictApiAdapter` as a planned adapter implementation.

### Step 2 — Define Predict API schemas

- Generate or hand-author schemas for canonical backend responses.
- Include signing intent schemas.
- Add compatibility headers and error codes.

### Step 3 — Build remote read adapter first

Implement remote methods for low-risk reads:

- `fetchEvents`
- `fetchEventById`
- `fetchPrices`
- `fetchPositions`
- `fetchActivity`
- `fetchBalance`
- `fetchVenueStatus`
- `fetchAccountReadiness`

### Step 4 — Add account setup and funding prepare flows

- Add remote `startAccountSetup`, `submitAccountSetupStep`, and `resumeAccountSetup` through `PredictSessionService`.
- Add remote `createDepositPlan`, `createWithdrawPlan`, `createClaimPlan`.
- Add `submitFundingFollowUp` for Kalshi-style deposit indications.

### Step 5 — Add signing intent executor

Create a mobile primitive used by `MetaMaskPredictApiAdapter`:

```typescript
interface SigningIntentExecutor {
  execute(
    intent: SigningIntent,
    expectedContext: SigningIntentContext,
  ): Promise<SigningResult>;
}
```

It owns validation, confirmation handoff, signing API calls, and returned signature formatting.

### Step 6 — Move order submission remote

- Implement `/orders/preview`, `/orders/prepare`, and `/orders/submit`.
- The backend owns venue order payload construction.
- Mobile signs returned intents and submits signatures.
- Backend verifies and submits to venue.

### Step 7 — Roll out per venue with fallback

- Start with remote reads in shadow mode.
- Enable remote reads for a small cohort.
- Enable remote funding/setup.
- Enable remote order submission only after signing intent safety checks and contract tests are stable.
- Keep local adapter fallback while the backend path matures.

## 16. Open questions

1. Should the remote adapter hide prepare/sign/submit inside `submitOrder()`, or should `TradingService` explicitly model these steps for better UI progress reporting?
2. Which signing intent kinds must be supported in the first mobile version?
3. How much of the signing display should be backend-provided vs mobile-derived from `SigningIntentContext`?
4. Should the backend sign prepare responses so mobile can verify the operation payload before signing?
5. What is the initial fallback policy if remote adapter order submission fails: retry remote only, fall back to local, or disable trading?
6. How do we handle old clients when a venue migration requires a new signing primitive?
7. Should `MetaMaskPredictApiAdapter` be configured per venue, or should one instance route all venues internally?

## 17. Recommendation

Support both local and remote adapters, but treat the remote adapter as the long-term production default for volatile venues.

Use local adapters for:

- early development
- fallback during backend incidents
- contract-test parity
- venues whose APIs are stable enough or whose backend integration is not ready

Use remote adapters for:

- Polymarket order/funding workflows that can break with CLOB or wallet migrations
- Kalshi ISV onboarding, funding, trading, and settlement
- any venue requiring frequent server-side policy, auth, or migration handling

The architecture should remain adapter-contract-first: product services call `PredictClient`; `PredictSessionService` binds a session; the registered adapter decides whether the operation is local or remote.
