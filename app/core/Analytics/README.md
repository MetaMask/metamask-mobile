# Analytics

Analytics infrastructure lives in [`app/util/analytics/`](../../util/analytics/) and is consumed via the [`useAnalytics`](../../components/hooks/useAnalytics/useAnalytics.ts) hook.

## Files in this directory

| File / Folder               | Purpose                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `MetaMetrics.events.ts`     | Event name catalog (separate migration tracked by #26686)                               |
| `MetaMetrics.types.ts`      | Transitional re-export barrel — forwards types from `app/util/analytics/`               |
| `events/`                   | Per-domain event modules                                                                |
| `index.ts`                  | Public surface — re-exports `MetaMetricsEvents`, `EVENT_NAME`, and trade-funnel helpers |
| `trade-transaction-funnel/` | Analytics helpers for the trade/swap transaction funnel                                 |

## Usage

```ts
import { useAnalytics } from 'app/components/hooks/useAnalytics/useAnalytics';
import { EVENT_NAME } from 'app/core/Analytics';

const { trackEvent, createEventBuilder } = useAnalytics();

trackEvent(
  createEventBuilder(EVENT_NAME.ONBOARDING_STARTED)
    .addProperties({ source: 'import' })
    .build(),
);
```

Event names come from `EVENT_NAME` / `MetaMetricsEvents`. Properties go through `addProperties`. Tests mock the hook with `createMockUseAnalyticsHook` from `app/util/test/analyticsMock.ts`.

## User identification

```ts
const { identify } = useAnalytics();
identify({ firstName: 'Alice' });
```

## Data deletion

Use the [`useAnalyticsDataDeletion`](../../components/hooks/useAnalyticsDataDeletion/) hook to create and check data-deletion requests.

## Debugging

See [`docs/readme/metametrics-debugging.md`](../../../docs/readme/metametrics-debugging.md).
