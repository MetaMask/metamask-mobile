# Perps MetaMetrics Event Reference

## Overview

MetaMetrics uses **8 consolidated events** with discriminating properties (vs 38+ Sentry traces). Optimizes Segment costs by grouping similar actions into generic events with type properties.

**Example:** `PERPS_SCREEN_VIEWED` with `screen_type: 'trading' | 'withdrawal' | ...` instead of 9 separate screen events.

## Two Tracking Approaches

### 1. `usePerpsEventTracking` Hook (Components)

**Location:** `app/components/UI/Perps/hooks/usePerpsEventTracking.ts`

```typescript
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';

// Declarative: Track on mount
usePerpsEventTracking({
  eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
  properties: {
    [PerpsEventProperties.SCREEN_TYPE]: PerpsEventValues.SCREEN_TYPE.TRADING,
    [PerpsEventProperties.ASSET]: 'BTC',
  },
  conditions: [!!asset], // Optional: wait for data
});

// Imperative: Track on action
const { track } = usePerpsEventTracking();
track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
  [PerpsEventProperties.INTERACTION_TYPE]:
    PerpsEventValues.INTERACTION_TYPE.TAP,
  [PerpsEventProperties.ACTION_TYPE]:
    PerpsEventValues.ACTION_TYPE.START_TRADING,
});
```

### 2. Controller Tracking (Transactions)

**Location:** `app/components/UI/Perps/controllers/PerpsController.ts`

```typescript
import MetaMetrics from '../../../../core/Analytics/MetaMetrics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../constants/eventNames';

const startTime = performance.now();

MetaMetrics.getInstance().trackEvent(
  MetricsEventBuilder.createEventBuilder(
    MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
  )
    .addProperties({
      [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.EXECUTED,
      [PerpsEventProperties.ASSET]: params.coin,
      [PerpsEventProperties.ORDER_TYPE]: params.orderType,
      [PerpsEventProperties.COMPLETION_DURATION]: performance.now() - startTime,
    })
    .build(),
);
```

## 8 Events

### 1. PERPS_SCREEN_VIEWED

**Properties:**

- `screen_type` (required): `'homescreen' | 'markets' | 'trading' | 'position_close' | 'leverage' | 'tutorial' | 'withdrawal' | 'tp_sl' | 'asset_details'`
- `asset`, `direction`, `source` (optional)

### 2. PERPS_UI_INTERACTION

**Properties:**

- `interaction_type` (required): `'tap' | 'search_clicked' | 'order_type_viewed' | 'order_type_selected' | 'setting_changed' | 'tutorial_started' | 'tutorial_completed' | 'tutorial_navigation' | 'candle_period_viewed' | 'candle_period_changed'`
- `action_type`: `'start_trading' | 'skip' | ...`
- `asset`, `component_name` (optional)

### 3. PERPS_TRADE_TRANSACTION

**Properties:**

- `status` (required): `'submitted' | 'executed' | 'partially_filled' | 'failed'`
- `asset`, `direction`, `order_type`, `leverage`, `order_size`, `asset_price` (required for executed)
- `completion_duration` (required)
- `margin_used`, `metamask_fee`, `discount_percentage`, `take_profit_price`, `stop_loss_price` (optional)

### 4. PERPS_POSITION_CLOSE_TRANSACTION

**Properties:**

- `status` (required)
- `asset`, `direction`, `order_type`, `open_position_size`, `order_size`, `completion_duration` (required)
- `close_type`, `percentage_closed`, `dollar_pnl`, `percent_pnl`, `fee`, `received_amount` (optional)

### 5. PERPS_ORDER_CANCEL_TRANSACTION

**Properties:**

- `status`, `asset`, `completion_duration` (required)

### 6. PERPS_WITHDRAWAL_TRANSACTION

**Properties:**

- `status`, `withdrawal_amount`, `completion_duration` (required)

### 7. PERPS_RISK_MANAGEMENT

**Properties:**

- `status`, `asset`, `completion_duration` (required)
- `take_profit_price`, `stop_loss_price` (at least one required)

### 8. PERPS_ERROR

**Properties:**

- `error_type` (required): `'network' | 'app_crash' | 'backend' | 'validation'`
- `error_message` (required)
- `screen_type`, `retry_attempts`, `asset` (optional)

## Property Catalog

**File:** `app/components/UI/Perps/constants/eventNames.ts`

**Common Properties:**

- `PerpsEventProperties.ASSET` - Asset symbol
- `PerpsEventProperties.DIRECTION` - 'long' | 'short'
- `PerpsEventProperties.LEVERAGE` - Leverage multiplier
- `PerpsEventProperties.ORDER_TYPE` - 'market' | 'limit'
- `PerpsEventProperties.STATUS` - Operation status
- `PerpsEventProperties.COMPLETION_DURATION` - Duration in ms

**Common Values:**

- `PerpsEventValues.STATUS.EXECUTED` - Success
- `PerpsEventValues.STATUS.FAILED` - Failure
- `PerpsEventValues.DIRECTION.LONG` / `.SHORT`
- `PerpsEventValues.SCREEN_TYPE.*` - Screen identifiers
- `PerpsEventValues.INTERACTION_TYPE.*` - Interaction types

## Adding Events

### Screen View

```typescript
usePerpsEventTracking({
  eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
  properties: {
    [PerpsEventProperties.SCREEN_TYPE]:
      PerpsEventValues.SCREEN_TYPE.YOUR_SCREEN,
  },
});
```

### UI Interaction

```typescript
const { track } = usePerpsEventTracking();
track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
  [PerpsEventProperties.INTERACTION_TYPE]:
    PerpsEventValues.INTERACTION_TYPE.TAP,
});
```

### Transaction (Controller)

```typescript
MetaMetrics.getInstance().trackEvent(
  MetricsEventBuilder.createEventBuilder(
    MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
  )
    .addProperties({
      [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.EXECUTED,
      [PerpsEventProperties.COMPLETION_DURATION]: duration,
    })
    .build(),
);
```

## Best Practices

1. **Use constants** - Never hardcode strings
2. **Track status** - Always include success/failure
3. **Track duration** - Include `completion_duration` for transactions
4. **Use properties** - Don't create new events for minor variations
5. **Auto timestamp** - `usePerpsEventTracking` adds it automatically

## Sentry vs MetaMetrics

| Sentry                | MetaMetrics             |
| --------------------- | ----------------------- |
| 38+ traces            | 8 events                |
| Performance           | Behavior                |
| Technical metrics     | Business metrics        |
| `usePerpsMeasurement` | `usePerpsEventTracking` |

## Related Files

- **Hook**: `app/components/UI/Perps/hooks/usePerpsEventTracking.ts`
- **Events**: `app/core/Analytics/MetaMetrics.events.ts`
- **Properties**: `app/components/UI/Perps/constants/eventNames.ts`
- **Controller**: `app/components/UI/Perps/controllers/PerpsController.ts`
