# Remote Venue Adapters

> Governed by the Kalshi ADR set (see [README — Governing ADRs](../README.md#governing-adrs)), primarily `kalshi-mobile-architecture`, `kalshi-security-trust-model`, `kalshi-identity`, `kalshi-kyc-pii-flow`, and `kalshi-funding-rails`.

Remote Venue adapters are a first-class deployment shape for PredictNext. They are **required for Kalshi account-scoped operations** because Kalshi ISV onboarding and trading use server-held admin and per-user credentials.

A generic remote signing-intent framework is not a Kalshi launch prerequisite. Build that only when another remote Venue needs on-device signatures for Venue protocol payloads.

## 1. Deployment Shapes

- A **local Venue Adapter** runs Venue protocol logic in mobile.
- A **remote Venue Adapter** runs a thin canonical adapter in mobile and delegates Venue protocol logic to the MetaMask Predict backend.

During Kalshi delivery:

```text
polymarket -> legacy local production path
kalshi     -> remote adapter only
```

After Kalshi stabilizes, Polymarket may move behind the same backend contract capability by capability.

The backend is not a Venue. Canonical data remains `venueId: 'kalshi'` or `venueId: 'polymarket'`, never `venueId: 'metamask'`.

## 2. Trust Model

### Mobile

Mobile owns:

- user-visible intent and confirmation,
- the selected Funding Wallet,
- wallet transaction signing and submission,
- canonical rendering and workflow projection,
- runtime validation of backend responses,
- client compatibility headers.

Mobile does not own:

- Kalshi admin or per-user PEMs,
- Kalshi ISV sub-account routing,
- authoritative Predict User identity mapping,
- durable financial operation state,
- Venue request signing.

### Backend

The backend owns:

- deriving the authenticated Predict User from the MetaMask bearer token (Authentication-service JWT carrying the canonical profile ID),
- mapping that user to a Venue Account (`profile_id ↔ kalshi_user_id`, plus per-user key custody),
- sending the **Canonical Profile ID verbatim as the Kalshi `external_user_id`** (per the `kalshi-identity` ADR — it identifies but never authorizes; the backend must send the identical server-derived value on `/users/link` and `/users/link/verify`, never a client-echoed one). The backend resolves the **canonical** profile ID — alias chains from [profile pairing](https://docs.cx.metamask.io/docs/apis/user-services/authentication/canonical-profile-id/) resolve server-side, and the legacy pre-pairing `sub` behind the `X-MetaMask-Profile-Pairing` header is never used as the Kalshi identity key,
- admin and per-user credential lifecycle,
- Venue request signing,
- durable Account Setup and Venue Operation records,
- idempotency and lost-response recovery,
- Venue DTO normalization,
- rate limits, retries, protocol versions, and reconciliation,
- observability, redaction, kill switches, and support references.

### Authorization invariant

A privileged backend route never trusts a client-supplied:

- wallet address,
- email,
- profile ID,
- `userId`,
- Kalshi `external_user_id`.

The backend derives the authoritative subject from authentication. A wallet address supplied for a Deposit or Withdraw is an operation parameter and must be validated against product policy; it is not authorization.

### Step-up authorization for high-risk operations

Per trust-model invariant 3, a valid bearer session alone is **insufficient** for:

- withdrawal commit,
- payout-method registration,
- per-user key minting,
- identity remapping (recovery re-link).

Each additionally requires a **server-verifiable step-up factor** (fresh re-authentication, a wallet-signed challenge, or OTP — mechanism selected with AppSec). In-app confirmation UI is UX, not a security control: a compromised client renders its own confirmations. Mobile renders and executes the step-up factor; the backend verifies it.

Mobile should use the existing authenticated MetaMask platform client in `app/core/apiClient.ts` rather than a feature-specific unauthenticated fetch wrapper.

## 3. Mobile Adapter Shape

Kalshi may initially use a concrete `KalshiRemoteAdapter`:

```typescript
const kalshiAdapter = new KalshiRemoteAdapter({ apiClient });
```

That is preferable to prematurely implementing deployment-mode configuration, a generic adapter factory, and signing-intent execution that only one Venue uses.

When a second remote Venue proves shared behavior, extract:

```typescript
new MetaMaskPredictApiAdapter({ venueId, apiClient });
```

Both implement the capability-grouped `VenueAdapter` contract in [adapters.md](./adapters.md).

## 4. Backend Contract

The mobile/backend contract is canonical, versioned, and runtime-validated. It exposes product operations, not raw Kalshi endpoints.

Illustrative routes:

```text
GET  /predict/v1/venues/:venueId/status

GET  /predict/v1/venues/:venueId/events
GET  /predict/v1/venues/:venueId/events/:eventId
GET  /predict/v1/venues/:venueId/markets/:marketId/prices
GET  /predict/v1/venues/:venueId/markets/:marketId/history

GET  /predict/v1/venues/:venueId/account/readiness
POST /predict/v1/venues/:venueId/account/setup/start
POST /predict/v1/venues/:venueId/account/setup/step
GET  /predict/v1/venues/:venueId/account/setup/status

GET  /predict/v1/venues/:venueId/portfolio/balance
GET  /predict/v1/venues/:venueId/portfolio/positions
GET  /predict/v1/venues/:venueId/portfolio/activity
GET  /predict/v1/venues/:venueId/portfolio/orders

POST /predict/v1/venues/:venueId/orders/preview
POST /predict/v1/venues/:venueId/orders/submit
POST /predict/v1/venues/:venueId/orders/:orderId/cancel

POST /predict/v1/venues/:venueId/funding/prepare
POST /predict/v1/venues/:venueId/funding/commit
GET  /predict/v1/venues/:venueId/funding/:operationId
```

Only routes for supported capability modules are exposed.

### Contract requirements

- schemas are shared/generated or validated from the same fixtures in mobile and backend CI,
- unknown response shapes fail closed for writes,
- every response carries canonical `venueId`,
- write preparation returns an opaque operation/preview ID and expiry,
- write commit takes an idempotency key,
- raw Venue errors are mapped to canonical errors,
- credentials, PII, and raw KYC payloads never appear in canonical responses,
- contract version and minimum client version are explicit.

Example headers:

```text
X-Predict-Contract-Version: 1
X-MetaMask-Mobile-Version: <app version>
X-Predict-Supported-Networks: eip155:8453
```

The backend returns an upgrade/unsupported-client error rather than a payload the installed app cannot validate or safely execute.

## 5. Account Setup

Account Setup is a deep workflow across mobile and backend.

Mobile renders canonical steps:

```typescript
type AccountSetupStep =
  | { kind: 'email_otp'; destination?: string } // obfuscated only
  | { kind: 'phone_otp'; destination?: string } // obfuscated only
  | { kind: 'profile_form'; fields: AccountSetupField[] }
  | { kind: 'external_link'; url: string; returnUrl?: string }
  | { kind: 'status_wait'; message: string }
  | { kind: 'complete' };
```

Backend owns:

- new-user versus existing-user-link branching,
- the exact Kalshi error-envelope distinctions,
- durable current step and operation state,
- lost-response recovery,
- per-user credential mint/list/revoke behavior,
- opaque Venue status interpretation rules,
- KYC-provider device/session values when required.

Note: whether email/phone OTP entry transits the relay encrypted or is restructured Kalshi-owned end-to-end is an open question in the `kalshi-kyc-pii-flow` ADR; the step shapes above must not assume plaintext OTP transit through the backend.

### KYC / PII flow — Encrypted Passthrough

The KYC design is owned by the `kalshi-kyc-pii-flow` ADR: **Encrypted Passthrough**, gated on legal sign-off of the cryptographically-blind posture and on Kalshi delivering a session-key endpoint. A plaintext backend conduit (sending profile/KYC fields through the backend, even transiently and unlogged) is **explicitly rejected** — MetaMask infrastructure must be cryptographically blind to PII (trust-model invariant 2); _access_, not retention, is the forbidden act.

Mobile-side flow:

1. client fetches the Kalshi session public key via backend relay; the key must be attributable to Kalshi (pinning or signed attestation), not merely delivered over our relay,
2. client collects the KYC form natively and encrypts PII fields on-device to the Kalshi key; the ciphertext is bound to user/endpoint/freshness (replay and cross-user substitution resistance),
3. client → backend: **ciphertext only**; the backend injects orchestration identifiers derived from the JWT-authenticated profile ID and relays to Kalshi,
4. Kalshi decrypts server-side; status flows back as non-PII fields only,
5. if Socure requires L2 step-up (document photo, selfie/liveness): **client → Socure SDK directly** — biometric material never touches MetaMask infrastructure in any form, not even encrypted,
6. a **consent screen naming Kalshi and Socure** is shown before any PII is collected.

Sensitive-data rules:

- the backend holds no PII decryption key and never decrypts, stores, inspects, or logs plaintext PII,
- the backend persists only the bounded status projection from Kalshi's user-status endpoint: `last_step`, `digital_verification_status`, `digital_verification_result` (opaque strings, displayed/logged but never branched on) plus derived KYC approval — nothing else from the KYC flow,
- response-path fields transiting the relay are enumerated; known PII fragments (e.g. `obfuscated_email`) are tolerated only as masked values,
- PII exists in client memory/form state only during entry and encryption: never in Redux, persisted storage, query keys, analytics, logs, or crash-report breadcrumbs,
- transient client exposure (screenshots, app switcher, keyboard/autofill, clipboard, accessibility services, crash reporting) follows rules defined with AppSec,
- redact request/response bodies, errors, analytics, traces, support tooling, and crash reports,
- tests use synthetic fixtures only.

Fallback if Encrypted Passthrough is not cleared: idOS Relay ETL (recorded in the ADR as the strategic direction). Any requirement that appears to need plaintext PII on MetaMask infrastructure is a stop-and-escalate to privacy/legal, not a design option here.

## 6. Funding

Remote funding uses prepare/confirm/commit.

### Kalshi Deposit

```text
1. Mobile -> backend prepare(amount, network, idempotency key)
2. Backend -> Kalshi one-time amount-specific address
3. Backend -> mobile FundingPlan(wallet_transfer, operationId, exact transaction)
4. Mobile -> normal app confirmation/sign/send
5. Mobile -> backend commit(operationId, txHash, idempotency key)
6. Backend -> Kalshi deposit indication
7. Backend -> durable prefunded/processing receipt
```

Rules:

- mobile validates plan Venue, operation, amount, supported network, canonical asset ID, recipient format, and expiry against the locally stated intent before confirmation,
- mobile derives the critical confirmation rows locally and displays the exact one-time recipient returned by the authenticated backend,
- an amount/asset/network/context mismatch fails closed before wallet signing,
- use the asset/network/address returned by the validated backend plan; do not hardcode POC test constants,
- the transaction plan must be executable, not an address plus manual hash instructions,
- if wallet submission succeeds and indication fails, the operation remains resumable,
- repeating prepare/commit with the same idempotency key does not reserve or credit twice,
- prefunding exposure limits and settlement-failure handling follow the approved commercial/operations policy rather than mobile assumptions.

**Base USDC only, both directions**, is the launch scope recommended by the `kalshi-funding-rails` ADR (pending sign-off): the only network supported for both deposits and withdrawals, avoiding trap states. Additional networks are additive capability work, not a foundation requirement. `X-Predict-Supported-Networks`, plan validation, and test fixtures assume Base-only at launch.

### Kalshi Withdraw

```text
1. Mobile -> backend prepare(amount, destination, network, idempotency key)
2. Backend -> canonical Venue operation preview
3. Mobile -> explicit user confirmation + server-verifiable step-up factor
4. Mobile -> backend commit(operationId, idempotency key)
5. Backend -> payout method register/reuse + Kalshi withdrawal (transfer_id stored durably)
6. Backend -> receipt(status: submitted, venue reference)
7. Backend -> reconcile via Kalshi transfer-status endpoint; UI stays
   submitted/processing until a confirmed terminal status
```

Rules (per the `kalshi-funding-rails` ADR):

- preparing must not withdraw,
- **payout methods are the user's own wallets only**, registered via **proof of wallet control**: the backend issues a challenge nonce bound to profile ID + chain + address + expiry, the wallet signs it, and only proven addresses are registrable. A bearer session alone never suffices to register a payout destination,
- withdrawal commit and payout registration require step-up authorization (§2),
- Kalshi has confirmed a transfer-status endpoint will be available at launch (shape unconfirmed — likely status-by-`transfer_id`); the backend polls it to reconcile. Until completion is confirmed, the UI reports submitted/processing and never claims completion,
- **ambiguous lost commit**: if the withdrawal commit response is lost, the backend never received `transfer_id`, and status lookup cannot distinguish “never submitted” from “submitted.” Until Kalshi provides endpoint idempotency or a per-user transfer listing, a lost commit response **blocks retry of that operation pending manual reconciliation** — it must never trigger an automatic re-submit,
- the backend keeps the operation and Venue transfer reference for support reconciliation.

## 7. Order Preview and Submission

Kalshi Orders are signed server-side with the per-user Kalshi credential.

```text
1. Mobile requests canonical preview intent.
2. Backend reads the current Venue quote and computes canonical fees/limits.
3. Backend returns previewId + expiry + display values.
4. User confirms.
5. Mobile submits previewId + idempotency key.
6. Backend revalidates account, price, quantity, fees, expiry, and max spend.
7. Backend submits with a stable Venue client order ID.
8. Backend returns canonical Order Receipt; portfolio later reconciles from Fills.
```

The backend does not trust a full mutable preview echoed by mobile.

For an Immediate-Order-only Kalshi launch, omit cancel/amend/open-order routes and UI. If Resting Orders are enabled, those operations and their reconciliation become mandatory.

## 8. Generic Signing Intents — Deferred

Kalshi launch does not require a generic signing-intent protocol:

- Kalshi Venue Orders use backend-held Kalshi credentials.
- Deposits use the app's normal wallet transaction confirmation.
- Withdrawals are server-side Venue operations after explicit mobile confirmation.

A future remote Polymarket adapter may require EIP-712, personal-sign, EVM transaction, or other Venue protocol signatures. Design signing intents then, with two concrete consumers and real payloads.

When introduced, the minimum safety invariants are:

- selected account, Venue, operation, chain, recipient/spender, amount, and expiry match the confirmed intent,
- mobile derives critical display semantics independently where possible,
- prepare responses are integrity-bound to operation IDs,
- signatures cannot be replayed across operations,
- unsupported installed clients fail closed.

Do not add this framework to the Kalshi critical path.

## 9. Reliability and Retry Policy

### Reads

- retry bounded transient failures,
- honor Venue/backend rate limits,
- use cached data only within documented safety/freshness policy,
- degrade public reads separately from writes.

### Writes

- no blind automatic retry,
- every prepare and commit has an idempotency key,
- backend stores the operation before an external irreversible call,
- lost responses reconcile by operation ID where the venue contract makes that safe; where it does not (withdrawal commit — see §6), the operation blocks pending manual reconciliation instead,
- app teardown stops observation but not the operation,
- conflicting reuse of an idempotency key fails explicitly,
- support can trace an operation without access to secrets or PII.

## 10. Credential Lifecycle

Production backend requirements (per trust-model invariant 1):

- managed secret/KMS or envelope-encrypted storage,
- strict admin versus per-user key scopes,
- **standing per-user keys are minted `read`/`write` only — never `write::transfer`**: the hot-path key store cannot move funds; its compromise is a trading incident, not a theft incident,
- **withdrawal commits use an ephemeral transfer-scoped key**: minted under step-up authorization, used once, revoked immediately,
- withdrawals can reach only pre-registered, proof-of-control-verified user wallets (payout allowlist),
- source-IP allowlisting for production admin calls,
- private key written atomically before acknowledging key mint,
- list/revoke/remint recovery when a one-time private-key response is lost,
- rotation and incident revocation procedures,
- no response-body logging for key-mint calls,
- audit logs contain references and outcomes, not key material.

A local Kalshi adapter fallback is forbidden because it would violate these constraints.

## 11. Testing

### Contract tests

- mobile and backend validate the same canonical fixtures,
- unknown fields may be tolerated only where schemas explicitly allow them,
- missing/invalid required write fields fail closed,
- compatibility versions are exercised.

### Backend adapter tests

- request-signing preimage and timestamp behavior,
- nested and flat Kalshi error envelopes,
- Account Setup new/link/resume/lost-response paths,
- credential mint/list/revoke/remint,
- Deposit prepare/indication idempotency,
- Withdraw prepare/commit and reconciliation,
- Order preview expiry, revalidation, submit idempotency,
- Fill and Settlement mapping,
- rate limiting and kill switches,
- secret/PII log redaction.

### Mobile tests

- authenticated transport use,
- runtime response validation,
- setup/readiness state transitions,
- wallet transfer confirmation handoff,
- operation resume after app restart,
- honest pending/submitted states,
- read-only/unavailable degradation,
- no unsupported Claim or Resting Order affordance.

## 12. Rollout

Recommended Kalshi rollout:

1. internal hidden route with production architecture,
2. demo Account Setup and funding validation,
3. read-only cohort,
4. setup/deposit/balance cohort,
5. Immediate Order cohort,
6. Withdraw cohort,
7. broader rollout after security/privacy/ops gates.

Rollback disables Kalshi writes or the entire Kalshi surface. It never moves credentials on-device and never changes the legacy Polymarket lane.

## 13. Open Decisions

Most formerly open decisions are now owned by the Kalshi ADR set; their live status and open questions are tracked in each ADR's **Open Questions / External Dependencies** section, not here:

- Predict User identity → `kalshi-identity` (Canonical Profile ID recommended; privacy sign-off pending),
- KYC/PII design → `kalshi-kyc-pii-flow` (Encrypted Passthrough recommended; legal ruling + Kalshi session-key endpoint gating),
- funding rail scope → `kalshi-funding-rails` (Base-only recommended),
- withdrawal reconciliation and ambiguous-commit handling → `kalshi-funding-rails`,
- recovery for lost link/verification and key-mint responses → `kalshi-account-recovery`,
- backend owner/SLO/on-call → `kalshi-integration-overview`.

Remaining open here:

1. separate versus merged launch surface (product),
2. Immediate versus Resting Order scope (product),
3. current Kalshi production/demo endpoint and enablement contract,
4. step-up factor mechanism selection (with AppSec).
