# MetaMetrics / Segment analytics in E2E

MetaMetrics events are proxied through the E2E **Mockttp** server. Helpers in `tests/helpers/analytics/helpers.ts` read captured request bodies.

## `withFixtures` — `analyticsExpectations`

Optional **`analyticsExpectations`** on `withFixtures` options runs **after** your test body and **`endTestfn`**, and **before** the mock server enters drain mode—so captured events are still available (see `FixtureHelper.ts` teardown order).

Validation logic lives in **`tests/helpers/analytics/runAnalyticsExpectations.ts`** (single code path for all tests). Specs typically **import a preset object** from `tests/helpers/analytics/expectations/*.analytics.ts` and pass it to `analyticsExpectations`.

### Configuration (`AnalyticsExpectations`)

| Field                | Purpose                                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eventNames`         | Subset of event names passed to `getEventsPayloads` (faster, less noise). If omitted and no `events[]` entries, **all** captured MetaMetrics payloads are loaded. |
| `expectedTotalCount` | Assert exact length of that filtered list.                                                                                                                        |
| `events`             | Declarative per-event rules (see below).                                                                                                                          |
| `validate`           | Optional escape hatch; runs **after** declarative checks succeed. Receives `{ events, mockServer }`.                                                              |

All declarative rules and the optional `validate` callback are evaluated with **`SoftAssert`**: every configured expected event is checked and **all** failures are reported in one thrown error (not stop-on-first). Property checks for an event are skipped if that event did not meet `minCount`, so you get a clear “missing event” line without extra property noise.

### Per-event rules (`AnalyticsEventExpectation`)

| Field                         | Purpose                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `name`                        | MetaMetrics event name.                                                                                |
| `minCount`                    | Minimum payloads with this name (@default 1).                                                          |
| `matchEventIndex`             | Which occurrence to use for single-payload checks (@default 0).                                        |
| `requiredProperties`          | Type/shape map for **every** payload with this name (`Assertions.checkIfObjectHasKeysAndValidValues`). |
| `matchProperties`             | Exact property object for payload at `matchEventIndex` (`Assertions.checkIfObjectsMatch`).             |
| `containProperties`           | Subset match for payload at `matchEventIndex` (`Assertions.checkIfObjectContains`).                    |
| `requiredDefinedPropertyKeys` | Keys that must be defined on payload at `matchEventIndex`.                                             |

### Preset expectations (data-only, reusable)

Place shared configs under **`tests/helpers/analytics/expectations/`** (e.g. `import-wallet.analytics.ts`). Import the preset from that file directly (same pattern as other test helpers—no barrel `index.ts`).

```typescript
import { importWalletWithMetricsOptInExpectations } from '../../../helpers/analytics/expectations/import-wallet.analytics';

await withFixtures(
  {
    fixture: ...,
    analyticsExpectations: importWalletWithMetricsOptInExpectations,
  },
  async () => {
    /* UI only */
  },
);
```

Imports:

```typescript
import { withFixtures } from '../framework/fixtures/FixtureHelper';
import type { AnalyticsExpectations } from '../framework';
```

Example (inline declarative, no `validate`):

```typescript
analyticsExpectations: {
  eventNames: ['Wallet Imported'],
  expectedTotalCount: 1,
  events: [
    {
      name: 'Wallet Imported',
      matchProperties: { biometrics_enabled: false },
    },
  ],
},
```

Example (no events expected):

```typescript
analyticsExpectations: {
  expectedTotalCount: 0,
},
```

Programmatic use: `runAnalyticsExpectations` and `assertCapturedMetaMetricsEvents` are exported from `tests/framework/index.ts`.

## Debug logging (`E2E_ANALYTICS_DEBUG`)

Set **`E2E_ANALYTICS_DEBUG=1`** (also accepts `true`, `yes`, `on`) when running E2E to log MetaMetrics traffic:

1. **Live (as requests hit the mock)** — When the app POSTs through `/proxy` to the MetaMetrics track URL, the mock server logs a line like `Event sent (live): "<name>"` (see `logLiveMetaMetricsPostIfDebug` in `tests/helpers/analytics/analyticsDebug.ts` and `MockServerE2E.ts`).
2. **Batch (when payloads are read)** — Whenever `getEventsPayloads` runs, it logs each captured event as `Captured event: "<name>"` plus debug-level property JSON (truncated). This runs at the end of the flow when analytics assertions (or custom code) fetch captured events.

Properties are logged at **debug** level to limit noise; event names are **info** level. Adjust log level if your harness filters debug output.
