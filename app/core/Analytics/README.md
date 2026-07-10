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
import { AnalyticsEventBuilder } from 'app/util/analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from 'app/core/Analytics';

const { trackEvent, createEventBuilder } = useAnalytics();

// Non-anonymous event
trackEvent(
  createEventBuilder(MetaMetricsEvents.ONBOARDING_STARTED)
    .addProperties({ source: 'import' })
    .build(),
);

// Anonymous event (sensitive properties trigger dual-event emission)
trackEvent(
  createEventBuilder(MetaMetricsEvents.WALLET_CREATED)
    .addProperties({ method: 'new_wallet' })
    .addSensitiveProperties({ device_os: 'ios' })
    .build(),
);
```

## Anonymous / privacy events

When `addSensitiveProperties()` is called the built event's `isAnonymous` getter returns `true`. The `useAnalytics` hook sends **two** events to AnalyticsController:

1. **Anonymous event** — carries only the sensitive properties and is associated with the anonymous ID.
2. **Non-anonymous event** — carries only the non-sensitive properties and is associated with the user ID.

This ensures "what happened" (sensitive) is kept separate from "who did it" (non-sensitive).

## User identification

```ts
const { identify } = useAnalytics();
identify({ firstName: 'Alice' });
```

## Data deletion

Use the [`useAnalyticsDataDeletion`](../../components/hooks/useAnalyticsDataDeletion/) hook to create and check data-deletion requests.

## Debugging

See [`docs/readme/metametrics-debugging.md`](../../../docs/readme/metametrics-debugging.md).
