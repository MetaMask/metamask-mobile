# Kalshi-First Vertical Delivery

> Governed by the Kalshi ADR set (see [README — Governing ADRs](../../README.md#governing-adrs)). The ADRs are `Proposed` (in review); this track sequences delivery against their recommendations and must be updated if review changes them.

## Status

This is the active delivery track for Kalshi. It is the shortest production path that preserves the core PredictNext seams without making the full Polymarket rewrite a launch dependency.

The long-term architecture remains venue-neutral. Kalshi is simply the first production implementation of the new account, funding, trading, and remote-adapter modules.

## Decision

Build a **Kalshi-first vertical strangler**:

- keep production Polymarket on the legacy `Predict/` stack during Kalshi delivery,
- build only the PredictNext modules required by each Kalshi vertical slice,
- require a remote MetaMask Predict backend for all account-scoped Kalshi operations,
- reuse app-level authentication, transaction, confirmation, analytics, and design-system infrastructure,
- launch behind a Kalshi-specific feature flag and kill switch,
- port Polymarket through the proven PredictNext seams after Kalshi is stable.

Do not:

- finish every phase of the Polymarket migration before Kalshi,
- add Kalshi branches to the legacy `PredictController` or `PolymarketProvider`,
- productionize the `poc-kalshi` branch in place,
- implement the complete target UI, live-data stack, generic signing-intent framework, or legacy compat layer as Kalshi launch prerequisites.

## Preconditions

Most preconditions are now owned by the ADR set; track their status there:

1. **Predict User identity** → `kalshi-identity` ADR: Canonical Profile ID is the internal identity anchor; raw ID vs. deterministic per-ISV pseudonym for Kalshi is pending Privacy/Legal. The identity model — profile pairing, aliases, canonical election — is documented by the identity platform ([Canonical Profile ID](https://docs.cx.metamask.io/docs/apis/user-services/authentication/canonical-profile-id/)); the backend must resolve canonical IDs through alias chains. Planned email/social conflict guardrails are launch dependencies, not assumed shipped behavior.
2. **KYC/PII path** → `kalshi-kyc-pii-flow` ADR: Encrypted Passthrough (legal ruling on cryptographic blindness and a Kalshi encryption public-key mechanism are gating; no per-session key is required).
3. **Funding rail** → `kalshi-funding-rails` ADR: Base USDC only, both directions (sign-off pending).
4. **Backend ownership** → `kalshi-integration-overview` ADR open questions: production team, SLO, on-call, static egress/IP allowlisting, secret operations, and reconciliation support.

Still owned here (product decisions before production implementation):

5. **Product topology** — separate/flagged Kalshi surface or merged multi-venue feed and portfolio. The default for fastest delivery is a separate surface.
6. **Funding Wallet policy** — which selected wallet may deposit to or receive withdrawals from the Venue Account.
7. **Order scope** — Immediate Orders only for v1, preferably fill-or-kill, unless Resting Orders are a launch requirement.

## Transitional Architecture

```text
Legacy Polymarket lane
Existing Predict UI -> legacy PredictController -> PolymarketProvider -> Polymarket

New Kalshi lane
Kalshi route / reusable presentation
  -> PredictNext modules required by the current slice
    -> Kalshi remote Venue Adapter
      -> authenticated MetaMask API client
        -> MetaMask Predict backend
          -> durable user/setup/operation store
          -> managed encrypted Kalshi credential custody
          -> backend Kalshi adapter
            -> Kalshi ISV and trading APIs

Wallet transfer
FundingExecutor -> app transaction/confirmation infrastructure -> Base USDC
  -> operation reference + transaction hash -> backend -> Kalshi deposit indication
```

There is no local Kalshi fallback. If the backend or Kalshi account path is unavailable, disable Kalshi writes and use read-only cached/public data only when it is safe.

## Stage 0 — Contract and Security Correction

### Goal

Turn the POC findings into production contracts before code is copied.

### Deliverables

- rotate or revoke the committed POC admin credential and any user credentials exposed through debug logs,
- remove secret material from shared Git history,
- update the Predict glossary to separate Predict User, Funding Wallet, and Venue Account,
- define `PredictUserContext` and venue-qualified `PredictAccountScope`,
- split public market data from account-scoped Venue capabilities,
- add the missing Account Setup adapter interface,
- define prepare/confirm/commit semantics for funding,
- define preview expiry and idempotent submission semantics for Orders,
- decide Immediate Order versus Resting Order launch behavior,
- define the mobile/backend contract and compatibility version.

### Exit criteria

- no client-supplied wallet address, email, or external user ID is treated as backend authorization,
- no Kalshi credential or KYC payload can enter source control, Redux, persisted mobile storage, analytics, or logs,
- all P0 product and operational decisions are closed.

## Stage 1 — Production Walking Skeleton

### Goal

Prove one authenticated mobile request can traverse the owned backend and return one validated canonical response.

### Mobile

- use the existing authenticated MetaMask API client rather than the POC `BackendClient`,
- add a thin Kalshi remote adapter for the first canonical read,
- validate backend responses at runtime with existing repository schema tooling,
- register only the modules required by the enabled Kalshi surface,
- add a venue-specific feature flag and unavailable/read-only states.

### Backend

- derive the authoritative Predict User from the bearer token,
- derive the Kalshi `external_user_id` from the Canonical Profile ID (raw ID or deterministic per-ISV pseudonym, per the Privacy/Legal decision), sending the same server-derived value on `/users/link` and `/users/link/verify`, and keep the durable `profile_id ↔ kalshi_user_id` mapping,
- add static egress for Kalshi production IP allowlisting,
- store admin and per-user PEMs under backend-controlled managed encrypted custody; select direct KMS/HSM signing or envelope-encrypted PEM use after validating key-format support, in-memory policy, RPS, latency, and quotas,
- add durable user, setup, and operation records,
- add contract-version negotiation, structured redacted logging, metrics, and a kill switch,
- implement one public market-data read through the backend Kalshi adapter.

### Exit criteria

- no privileged route trusts a client-supplied identity,
- no secret or PII appears in logs,
- mobile and backend validate the same contract fixture,
- a backend outage degrades only Kalshi.

## Stage 2 — First Vertical Slice

### Goal

Ship the highest-risk Kalshi path end to end:

```text
Account Setup -> Account Readiness -> Deposit -> Balance
```

### Scope

- new-user and existing-user-link setup paths,
- consent screen naming Kalshi and Socure before any PII collection,
- Encrypted Passthrough KYC entry (per `kalshi-kyc-pii-flow`): fetch/authenticate the Kalshi encryption public key, encrypt PII on-device, relay ciphertext only; bounded non-PII status readback,
- native-vs-JavaScript encryption evaluation for sensitive-buffer handling and representative-device performance,
- client-direct Socure SDK integration for L2 step-up (documents/selfie never touch MetaMask infrastructure), including bundle size, compatibility, permission, telemetry, and traffic-path validation,
- email/phone verification and KYC status handling,
- durable setup resume after app/backend restart,
- correct distinction between Kalshi's flat account-exists response and duplicate external-user-ID error,
- one-time, amount-specific Base USDC deposit plan,
- app-native transfer confirmation and submission,
- deposit indication with no assumed Venue idempotency: ambiguous outcomes remain blocked pending reconciliation rather than auto-resubmitted,
- durable operation status and balance refresh.

### Required failure scenarios

- app closes before or after wallet submission,
- backend times out after Kalshi accepts a setup or indication request,
- the same step or indication is submitted twice,
- a one-time API key response is lost,
- a per-user key is revoked or unavailable,
- KYC remains pending or is rejected,
- the deposit address/plan expires,
- wallet transfer succeeds but the indication initially fails.

### Exit criteria

- users can resume observation without blindly repeating irreversible work,
- local duplicate requests reuse the backend operation identity; external retry occurs only with verified Venue safety semantics,
- balance and operation state reconcile after restart where Kalshi exposes enough evidence, otherwise remain explicitly blocked for support.

## Stage 3 — Trading and Portfolio Slice

### Goal

Deliver browse, preview, Order placement, Position, Fill, and Settlement behavior.

### Scope

- public Event/Market reads, venue-qualified query keys, and canonical response validation,
- short-lived Order Preview with backend-issued preview ID and expiry,
- server-side revalidation of price, count, fees, max spend, and Venue Account,
- idempotent Order submission with stable client order ID,
- Immediate Order flow for buy and Cash Out,
- Balance and Position invalidation/reconciliation,
- Activity derived from Kalshi Fills and Settlements, not inferred from Order records,
- automatic Settlement with no Claim affordance.

If Resting Orders are required, this stage also needs:

- open-order reads,
- cancel, amend, and decrease operations,
- partial-fill state,
- app-restart reconciliation,
- user/order live updates or a polling replacement.

### Exit criteria

- expired previews cannot be submitted,
- repeated submissions return the same Venue Operation result,
- Position and Activity data reconcile against the Venue,
- no Claim path appears for Kalshi.

## Stage 4 — Withdraw and Launch Hardening

### Scope

- side-effect-free withdrawal preparation,
- explicit user confirmation **plus server-verifiable Predict User step-up authorization** before withdrawal commit and payout-method registration (trust-model invariant 3); the factor must be unavailable from a stolen bearer token and bound to the destination/operation,
- payout-method registration behind the backend adapter with **proof of destination-wallet control** (backend-issued challenge nonce bound to canonical profile ID + chain + address + purpose + expiry). This creates a profile↔wallet association but is separate from Predict User authorization,
- no assumed withdrawal idempotency; a lost commit response **blocks retry pending manual reconciliation** — never an automatic re-submit (per `kalshi-funding-rails` ambiguous-commit rule),
- honest `submitted`/`processing` UX until Kalshi's transfer-status endpoint (confirmed for launch; shape unconfirmed) reports a terminal status,
- ephemeral transfer-scoped key usage on the backend (standing per-user keys have no `write::transfer` scope),
- operation reference surfaced for support reconciliation,
- recovery behaviors per `kalshi-account-recovery`: reinstall is a non-event; a broken profile↔Kalshi mapping surfaces as an explicit “your account needs recovery” state (never an empty portfolio); launch recovery routes through MetaMask Customer Success + Kalshi manual remap with liveness/identity verification, audit, and preservation confirmation for the existing user/sub-account; programmatic recovery remains a post-launch goal,
- security, privacy, compliance, observability, support, and rollback reviews,
- cohort rollout and per-venue disable/read-only controls.

### Exit criteria

- the app never represents an initiated withdrawal as completed,
- support can reconcile a transfer from its operation and venue references,
- rollback disables Kalshi without changing Polymarket.

## Stage 5 — Polymarket Strangling

After Kalshi is stable, migrate Polymarket capability by capability:

1. public market-data reads, optionally with shadow comparisons,
2. portfolio reads,
3. Order preview/submission,
4. Deposit, Withdraw, and Claim funding plans,
5. live data,
6. legacy controller/provider and compat deletion.

Delete each legacy module only after its replacement capability has production parity and replacement tests exist at the new interface.

The existing phase documents describe this track in more detail. They are not Kalshi launch dependencies.

## Quality Gates

Every stage must include:

- mobile/backend contract fixtures and runtime validation,
- integration tests at each deep module interface,
- component-view tests for user-visible behavior,
- explicit safe-retry, ambiguous-response, and lost-response tests for writes,
- secret/PII redaction tests,
- structured observability with operation references but no sensitive payloads,
- a feature flag, kill switch, and rollback path.

Test reduction is not a goal. Delete legacy tests only after a replacement test proves the same behavior through the new interface.

## Safe Deferrals

The following omissions preserve the target architecture and are acceptable for the first release:

- multi-venue aggregation,
- non-Base funding networks,
- automatic Deposit-before-Order chaining,
- Resting Orders when product accepts Immediate Orders only,
- live streams when bounded polling is acceptable,
- generic remote signing intents,
- local Kalshi adapters,
- full Polymarket migration,
- full Predict UI primitive/view rewrite.

## External Dependencies

Treat these as schedule risks, not follow-up polish:

- Kalshi production credentials and reserved ISV sub-account allocation,
- production source-IP allowlisting,
- demo and production crypto-rail enablement,
- commercial prefunding exposure limits and settlement-failure policy,
- KYC/PII legal and privacy approval,
- current market-data/trading contract confirmation,
- Kalshi-supported recovery for a lost successful link/verification response where the participant ID is absent,
- one-time per-user key mint recovery/list/revoke/remint behavior,
- Kalshi encryption public-key mechanism for Encrypted Passthrough KYC (provenance, scheme, rotation/versioning, timeline),
- legal ruling on the ciphertext-relay posture (gates the KYC flow),
- native encryption and Socure SDK feasibility/impact checks,
- transfer-status endpoint shape and safe retry/reconciliation support for deposit indication and withdrawal,
- formal MetaMask Customer Success + Kalshi manual recovery procedure, liveness/identity evidence, audit, preservation confirmation, and SLA,
- future programmatic recovery API/delegated workflow,
- raw Canonical Profile ID vs. deterministic per-ISV pseudonym Privacy/Legal decision,
- backend credential-custody implementation/capacity decision,
- backend staffing and on-call ownership.

The authoritative list lives in each ADR's **Open Questions / External Dependencies** section.
