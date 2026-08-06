# PredictNext Migration Plan

## 1. Active Strategy

PredictNext now has two delivery tracks with different timing:

| Track                            | Timing                 | Goal                                                                                                            |
| -------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| **A — Kalshi vertical delivery** | Active now             | Ship Kalshi through the minimum production-grade PredictNext kernel and a remote MetaMask backend.              |
| **B — Polymarket strangling**    | After Kalshi is stable | Move existing Polymarket capabilities behind the proven PredictNext seams and remove legacy code incrementally. |

The full seven-phase Polymarket rewrite is **not** a prerequisite for Kalshi.

Read [kalshi-first.md](./kalshi-first.md) for the active delivery plan.

## 2. Why the Sequence Changed

The original plan was Polymarket-first: build the complete canonical contract, delegate the legacy provider, extract all services, replace the controller, then migrate the UI before adding a second Venue.

The Kalshi POC and ISV specification changed the evidence:

- Kalshi requires server-held ISV admin and per-user credentials, so a production backend is mandatory.
- Kalshi identity is person/ISV-sub-account scoped, not equivalent to a selected wallet address.
- Account Setup, one-time deposit addresses, deposit indication, API withdrawal, and automatic Settlement exercise the new seams more strongly than another Polymarket extraction.
- The documented adapter was too broad and had no actual Account Setup interface.
- Money operations require durable backend operation identity and reconciliation state that cannot live only in transient mobile workflow state; backend durability does not imply Venue idempotency.
- Waiting for the full Polymarket rewrite would put roughly two dozen or more PRs ahead of the urgent Venue integration.

Kalshi should therefore shape the new interfaces now. Polymarket can move after those interfaces have production evidence.

## 3. Track A — Kalshi Vertical Delivery

Track A delivers behavior vertically rather than completing horizontal architecture layers.

| Stage                               | Outcome                                                                                                    | Deliberately deferred                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 0. Contract and security correction | Identity, capability, account-setup, funding, order, and backend contracts agreed; POC credentials rotated | Implementation                               |
| 1. Production walking skeleton      | Authenticated mobile → owned backend → Kalshi read with runtime validation                                 | Full service graph, generic signing intents  |
| 2. First vertical slice             | Account Setup → Account Readiness → Deposit → Balance                                                      | Trading, live data, Polymarket compat        |
| 3. Trading/portfolio slice          | Browse → preview → Immediate Order → Position/Fill/Settlement                                              | Resting Orders unless required, live streams |
| 4. Withdraw and launch hardening    | Confirmed API withdrawal, reconciliation, observability, controlled rollout                                | Multi-network funding, merged portfolio      |
| 5. Polymarket strangling            | Existing Venue moves one capability at a time                                                              | Big-bang UI rewrite                          |

### Track A rules

- Kalshi account-scoped operations are remote-only.
- Use the existing authenticated MetaMask API client; backend authorization is derived from its token.
- Public market data is separate from account-scoped Venue sessions.
- Every account/cache/operation identifier is Venue-qualified.
- The Predict User, Funding Wallet, and Venue Account remain distinct.
- Funding and Order writes use prepare/confirm/commit, stable backend operation identities, durable references, and Venue-verified safe retry/reconciliation.
- New modules are built only when a vertical slice needs them.
- Polymarket behavior stays on the current production path during Kalshi launch.
- A Kalshi failure or rollback must not modify the Polymarket path.

## 4. Track B — Polymarket Strangling

The existing seven phase documents now describe the post-Kalshi Polymarket migration track.

| Phase | Name                                          | Goal                                                                                                                    | Kalshi launch dependency?       |
| ----- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1     | [Foundation](./phase-1-foundation.md)         | Add the remaining canonical types, legacy compat, and Polymarket-specific foundation not already implemented by Track A | Only the minimal Track A subset |
| 2     | [Polymarket Adapter](./phase-2-adapter.md)    | Implement/delegate Polymarket capability modules                                                                        | No                              |
| 3     | [Read Services](./phase-3-read-services.md)   | Move legacy Polymarket reads to canonical read services                                                                 | No                              |
| 4     | [Write Services](./phase-4-write-services.md) | Move legacy Polymarket trading, funding/claim, and live workflows                                                       | No                              |
| 5     | [Composition Root](./phase-5-controller.md)   | Reduce the old controller to a compatibility shim                                                                       | No                              |
| 6     | [UI Migration](./phase-6-ui-migration.md)     | Replace screens only where the migration still pays for itself                                                          | No                              |
| 7     | [Cleanup](./phase-7-cleanup.md)               | Delete old code and temporary compatibility                                                                             | No                              |

