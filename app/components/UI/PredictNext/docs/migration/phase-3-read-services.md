# Phase 3: Polymarket Read-Service Delegation

> **Track status:** post-Kalshi Polymarket strangler work. Not a Kalshi launch dependency.

## Goal

Move selected legacy Polymarket reads into Venue-qualified `MarketDataService` and account-scoped `PortfolioService` one capability at a time. Preserve old controller/hook return shapes through temporary compat mapping.

## Preconditions

- the corresponding Polymarket adapter capability is implemented and tested,
- query descriptors for that capability exist,
- compatibility mappers and legacy characterization tests exist,
- the delegation is flaggable and independently revertible.

## MarketDataService

Public market data:

- takes explicit `venueId`,
- resolves `VenueAdapterRegistry.get(venueId).marketData`,
- does not require `PredictSessionService` or a selected wallet,
- uses canonical descriptors for every query,
- returns canonical Venue-qualified entities,
- exposes a narrow writer for safe price/game patches and targeted invalidation.

Migrate only methods backed by implemented adapter capabilities, for example:

- Events/feed/detail,
- prices/history,
- optional search/carousel/series/crypto reference reads.

Do not add optional methods solely to recreate the old provider surface.

## PortfolioService

Account data:

- takes `PredictAccountScope`,
- obtains `PredictClient` from `PredictSessionService.getClient(scope)`,
- calls `client.portfolio`,
- uses account-scoped descriptors,
- owns Balance, Positions, Activity, optional open Orders/PnL,
- maps execution Activity from authoritative Fill/Settlement/Claim sources,
- exposes a narrow read-model writer for workflow/live milestones.

Account Readiness remains in `PredictSessionService` under `readinessByAccount` and is absent from PortfolioService.

## Legacy Delegation

For each selected read:

```text
old controller/provider method
  -> map legacy params to venueId or PredictAccountScope
  -> call new read service
  -> map canonical result to legacy shape
  -> return unchanged legacy contract
```

Do not synthesize one global active Venue when data is mixed. Legacy Polymarket delegation uses `venueId: 'polymarket'` explicitly.

## Cache Rules

- market keys include `venueId`,
- portfolio keys include full `PredictAccountScope`,
- descriptor modules own key/family/stale time/scope,
- one Venue/account invalidation never clears another,
- direct writer calls are the system of record for cache mutation,
- Service Events remain observation-only,
- public and account reads have independent circuit/degradation behavior.

## Testing

- service integration tests at the read-service interface,
- adapter contract tests for DTO normalization,
- descriptor tests for Venue/account isolation,
- writer tests for patch/rollback/invalidation,
- legacy parity tests through old callers,
- optional shadow comparison before switching production reads.

## Acceptance Criteria per Read Capability

- no public read requires a fake account session,
- no portfolio read uses an unqualified wallet address,
- old callers receive the same behavior/shape,
- canonical financial values are decimal strings,
- query/cache scope cannot collide across Venues/accounts,
- rollback disables only the migrated read,
- old implementation is deleted only after production parity.

## Suggested PR Shape

1. one market-data capability + parity switch,
2. one portfolio capability + parity switch,
3. cleanup after production confidence.
