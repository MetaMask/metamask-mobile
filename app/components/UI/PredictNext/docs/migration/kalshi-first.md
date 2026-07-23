# Kalshi-First Vertical Delivery

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

Close these decisions before production implementation:

1. **Product topology** — separate/flagged Kalshi surface or merged multi-venue feed and portfolio. The default for fastest delivery is a separate surface.
2. **Predict User identity** — the authenticated, stable, non-PII MetaMask subject that maps to one Kalshi member and ISV sub-account.
3. **Funding Wallet policy** — which selected wallet may deposit to or receive withdrawals from the Venue Account.
4. **KYC/PII path** — hosted/tokenized flow if Kalshi offers one; otherwise strict mobile/backend minimization, retention, and logging rules.
5. **Funding rail** — Base-only first is recommended if product and compliance approve it.
6. **Order scope** — Immediate Orders only for v1, preferably fill-or-kill, unless Resting Orders are a launch requirement.
7. **Backend ownership** — production team, SLO, on-call, static egress/IP allowlisting, secret operations, and reconciliation support.

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
          -> KMS/encrypted Kalshi credential store
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
- issue a server-generated stable external user ID for Kalshi,
- add static egress for Kalshi production IP allowlisting,
- store the admin and per-user PEMs in a managed secret/KMS design,
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
- email/phone verification and KYC status handling,
- durable setup resume after app/backend restart,
- correct distinction between Kalshi's flat account-exists response and duplicate external-user-ID error,
- one-time, amount-specific Base USDC deposit plan,
- app-native transfer confirmation and submission,
- idempotent deposit indication,
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

- users can resume without repeating irreversible work,
- a duplicate request cannot create a duplicate user, key, deposit, or credit,
- balance and operation state reconcile after restart.

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
- explicit user confirmation before withdrawal commit,
- payout-method registration/reuse behind the backend adapter,
- idempotent withdrawal commit,
- honest `submitted`/`processing` UX because Kalshi has no ISV-safe transfer-status endpoint at launch,
- operation reference surfaced for support reconciliation,
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
- explicit idempotency and lost-response tests for writes,
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
- withdrawal reconciliation support while no transfer-status endpoint exists,
- backend staffing and on-call ownership.
