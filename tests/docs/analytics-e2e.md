# MetaMetrics / Segment analytics in E2E

MetaMetrics events are proxied through the E2E **Mockttp** server. Helpers in `tests/helpers/analytics/helpers.ts` read captured request bodies.

## `withFixtures` — `analyticsExpectations`

Optional **`analyticsExpectations`** on `withFixtures` options runs **after** your test body and **`endTestfn`**, and **before** the mock server enters drain mode—so captured events are still available (see `FixtureHelper.ts` teardown order).

Validation logic lives in **`tests/helpers/analytics/runAnalyticsExpectations.ts`** (single code path for all tests). Specs typically **import a preset object** from `tests/helpers/analytics/expectations/*.analytics.ts` and pass it to `analyticsExpectations`.

### Configuration (`AnalyticsExpectations`)

| Field | Purpose |
| ----- | -------- |
| `eventNames` | Subset of event names passed to `getEventsPayloads` (faster, less noise). If omitted and no `events[]` entries, **all** captured MetaMetrics payloads are loaded. |
| `expectedTotalCount` | Assert exact length of that filtered list. |
| `events` | Declarative per-event rules (see below). |
| `validate` | Optional escape hatch; runs **after** declarative checks succeed. Receives `{ events, mockServer }`. |

### Per-event rules (`AnalyticsEventExpectation`)

| Field | Purpose |
| ----- | -------- |
| `name` | MetaMetrics event name. |
| `minCount` | Minimum payloads with this name (@default 1). |
| `matchEventIndex` | Which occurrence to use for single-payload checks (@default 0). |
| `requiredProperties` | Type/shape map for **every** payload with this name (`Assertions.checkIfObjectHasKeysAndValidValues`). |
| `matchProperties` | Exact property object for payload at `matchEventIndex` (`Assertions.checkIfObjectsMatch`). |
| `containProperties` | Subset match for payload at `matchEventIndex` (`Assertions.checkIfObjectContains`). |
| `requiredDefinedPropertyKeys` | Keys that must be defined on payload at `matchEventIndex`. |

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