Track B keeps the useful inside-out principle:

```text
legacy caller
  -> temporary compatibility/delegation
    -> proven PredictNext capability module
      -> canonical Venue seam
```

The migration unit is now a **capability** rather than a whole phase. A Polymarket read can move without waiting for all Polymarket writes; a write can move without requiring a new UI.

## 5. Shared Architectural Invariants

Both tracks follow these rules.

### One-way dependencies

- Legacy `Predict/` may delegate to `PredictNext/` during Track B.
- `PredictNext/` must not import legacy implementation modules.
- The temporary `compat/` module is the only allowed legacy-type bridge and is created only when the first Polymarket capability needs it.
- Shared app infrastructure—authentication, Engine messenger, transaction controllers, confirmations, analytics, design system—is not legacy Predict code and should be reused directly.

### Venue-qualified state

- Public market-data keys include `venueId`.
- Account-scoped keys include a `PredictAccountScope` containing Venue and Predict User context.
- A selected wallet is Funding Wallet context, not the authoritative person identity.
- No cache, readiness record, order, or operation is keyed by an unqualified external ID.

### Safe writes

- Preparing a Funding Plan does not move funds.
- A short-lived Order Preview is identified by an opaque preview ID and expiry.
- User confirmation occurs before commit.
- Every commit has a stable backend operation/idempotency key and durable operation reference; this does not by itself make the external Venue call idempotent.
- Reads may retry automatically; writes retry only when verified Venue idempotency/reconciliation semantics permit it.
- App teardown may stop local observation but must not erase the backend operation.

### Shippable increments

- Every PR has a feature flag or preserves existing behavior.
- Every migrated capability is independently revertible.
- No old capability is deleted until production parity and replacement tests exist.
- Kalshi can degrade or be disabled without changing Polymarket.

## 6. Product Topology Fork

The fastest Track A assumes a separate/flagged Kalshi surface.

If product requires a merged feed or portfolio at launch, add a separate aggregation design before implementation:

- a Venue aggregation module above per-Venue market-data and portfolio modules,
- Venue-qualified Event/Market/Outcome IDs and route params,
- separate Balances and Account Readiness per Venue,
- Order routing by `venueId`,
- pagination, ranking, and error/degraded policy across Venues,
- no global “active Venue” assumption.

Do not simulate multi-Venue support by switching one global adapter while rendering mixed data.

## 7. Quality Gates

The migration is complete behavior by behavior, not when a target file count is reached.

Required for each slice/capability:

- mobile/backend contract fixtures and runtime response validation,
- integration tests through the owning module interface,
- component-view tests for visible behavior,
- safe-retry, duplicate-submit, app-restart, ambiguous-response, and lost-response coverage for writes,
- secret and PII redaction tests,
- structured errors and observability,
- rollout/rollback verification.

Test code reduction is not a goal. Delete old tests only after stronger replacement coverage exists.

## 8. Final Cutover

After both Venues use the target seams and all external consumers have moved:

1. verify no production imports from old `Predict/` remain,
2. verify no temporary compatibility or delegation paths remain,
3. delete the old controller/provider/UI modules that have replacements,
4. rename `PredictNext/` to `Predict/` only if the rename still improves clarity,
5. update documentation to describe the shipped architecture rather than the transition.

A directory rename is cleanup, not a release milestone.

## 9. Review Expectations

- Review trust, identity, money movement, and recovery before style or folder shape.
- Reject any route that authorizes through a client-supplied wallet address, email, or external user ID.
- Reject any Funding Plan preparation that initiates a transfer.
- Reject blind retry of a non-idempotent write.
- Reject Venue-specific branches above the appropriate capability adapter.
- Prefer a small vertical implementation over speculative completeness.
- Preserve existing Polymarket behavior until a replacement capability is proven.
