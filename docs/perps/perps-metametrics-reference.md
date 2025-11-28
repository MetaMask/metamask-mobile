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

- `screen_type` (required): `'homescreen' | 'markets' | 'trading' | 'position_close' | 'leverage' | 'tutorial' | 'withdrawal' | 'tp_sl' | 'asset_details' | 'close_all_positions' | 'cancel_all_orders' | 'error'`
- `asset` (optional): Asset symbol (e.g., `'BTC'`, `'ETH'`)
- `direction` (optional): `'long' | 'short'`
- `source` (optional): Where user came from (e.g., `'banner'`, `'notification'`, `'main_action_button'`, `'position_tab'`, `'perp_markets'`, `'deeplink'`, `'tutorial'`)
- `open_position` (optional): Number of open positions (used for close_all_positions screen, number)

### 2. PERPS_UI_INTERACTION

**Properties:**

- `interaction_type` (required): `'tap' | 'zoom' | 'slide' | 'search_clicked' | 'order_type_viewed' | 'order_type_selected' | 'setting_changed' | 'tutorial_started' | 'tutorial_completed' | 'tutorial_navigation' | 'candle_period_viewed' | 'candle_period_changed' | 'favorite_toggled'` (Note: `favorite_toggled` = watchlist toggle)
- `action` (optional): Specific action performed: `'connection_retry' | 'share'`
- `attempt_number` (optional): Retry attempt number when action is 'connection_retry' (number)
- `action_type` (optional): `'start_trading' | 'skip' | 'stop_loss_set' | 'take_profit_set' | 'close_all_positions' | 'cancel_all_orders' | 'learn_more' | 'favorite_market' | 'unfavorite_market'` (Note: `favorite_market` = add to watchlist, `unfavorite_market` = remove from watchlist)
- `asset` (optional): Asset symbol (e.g., `'BTC'`, `'ETH'`)
- `direction` (optional): `'long' | 'short'`
- `order_size` (optional): Size of the order in tokens (number)
- `leverage_used` (optional): Leverage value being used (number)
- `order_type` (optional): `'market' | 'limit'`
- `setting_type` (optional): Type of setting changed (e.g., `'leverage'`)
- `input_method` (optional): How value was entered: `'slider' | 'keyboard' | 'preset' | 'manual' | 'percentage_button'`
- `candle_period` (optional): Selected candle period
- `favorites_count` (optional): Total number of markets in watchlist after toggle (number, used with `favorite_toggled`)

### 3. PERPS_TRADE_TRANSACTION

**Properties:**

- `status` (required): `'submitted' | 'executed' | 'partially_filled' | 'failed'`
- `asset` (required): Asset symbol (e.g., `'BTC'`, `'ETH'`)
- `direction` (required): `'long' | 'short'`
- `order_type` (required): `'market' | 'limit'`
- `leverage` (required): Leverage multiplier (number)
- `order_size` (required for executed): Size of the order in tokens (number)
- `asset_price` (required for executed): Price of the asset (number)
- `completion_duration` (required): Duration in milliseconds (number)
- `margin_used` (optional): Margin required/used in USDC (number)
- `metamask_fee` (optional): MetaMask fee amount in USDC (number)
- `metamask_fee_rate` (optional): MetaMask fee rate as decimal (number)
- `discount_percentage` (optional): Fee discount percentage (number)
- `estimated_rewards` (optional): Estimated reward points (number)
- `take_profit_price` (optional): Take profit trigger price (number)
- `stop_loss_price` (optional): Stop loss trigger price (number)
- `input_method` (optional): How value was entered: `'slider' | 'keyboard' | 'preset' | 'manual' | 'percentage_button'`
- `limit_price` (optional): Limit order price (for limit orders) (number)
- `error_message` (optional): Error description when status is 'failed'

### 4. PERPS_POSITION_CLOSE_TRANSACTION

**Properties:**

- `status` (required): `'submitted' | 'executed' | 'partially_filled' | 'failed'`
- `asset` (required): Asset symbol (e.g., `'BTC'`, `'ETH'`)
- `direction` (required): `'long' | 'short'`
- `order_type` (required): `'market' | 'limit'`
- `open_position_size` (required): Size of the open position (number)
- `order_size` (required): Size being closed (number)
- `completion_duration` (required): Duration in milliseconds (number)
- `close_type` (optional): `'full' | 'partial'`
- `percentage_closed` (optional): Percentage of position closed (number)
- `dollar_pnl` (optional): Profit/loss in dollars (number)
- `percent_pnl` (optional): Profit/loss as percentage (number)
- `fee` (optional): Fee paid in USDC (number)
- `received_amount` (optional): Amount received after close (number)
- `input_method` (optional): How value was entered: `'slider' | 'keyboard' | 'preset' | 'manual' | 'percentage_button'`
- `amount_filled` (optional): Amount filled in partially filled orders (number)
- `remaining_amount` (optional): Amount remaining in partially filled orders (number)
- `error_message` (optional): Error description when status is 'failed'

### 5. PERPS_ORDER_CANCEL_TRANSACTION

**Properties:**

- `status` (required): `'submitted' | 'executed' | 'failed'`
- `asset` (required): Asset symbol (e.g., `'BTC'`, `'ETH'`)
- `completion_duration` (required): Duration in milliseconds (number)
- `order_type` (optional): `'market' | 'limit'`
- `error_message` (optional): Error description when status is 'failed'

### 6. PERPS_WITHDRAWAL_TRANSACTION

**Properties:**

- `status` (required): `'submitted' | 'executed' | 'failed'`
- `withdrawal_amount` (required): Amount being withdrawn in USDC (number)
- `completion_duration` (required): Duration in milliseconds (number)
- `error_message` (optional): Error description when status is 'failed'

### 7. PERPS_RISK_MANAGEMENT

**Properties:**

- `status` (required): `'submitted' | 'executed' | 'failed'`
- `asset` (required): Asset symbol (e.g., `'BTC'`, `'ETH'`)
- `completion_duration` (required): Duration in milliseconds (number)
- `take_profit_price` (at least one required): Take profit trigger price (number)
- `stop_loss_price` (at least one required): Stop loss trigger price (number)
- `direction` (optional): `'long' | 'short'`
- `source` (optional): Where TP/SL update originated (e.g., `'tp_sl_view'`, `'position_screen'`)
- `position_size` (optional): Size of the position (number)
- `error_message` (optional): Error description when status is 'failed'

### 8. PERPS_ERROR

**Properties:**

- `error_type` (required): `'network' | 'app_crash' | 'backend' | 'validation'`
- `error_message` (required): Error description string
- `screen_type` (optional): Screen where error occurred (e.g., `'trading'`, `'withdrawal'`, `'markets'`)
- `retry_attempts` (optional): Number of retry attempts (number)
- `asset` (optional): Asset symbol if error is asset-specific (e.g., `'BTC'`, `'ETH'`)
- `action` (optional): Action being attempted when error occurred
- `screen_name` (optional): Specific screen name (e.g., `'connection_error'`)

## Quick Reference

> **Note:** In code, property names and values are accessed via constants (e.g., `PerpsEventProperties.ASSET`, `PerpsEventValues.STATUS.EXECUTED`). The string values shown in the event sections above are what actually gets sent to Segment.

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
