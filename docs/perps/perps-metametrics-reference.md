# Perps MetaMetrics Event Reference

## Overview

MetaMetrics uses **8 consolidated events** with discriminating properties (vs 38+ Sentry traces). Optimizes Segment costs by grouping similar actions into generic events with type properties.

**Example:** `PERPS_SCREEN_VIEWED` with `screen_type: 'trading' | 'withdrawal' | ...` instead of 9 separate screen events.

## Three Tracking Approaches

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

- `screen_type` (required): Type of screen being viewed
  - **Core screens:** `'markets'` | `'trading'` | `'position_close'` | `'leverage'` | `'tutorial'` | `'withdrawal'` | `'asset_details'` | `'error'`
  - **Home screens:** `'perps_home'` | `'wallet_home_perps_tab'` | `'homescreen'` _(deprecated, use perps_home)_
  - **TP/SL screens:** `'tp_sl'` | `'create_tpsl'` | `'edit_tpsl'`
  - **Deposit screens:** `'deposit_input'` | `'deposit_review'`
  - **Market list screens:** `'market_list'` | `'market_list_all'` | `'market_list_crypto'` | `'market_list_stocks'`
  - **Position management:** `'close_all_positions'` | `'cancel_all_orders'` | `'increase_exposure'` | `'add_margin'` | `'remove_margin'`
  - **Other screens:** `'pnl_hero_card'` | `'order_book'` | `'full_screen_chart'` | `'activity'` | `'geo_block_notif'`
- `asset` (optional): Asset symbol (e.g., `'BTC'`, `'ETH'`)
- `direction` (optional): `'long' | 'short'`
- `source` (optional): Where user came from
  - **Entry points:** `'banner'` | `'notification'` | `'main_action_button'` | `'deeplink'` | `'push_notification'`
  - **Navigation sources:** `'perp_markets'` | `'perp_market'` | `'perp_market_search'` | `'perp_asset_screen'` | `'position_tab'` | `'perps_tab'`
  - **Home section sources:** `'perps_home'` | `'perps_home_position'` | `'perps_home_orders'` | `'perps_home_watchlist'` | `'perps_home_explore_crypto'` | `'perps_home_explore_stocks'` | `'perps_home_activity'` | `'perps_home_empty_state'`
  - **Market list sources:** `'perps_market_list_all'` | `'perps_market_list_crypto'` | `'perps_market_list_stocks'`
  - **Trade/Position sources:** `'trade_screen'` | `'position_screen'` | `'tp_sl_view'` | `'trade_menu_action'` | `'open_position'` | `'trade_details'`
  - **Other sources:** `'tutorial'` | `'perps_tutorial'` | `'close_toast'` | `'position_close_toast'` | `'tooltip'` | `'magnifying_glass'` | `'crypto_button'` | `'stocks_button'` | `'order_book'` | `'full_screen_chart'` | `'stop_loss_prompt_banner'` | `'wallet_home'` | `'wallet_main_action_menu'` | `'homescreen_tab'`
  - **Geo-block sources:** `'deposit_button'` | `'withdraw_button'` | `'trade_action'` | `'add_funds_action'` | `'cancel_order'` | `'asset_detail_screen'`
