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

- `screen_type` (required): `'homescreen' | 'markets' | 'trading' | 'position_close' | 'leverage' | 'tutorial' | 'withdrawal' | 'tp_sl' | 'asset_details' | 'close_all_positions' | 'cancel_all_orders' | 'order_book' | 'error'`
- `asset` (optional): Asset symbol (e.g., `'BTC'`, `'ETH'`)
- `direction` (optional): `'long' | 'short'`
- `source` (optional): Where user came from (e.g., `'banner'`, `'notification'`, `'main_action_button'`, `'position_tab'`, `'perp_markets'`, `'deeplink'`, `'tutorial'`)
- `open_position` (optional): Number of open positions (used for close_all_positions screen, number)
- `ab_test_button_color` (optional): Button color test variant (`'control' | 'monochrome'`), only included when test is enabled (for baseline exposure tracking)
- Future AB tests: `ab_test_{test_name}` (see [Multiple Concurrent Tests](#multiple-concurrent-tests))

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
- `ab_test_button_color` (optional): Button color test variant (`'control' | 'monochrome'`), only included when test is enabled and user taps Long/Short button (for engagement tracking)
- Future AB tests: `ab_test_{test_name}` (see [Multiple Concurrent Tests](#multiple-concurrent-tests))

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

## Multiple Concurrent Tests

### Flat Property Pattern

To support multiple AB tests running concurrently (e.g., TAT-1937 button colors, TAT-1940 asset CTA, TAT-1827 homepage CTA), we use **flat properties** instead of generic properties.

**Property Naming:** `ab_test_{test_name}` (no `_enabled` suffix needed)

**Why no `_enabled` property?**

- Events are only sent when test is enabled (`isEnabled === true`)
- Including the property means the test is active
- No need for redundant `_enabled` flag

**Example with 3 concurrent tests:**

```typescript
usePerpsEventTracking({
  eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
  properties: {
    [PerpsEventProperties.SCREEN_TYPE]:
      PerpsEventValues.SCREEN_TYPE.ASSET_DETAILS,
    [PerpsEventProperties.ASSET]: 'BTC',
    // Test 1: Button color test (TAT-1937) - only included when enabled
    ...(isButtonColorTestEnabled && {
      [PerpsEventProperties.AB_TEST_BUTTON_COLOR]: buttonColorVariant,
    }),
    // Test 2: Asset CTA test (TAT-1940) - future
    ...(isAssetCTATestEnabled && {
      [PerpsEventProperties.AB_TEST_ASSET_CTA]: assetCTAVariant,
    }),
    // Test 3: Homepage CTA test (TAT-1827) - future
    ...(isHomepageCTATestEnabled && {
      [PerpsEventProperties.AB_TEST_HOMEPAGE_CTA]: homepageCTAVariant,
    }),
  },
});
```

### Where to Track AB Tests

**✅ Track in both events:** Use dual tracking to enable engagement rate calculation.

**Dual Tracking Approach:**

1. **PERPS_SCREEN_VIEWED** (baseline exposure):
   - Include `ab_test_button_color` when test is enabled
   - Establishes how many users were exposed to each variant
   - Required to calculate engagement rate

2. **PERPS_UI_INTERACTION** (engagement):
   - Include `ab_test_button_color` when user taps Long/Short button
   - Only sent when test is enabled
   - Measures which variant drives more button presses

**Why Both Events?**

- **Engagement Rate** = Button presses / Screen views per variant
- Answers: "Which button color makes users more likely to press the button?"

**Example:** For TAT-1937 (button color test):

- Screen views establish baseline (how many saw control vs monochrome)
- Button presses measure engagement
- Compare button presses to screen views for each variant

For details, see [perps-ab-testing.md](./perps-ab-testing.md).

---

## Best Practices

1. **Use constants** - Never hardcode strings
2. **Track status** - Always include success/failure
3. **Track duration** - Include `completion_duration` for transactions
4. **Use properties** - Don't create new events for minor variations
5. **Auto timestamp** - `usePerpsEventTracking` adds it automatically
6. **AB test tracking** - Only in screen view events, not every interaction

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
