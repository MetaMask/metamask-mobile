# Phase 7: Incremental Cleanup and Final Cutover

> **Track status:** cleanup follows each migrated capability. A final directory rename is optional housekeeping, not a launch milestone.

## Goal

Delete legacy implementation, compatibility, state, tests, and imports as soon as their replacement is proven. Finish with no runtime dependency on the old Predict architecture.

## Per-Capability Cleanup

After a capability reaches production parity:

1. remove its feature-flag fallback when rollout policy permits,
2. delete old controller/provider workflow code,
3. delete temporary compat mapper/state synthesis for that capability,
4. remove obsolete legacy tests only after replacement coverage exists,
5. remove dead messenger actions/selectors/events,
6. update docs to the shipped behavior,
7. verify no cross-Venue/cache/identity fallback remains.

Do not retain all legacy code until one final cleanup PR.

## Final Verification

Before deleting the remaining legacy tree:

- all routed screens and external embeds use canonical public exports,
- all Polymarket and Kalshi capabilities use Venue-qualified interfaces,
- no production import reaches legacy provider/controller/hooks,
- no temporary compat path remains,
- all durable remote writes have reconciliation/ops ownership,
- secret/PII checks pass,
- unit, integration, component-view, and required E2E suites pass,
- iOS and Android smoke checks pass,
- rollback is no longer dependent on deleted code.

## Delete Legacy Code

Execute these steps only after each deleted capability has replacement production code proven in CI and replacement coverage through the new interface.

- remove remaining old `app/components/UI/Predict/` implementation files,
- remove `PredictNext/compat/`,
- remove old controller messenger/state wiring,
- remove dead fixtures/mocks/scripts,
- update external imports and CODEOWNERS.

Use repository-wide import and symbol searches rather than assuming a directory is unused.

## Directory Name

After old `Predict/` is deleted, decide whether to:

- rename `PredictNext/` to `Predict/`, or
- keep the existing path to preserve history/import stability.

If renaming still provides more clarity than churn:

```bash
git mv app/components/UI/PredictNext app/components/UI/Predict
```

Then update Engine, navigation, deeplinks, external views, tests, scripts, and docs in one mechanical change.

## Documentation

Final docs describe the shipped architecture:

- remove transitional track/phase language,
- retain durable identity, capability, idempotency, recovery, and security decisions,
- document actual supported Venue/order/funding capabilities,
- keep operational reconciliation and credential procedures in their owned runbooks,
- remove stale line-count/test-reduction projections.

## Acceptance Criteria

- no legacy runtime imports or compatibility modules,
- no global active-Venue assumption where multi-Venue data exists,
- no wallet-address-as-person-identity path,
- no old controller/provider business logic,
- no redundant tests without replacement evidence,
- all supported Venues use canonical capability modules,
- all tests and platform smoke checks pass,
- docs match the shipped system,
- optional rename is complete or explicitly declined.