- `open_position` (optional): Number of open positions (used for close_all_positions screen, number)
- `has_perp_balance` (optional): Whether user has a perps balance or positions (boolean)
- `has_take_profit` (optional): Whether take profit is set (boolean, used for TP/SL screens)
- `has_stop_loss` (optional): Whether stop loss is set (boolean, used for TP/SL screens)
- `pnl_dollar` (optional): P&L in dollars (number, used for pnl_hero_card screen)
- `pnl_percent` (optional): P&L as percentage (number, used for pnl_hero_card screen)
- `button_clicked` (optional): Button that led to this screen (entry point tracking, see [Entry Point Tracking](#entry-point-tracking))
- `button_location` (optional): Location of the button clicked (entry point tracking, see [Entry Point Tracking](#entry-point-tracking))
- `ab_test_button_color` (optional): Button color test variant (`'control' | 'monochrome'`), only included when test is enabled (for baseline exposure tracking)
- Future AB tests: `ab_test_{test_name}` (see [Multiple Concurrent Tests](#multiple-concurrent-tests))

### 2. PERPS_UI_INTERACTION

**Properties:**

- `interaction_type` (required): Type of user interaction
  - **Basic interactions:** `'tap'` | `'zoom'` | `'slide'` | `'search_clicked'` | `'button_clicked'`
  - **Order interactions:** `'order_type_viewed'` | `'order_type_selected'`
  - **Setting interactions:** `'setting_changed'` _(deprecated, use leverage_changed)_ | `'leverage_changed'`
  - **Tutorial interactions:** `'tutorial_started'` | `'tutorial_completed'` | `'tutorial_navigation'`
  - **Chart interactions:** `'candle_period_viewed'` | `'candle_period_changed'` | `'full_screen_chart'`
  - **Watchlist interactions:** `'favorite_toggled'` (add/remove from watchlist)
  - **Position management:** `'add_margin'` | `'remove_margin'` | `'increase_exposure'` | `'reduce_exposure'` | `'flip_position'` | `'contact_support'` | `'stop_loss_one_click_prompt'`
  - **Hero card interactions:** `'display_hero_card'` | `'share_pnl_hero_card'`
- `action` (optional): Specific action performed: `'connection_retry'` | `'share'` | `'add_margin'` | `'remove_margin'` | `'edit_tp_sl'` | `'create_tp_sl'` | `'create_position'` | `'increase_exposure'`
- `attempt_number` (optional): Retry attempt number when action is 'connection_retry' (number)
- `action_type` (optional): `'start_trading'` | `'skip'` | `'stop_loss_set'` | `'take_profit_set'` | `'adl_learn_more'` | `'learn_more'` | `'favorite_market'` | `'unfavorite_market'` (Note: `favorite_market` = add to watchlist, `unfavorite_market` = remove from watchlist)
- `asset` (optional): Asset symbol (e.g., `'BTC'`, `'ETH'`)
- `direction` (optional): `'long' | 'short'`
- `order_size` (optional): Size of the order in tokens (number)
- `leverage_used` (optional): Leverage value being used (number)
- `order_type` (optional): `'market' | 'limit'`
- `setting_type` (optional): Type of setting changed (e.g., `'leverage'`)
- `input_method` (optional): How value was entered: `'slider' | 'keyboard' | 'preset' | 'manual' | 'percentage_button'`
- `candle_period` (optional): Selected candle period
- `favorites_count` (optional): Total number of markets in watchlist after toggle (number, used with `favorite_toggled`)
- `button_clicked` (optional): Button identifier for entry point tracking (see [Entry Point Tracking](#entry-point-tracking)): `'deposit'` | `'withdraw'` | `'perps_home'` | `'tutorial'` | `'tooltip'` | `'market_list'` | `'open_position'` | `'magnifying_glass'` | `'crypto'` | `'stocks'` | `'give_feedback'`
- `button_location` (optional): Location of the button for entry point tracking (see [Entry Point Tracking](#entry-point-tracking)): `'perps_home'` | `'perps_tutorial'` | `'perps_home_empty_state'` | `'perps_asset_screen'` | `'perps_tab'` | `'trade_menu_action'` | `'wallet_home'` | `'market_list'` | `'screen'` | `'tooltip'` | `'perp_market_details'` | `'order_book'` | `'full_screen_chart'`
- `source` (optional): Source context for favorites (e.g., `'perp_asset_screen'`)
- `tab_name` (optional): Tab being viewed (e.g., `'trades'` | `'orders'` | `'funding'` | `'deposits'`)
- `screen_name` (optional): Screen name context (e.g., `'connection_error'` | `'perps_hero_card'` | `'perps_activity_history'`)
- `navigation_method` (optional): How user navigated in tutorial: `'swipe'` | `'continue_button'` | `'progress_dot'`
- `previous_screen` (optional): Previous screen position in tutorial navigation (number)
- `current_screen` (optional): Current screen position in tutorial navigation (number)
- `screen_position` (optional): Screen position in tutorial (number)
- `total_screens` (optional): Total screens in tutorial (number)
- `completion_duration_tutorial` (optional): Time spent in tutorial (number)
- `steps_viewed` (optional): Number of tutorial steps viewed (number)
- `view_occurrences` (optional): Number of times tutorial was viewed (number)
- `ab_test_button_color` (optional): Button color test variant (`'control' | 'monochrome'`), only included when test is enabled and user taps Long/Short or Place Order button (for engagement tracking)
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
- `screen_type` (optional): `'create_tpsl' | 'edit_tpsl'` - Whether creating TP/SL for new order or editing existing position
- `has_take_profit` (optional): Whether take profit is set (boolean)
- `has_stop_loss` (optional): Whether stop loss is set (boolean)
- `take_profit_percentage` (optional): Take profit percentage from entry price (number)
- `stop_loss_percentage` (optional): Stop loss percentage from entry price (number)
- `error_message` (optional): Error description when status is 'failed'

### 8. PERPS_ERROR

**Properties:**

- `error_type` (required for errors): `'network' | 'app_crash' | 'backend' | 'validation'`
- `error_message` (required for errors): Error description string
- `warning_message` (required for warnings): Warning description string
- `screen_type` (optional): Screen where error/warning occurred (e.g., `'trading'`, `'withdrawal'`, `'market_list'`, `'position_close'`)
- `screen_name` (optional): Specific screen name (e.g., `'connection_error'`, `'perps_market_details'`, `'perps_order'`)
- `retry_attempts` (optional): Number of retry attempts (number)
- `asset` (optional): Asset symbol if error is asset-specific (e.g., `'BTC'`, `'ETH'`)
- `action` (optional): Action being attempted when error occurred

**Note:** This event is used for both errors (with `error_type` + `error_message`) and warnings (with `warning_message`).

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
   - Include `ab_test_button_color` when user taps Long/Short or Place Order button
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

## PnL Hero Card Tracking

The PnL Hero Card screen is tracked with additional P&L context and source information.

### Properties

- `screen_type`: `'pnl_hero_card'`
- `source`: `'close_toast' | 'perp_asset_screen'` - How user arrived at the screen
- `pnl_dollar`: P&L in dollars (number)
- `pnl_percent`: P&L as percentage (ROE)
- `asset`: Asset symbol (e.g., `'BTC'`)
- `direction`: `'long' | 'short'`

### Source Values

| Value                 | Description                                     |
| --------------------- | ----------------------------------------------- |
| `'close_toast'`       | User tapped on the close position success toast |
| `'perp_asset_screen'` | User navigated from the asset/position screen   |

---

## TP/SL Screen Differentiation

The TP/SL (Take Profit / Stop Loss) tracking differentiates between creating TP/SL for a new order vs editing TP/SL for an existing position.

### Screen Types

| Value           | Description                                             |
| --------------- | ------------------------------------------------------- |
| `'create_tpsl'` | Creating TP/SL for a new order (before order placement) |
| `'edit_tpsl'`   | Editing TP/SL for an existing position                  |

### Additional Properties

- `has_take_profit`: Whether take profit is currently set (boolean)
- `has_stop_loss`: Whether stop loss is currently set (boolean)
- `take_profit_percentage`: Take profit percentage from entry price
- `stop_loss_percentage`: Stop loss percentage from entry price

### Usage

```typescript
// Screen view tracking
usePerpsEventTracking({
  eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
  properties: {
    [PerpsEventProperties.SCREEN_TYPE]: isEditingExistingPosition
      ? PerpsEventValues.SCREEN_TYPE.EDIT_TPSL
      : PerpsEventValues.SCREEN_TYPE.CREATE_TPSL,
    [PerpsEventProperties.ASSET]: asset,
    [PerpsEventProperties.HAS_TAKE_PROFIT]: !!initialTakeProfitPrice,
    [PerpsEventProperties.HAS_STOP_LOSS]: !!initialStopLossPrice,
  },
});
```

---

## Entry Point Tracking

Entry point tracking captures how users navigate to screens, enabling analysis of user flows and button effectiveness.

### Properties

- `button_clicked`: Identifies which button was clicked
- `button_location`: Identifies where the button was located

### Button Clicked Values

| Value                | Description                             |
| -------------------- | --------------------------------------- |
| `'deposit'`          | Add funds / deposit button              |
| `'withdraw'`         | Withdraw funds button                   |
| `'perps_home'`       | Navigate to perps home button           |
| `'tutorial'`         | Learn more / tutorial button            |
| `'tooltip'`          | Got it button in tooltip bottom sheets  |
| `'market_list'`      | Market list navigation button           |
| `'open_position'`    | Tap on a position card                  |
| `'magnifying_glass'` | Search icon button                      |
| `'crypto'`           | Crypto tab in market list               |
| `'stocks'`           | Stocks & Commodities tab in market list |
| `'give_feedback'`    | Give feedback button                    |

### Button Location Values

| Value                      | Description                         |
| -------------------------- | ----------------------------------- |
| `'perps_home'`             | Perps home screen                   |
| `'perps_tutorial'`         | Tutorial screen                     |
| `'perps_home_empty_state'` | Perps home empty state (no balance) |
| `'perps_asset_screen'`     | Asset details screen                |
| `'perps_tab'`              | Positions tab                       |
| `'trade_menu_action'`      | Trade menu action button            |
| `'wallet_home'`            | Wallet home screen                  |
| `'market_list'`            | Market list screen                  |
| `'screen'`                 | Generic screen location             |
| `'tooltip'`                | Tooltip bottom sheet                |
| `'perp_market_details'`    | Market details screen               |
| `'order_book'`             | Order book screen                   |
| `'full_screen_chart'`      | Full screen chart view              |

### Usage Example

```typescript
// Track button click
track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
  [PerpsEventProperties.INTERACTION_TYPE]:
    PerpsEventValues.INTERACTION_TYPE.BUTTON_CLICKED,
  [PerpsEventProperties.BUTTON_CLICKED]:
    PerpsEventValues.BUTTON_CLICKED.DEPOSIT,
  [PerpsEventProperties.BUTTON_LOCATION]:
    PerpsEventValues.BUTTON_LOCATION.PERPS_HOME,
});

// Pass to navigation for screen view tracking
navigation.navigate(Routes.PERPS.MARKET_LIST, {
  button_clicked: PerpsEventValues.BUTTON_CLICKED.MAGNIFYING_GLASS,
  button_location: PerpsEventValues.BUTTON_LOCATION.PERPS_HOME,
});

// Include in screen view event
usePerpsEventTracking({
  eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
  properties: {
    [PerpsEventProperties.SCREEN_TYPE]:
      PerpsEventValues.SCREEN_TYPE.MARKET_LIST,
    ...(buttonClicked && {
      [PerpsEventProperties.BUTTON_CLICKED]: buttonClicked,
    }),
    ...(buttonLocation && {
      [PerpsEventProperties.BUTTON_LOCATION]: buttonLocation,
    }),
  },
});
```

---

## Geo-blocking Tracking

When users are geo-blocked, the `geo_block_notif` screen type is used to track which action triggered the block.

### Properties

- `screen_type`: `'geo_block_notif'`
- `source`: What action was blocked
  - `'deposit_button'` - User tried to deposit
  - `'withdraw_button'` - User tried to withdraw
  - `'trade_action'` - User tried to place a trade
  - `'add_funds_action'` - User tried to add funds
  - `'cancel_order'` - User tried to cancel an order
  - `'asset_detail_screen'` - User tried to access asset details

### Usage

```typescript
usePerpsEventTracking({
  eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
  properties: {
    [PerpsEventProperties.SCREEN_TYPE]:
      PerpsEventValues.SCREEN_TYPE.GEO_BLOCK_NOTIF,
    [PerpsEventProperties.SOURCE]: PerpsEventValues.SOURCE.DEPOSIT_BUTTON, // or other blocked action
  },
});
```

---

## Best Practices

1. **Use constants** - Never hardcode strings
2. **Track status** - Always include success/failure
3. **Track duration** - Include `completion_duration` for transactions
4. **Use properties** - Don't create new events for minor variations
5. **Auto timestamp** - `usePerpsEventTracking` adds it automatically
6. **AB test tracking** - Only in screen view events, not every interaction
7. **Entry point tracking** - Include `button_clicked` and `button_location` to track user navigation flows

## Sentry vs MetaMetrics

| Sentry                | MetaMetrics             |
| --------------------- | ----------------------- |
| 38+ traces            | 8 events                |
| Performance           | Behavior                |
| Technical metrics     | Business metrics        |
| `usePerpsMeasurement` | `usePerpsEventTracking` |

## Related Files

- **Event Tracking Hook**: `app/components/UI/Perps/hooks/usePerpsEventTracking.ts`
- **Events**: `app/core/Analytics/MetaMetrics.events.ts`
- **Properties & Values**: `app/components/UI/Perps/constants/eventNames.ts`
- **Controller**: `app/components/UI/Perps/controllers/PerpsController.ts`
- **Trading Service**: `app/components/UI/Perps/controllers/services/TradingService.ts`
