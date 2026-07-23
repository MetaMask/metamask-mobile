# Phase 5: Composition Root and Legacy Controller Shim

> **Track status:** post-Kalshi Polymarket strangler merge point. Kalshi may introduce the composition root earlier for only its enabled module set; it does not wait for all six target services.

## Goal

Use a stateless `PredictController` composition root with only `initialize` and `destroy`, and reduce the old controller to a temporary compatibility shim for capabilities not yet migrated at the UI boundary.

## Composition Root Contract

```typescript
interface PredictController {
  initialize(): Promise<void>;
  destroy(): void;
}
```

No Redux slice, read methods, write proxies, or Venue logic.

## Required-Module Bootstrap

`initialize()` constructs only modules required by the enabled Venue surface.

Examples:

- Kalshi Setup → Deposit → Balance: session, minimal portfolio, transaction/funding, analytics, remote adapter.
- Kalshi trading: add market data and TradingService.
- Live data: add LiveDataService only when enabled.
- Polymarket migration: add capability modules as they move.

Bootstrap is transactional/fail-closed for the required set. Optional reads/live modules may degrade only when product policy permits it.

Construction responsibilities:

- authenticated user context and adapter registry,
- scoped messengers and safe persisted state projections,
- read services and writer interfaces,
- shared `FundingExecutor` when funding is enabled,
- workflow services,
- redacted `predictAnalytics`,
- teardown order and rollback.

`destroy()`:

- is idempotent,
- stops local subscriptions/listeners,
- calls `FundingExecutor.destroy()`,
- unregisters messenger clients in reverse order,
- clears private mobile session/cache state,
- does not cancel/erase durable backend Venue Operations,
- drops observation events emitted during teardown.

## Legacy Controller Shim

For each still-legacy caller:

- map legacy params to `venueId`/`PredictAccountScope`,
- call the owning PredictNext service action,
- map canonical result/state back to the legacy shape,
- preserve old events/selectors temporarily.

Readiness comes from `PredictSessionService.readinessByAccount`, not PortfolioService. The shim does not recompute policy or own workflows.

As each UI capability migrates, remove its shim methods/state synthesis immediately. Do not wait for one final controller rewrite.

## Engine Wiring

- each active service is a first-class Engine messenger client/context entry as required by its shape,
- the composition root coordinates Predict-specific construction,
- the authenticated MetaMask API client is injected into remote adapters,
- no backend credentials or KYC values are passed through Engine state,
- legacy controller remains registered only while legacy callers exist.

## Tests

Composition-root tests cover:

- required module construction order,
- optional module omission,
- fail-closed rollback at every required step,
- permitted degraded startup,
- idempotent teardown,
- listener/messenger cleanup,
- durable backend operation survival after teardown,
- Kalshi-only failure isolation from legacy Polymarket.

Do not test service behavior or same-name forwarding here.

## Acceptance Criteria

- new controller exposes only `initialize`/`destroy`,
- required module set is driven by enabled Venue/product capabilities,
- no partial required graph survives failed initialization,
- no durable backend operation is erased on mobile teardown,
- old controller contains only temporary mapping/forwarding/state synthesis,
- every migrated UI/service bypasses the old controller,
- Kalshi rollback does not alter Polymarket,
- shim surface shrinks with each migrated capability.
