# Perps MetaMetrics Event Reference

## Overview

MetaMetrics uses **9 consolidated events** with discriminating properties (vs 38+ Sentry traces). Optimizes Segment costs by grouping similar actions into generic events with type properties.

**Example:** `PERPS_SCREEN_VIEWED` with `screen_type: 'trading' | 'withdrawal' | ...` instead of 9 separate screen events.

## Three Tracking Approaches

### 1. `usePerpsEventTracking` Hook (Components)

**Location:** `app/components/UI/Perps/hooks/usePerpsEventTracking.ts`

```typescript
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';

// Declarative: Track on mount
usePerpsEventTracking({
  eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
  properties: {
    [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: PERPS_EVENT_VALUE.SCREEN_TYPE.TRADING,
    [PERPS_EVENT_PROPERTY.ASSET]: 'BTC',
  },
  conditions: [!!asset], // Optional: wait for data
});

// Imperative: Track on action
const { track } = usePerpsEventTracking();
track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
  [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
    PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
  [PERPS_EVENT_PROPERTY.ACTION_TYPE]:
    PERPS_EVENT_VALUE.ACTION_TYPE.START_TRADING,
});
```

### 2. Controller / Services Tracking (Transactions)

**Location:** `app/controllers/perps/PerpsController.ts`, `app/controllers/perps/services/TradingService.ts`, etc.

The controller and services use `trackPerpsEvent` from the metrics adapter (see `app/components/UI/Perps/adapters/mobileInfrastructure.ts`), which maps to MetaMetrics events via `AnalyticsEventBuilder`.

```typescript
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';

// Inside controller/service (metrics injected via dependencies)
this.#getMetrics().trackPerpsEvent(PerpsAnalyticsEvent.TradeTransaction, {
  [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.EXECUTED,
  [PERPS_EVENT_PROPERTY.ASSET]: params.coin,
  [PERPS_EVENT_PROPERTY.ORDER_TYPE]: params.orderType,
  [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: performance.now() - startTime,
});
```

## 9 Events

### 1. PERPS_SCREEN_VIEWED

**Properties:**

- `screen_type` (required): Type of screen being viewed
  - **Core screens:** `'markets'` | `'trading'` | `'position_close'` | `'leverage'` | `'tutorial'` | `'withdrawal'` | `'asset_details'` | `'error'`
  - **Home screens:** `'perps_home'` | `'wallet_home_perps_tab'` | `'homescreen'` _(deprecated, use perps_home)_
  - **TP/SL screens:** `'tp_sl'` | `'create_tpsl'` | `'edit_tpsl'`
  - **Deposit screens:** `'deposit_input'` | `'deposit_review'`
  - **Market list screens:** `'market_list'` | `'market_list_all'` | `'market_list_crypto'` | `'market_list_stocks'`
  - **Position management:** `'close_all_positions'` | `'cancel_all_orders'` | `'increase_exposure'` | `'add_margin'` | `'remove_margin'`
  - **Other screens:** `'pnl_hero_card'` | `'order_book'` | `'full_screen_chart'` | `'activity'` | `'geo_block_notif'` | `'compliance_block_notif'` | `'cancel_trade_with_token_toast'`
- `asset` (optional): Asset symbol (e.g., `'BTC'`, `'ETH'`)
- `direction` (optional): `'long' | 'short'`
- `source` (optional): Where user came from
  - **Entry points:** `'banner'` | `'notification'` | `'main_action_button'` | `'deeplink'` | `'push_notification'`
  - **Navigation sources:** `'perp_markets'` | `'perp_market'` | `'perp_market_search'` | `'perp_asset_screen'` | `'position_tab'` | `'perps_tab'`
  - **Home source:** `'perps_home'` — unified origin for all market taps from `PerpsHomeView` (paired with `source_section`, see below)
  - **Other home-related sources (legacy/other):** `'perps_home_position'` | `'perps_home_orders'` | `'perps_home_watchlist'` | `'perps_home_explore_crypto'` | `'perps_home_explore_stocks'` | `'perps_home_activity'` | `'perps_home_empty_state'` — deprecated in favour of `source = perps_home` + `source_section`
  - **Market list sources:** `'perps_market_list_all'` | `'perps_market_list_crypto'` | `'perps_market_list_stocks'`
  - **Trade/Position sources:** `'trade_screen'` | `'position_screen'` | `'tp_sl_view'` | `'trade_menu_action'` | `'open_position'` | `'trade_details'`
  - **Explore source:** `'explore'` (from Explore/Trending page)
  - **Discovery sources:** `'related_markets'` (from Related markets rail on asset details)
  - **Other sources:** `'tutorial'` | `'perps_tutorial'` | `'close_toast'` | `'position_close_toast'` | `'tooltip'` | `'magnifying_glass'` | `'crypto_button'` | `'stocks_button'` | `'order_book'` | `'full_screen_chart'` | `'stop_loss_prompt_banner'` | `'wallet_home'` | `'wallet_main_action_menu'` | `'homescreen_tab'` | `'perps_asset_screen_no_funds'` | `'home_section'` | `'market_insights'`
  - **Geo-block sources:** `'deposit_button'` | `'withdraw_button'` | `'trade_action'` | `'add_funds_action'` | `'cancel_order'` | `'asset_detail_screen'` | `'close_position_action'` | `'modify_position_action'` | `'order_book_long_button'` | `'order_book_short_button'` | `'order_book_close_button'` | `'order_book_modify_button'` | `'auto_close_action'` | `'adjust_margin_action'` | `'stop_loss_prompt_add_margin'` | `'stop_loss_prompt_set_sl'` | `'close_all_positions_button'` | `'cancel_all_orders_button'`
- `open_position` (optional): Number of open positions (used for homepage_perps_tab, perps_home, asset_details, order_book, trading, close_all_positions screens; number)
- `open_order` (optional): Number of open orders (used for wallet_home_perps_tab, perps_home, asset_details screens; number)
- `market_category` (optional): Currently active market filter tab or watchlist state (used for `market_list` screen)
  - Filter values: `'all'` | `'crypto'` | `'stock'` | `'commodity'` | `'forex'` | `'new'`
  - Watchlist: `'watchlist'` — emitted instead of the filter when the watchlist toggle is active
- `source_section` (optional): Specific sub-section within the origin screen. Present on `asset_details` events and on per-section `perps_home` impression events. Values vary by `source`:
  - **`source = perps_home`**: `'positions'` | `'orders'` | `'watchlist'` | `'whats_happening'` | `'products'` | `'top_gainers'` | `'top_losers'` | `'crypto'` | `'commodity'` | `'stock'` | `'forex'`
  - **`source = explore`**: `'perps_movers'` | `'perps_crypto'` | `'perps_stocks_commodities'` | `'perps_markets'`
  - **`source = perp_markets`**: `'all_markets'` | `'crypto'` | `'stock'` | `'commodity'` | `'forex'` | `'new'` | `'watchlist'` | `'active_search'`
  - _All values come from `PERPS_EVENT_VALUE.SOURCE_SECTION` in `@metamask/perps-controller`._
- `section_name` (optional): Stable identifier for a home screen section viewed via scroll impression. Present only on `perps_home` impression events emitted by `usePerpsHomeSectionTracking`. Values: `'balance'` | `'positions'` | `'orders'` | `'watchlist'` | `'whats_happening'` | `'products'` | `'top_movers'` | `'explore_crypto'` | `'explore_commodities'` | `'explore_stocks'` | `'explore_forex'` | `'recent_activity'`. _(`PERPS_EVENT_PROPERTY.SECTION_NAME`; values from `PERPS_EVENT_VALUE.SECTION_NAME`.)_
- `section_index` (optional): 1-based position of the section among visible (rendered) sections, ranked by y-position. Reflects the real on-screen order and adjusts automatically for A/B reordering or hidden sections. Present alongside `section_name` on impression events. _(`PERPS_EVENT_PROPERTY.SECTION_INDEX`.)_
- `sections_displayed` (optional): Ordered array of `section_name` values visible on the home screen at the time `screen_type = perps_home` fires. Captures the layout composition in one field, enabling analysis of section co-occurrence. _(`PERPS_EVENT_PROPERTY.SECTIONS_DISPLAYED`.)_
- `watchlist_count` (optional): Number of markets in the user's watchlist at event time. Included in the base `perps_home` screen view. _(`PERPS_EVENT_PROPERTY.WATCHLIST_COUNT`.)_
- `watchlist_markets` (optional): Ordered array of market symbols in the user's watchlist at event time. Included in the base `perps_home` screen view alongside `watchlist_count`. _(`PERPS_EVENT_PROPERTY.WATCHLIST_MARKETS`.)_
- `error_type` (optional): Type of error for error screen views (e.g., `'network'`, `'backend'`; used when screen_type is `'error'`)
- `has_perp_balance` (optional): Whether user has a perps balance or positions (boolean)
- `has_take_profit` (optional): Whether take profit is set (boolean, used for TP/SL screens)
- `has_stop_loss` (optional): Whether stop loss is set (boolean, used for TP/SL screens)
- `dollar_pnl` (optional): P&L in dollars (number, used for pnl_hero_card screen)
- `percent_pnl` (optional): P&L as percentage (number, used for pnl_hero_card screen)
- `button_clicked` (optional): Button that led to this screen (entry point tracking, see [Entry Point Tracking](#entry-point-tracking))
- `button_location` (optional): Location of the button clicked (entry point tracking, see [Entry Point Tracking](#entry-point-tracking))
- `outage_banner_shown` (optional): Whether the service interruption banner is displayed (boolean, used for perps_home, asset_details, trading screens)
- `market_insights_displayed` (optional): Whether market insights content is displayed on the screen (boolean, used for asset_details screen)
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
  - **Pay-with interactions:** `'payment_token_selector'` | `'payment_method_changed'` | `'cancel_trade_with_token'`
  - **Slippage interactions:** `'slippage_config_opened'` | `'slippage_config_changed'` | `'slippage_limit_blocked_order'`
  - **Discovery interactions:** `'related_market_clicked'`
  - **Market list filter:** `'market_list_filter'` — category badge or watchlist toggle tap in PerpsMarketListView _(`PERPS_EVENT_VALUE.INTERACTION_TYPE.MARKET_LIST_FILTER`)_
- `action` (optional): Specific action performed: `'connection_retry'` | `'connection_go_back'` | `'share'` | `'add_margin'` | `'remove_margin'` | `'edit_tp_sl'` | `'create_tp_sl'` | `'create_position'` | `'increase_exposure'` | `'flip_long_to_short'` | `'flip_short_to_long'`
- `attempt_number` (optional): Retry attempt number when action is 'connection_retry' (number)
- `action_type` (optional): `'start_trading'` | `'skip'` | `'stop_loss_set'` | `'take_profit_set'` | `'adl_learn_more'` | `'learn_more'` | `'favorite_market'` | `'unfavorite_market'` (Note: `favorite_market` = add to watchlist, `unfavorite_market` = remove from watchlist)
- `asset` (optional): Asset symbol (e.g., `'BTC'`, `'ETH'`)
- `direction` (optional): `'long' | 'short'`
- `order_size` (optional): Size of the order in tokens (number)
- `leverage_used` (optional): Leverage value being used (number)
- `order_type` (optional): `'market' | 'limit'`
- `setting_type` (optional): Type of setting changed: `'leverage'` | `'slippage'`
- `input_method` (optional): How value was entered: `'slider' | 'keyboard' | 'preset' | 'manual' | 'percentage_button'`
- `candle_period` (optional): Selected candle period
- `favorites_count` (optional): Total number of markets in watchlist after toggle (number, used with `favorite_toggled`)
- `section_viewed` (optional): Section viewed through a slide interaction; includes `'related_markets'` for the asset details Related markets rail.
- `source_market` (optional): Source asset symbol for Related markets tile taps.
- `market` (optional): Destination asset symbol for Related markets tile taps.
- `category` (optional): Collection/List identifier for Related markets tile taps.
- `position` (optional): 1-based tile position in the Related markets rail.
- `button_clicked` (optional): Button identifier for entry point tracking (see [Entry Point Tracking](#entry-point-tracking)): `'deposit'` | `'withdraw'` | `'perps_home'` | `'tutorial'` | `'tooltip'` | `'market_list'` | `'open_position'` | `'magnifying_glass'` | `'crypto'` | `'stocks'` | `'give_feedback'` | `'competition_banner_engage'` | `'competition_banner_close'`
  - **Discovery section header values** _(`PERPS_EVENT_VALUE.BUTTON_CLICKED`)_: `'watchlist'` | `'top_movers'` | `'whats_happening'`
  - **Market list filter values:** `'all'` | `'crypto'` | `'stock'` | `'commodity'` | `'forex'` | `'watchlist'` (used with `interaction_type = market_list_filter`)
- `button_location` (optional): Location of the button for entry point tracking (see [Entry Point Tracking](#entry-point-tracking)): `'perps_home'` | `'perps_tutorial'` | `'perps_home_empty_state'` | `'perps_asset_screen'` | `'perps_tab'` | `'trade_menu_action'` | `'wallet_home'` | `'market_list'` | `'screen'` | `'tooltip'` | `'perp_market_details'` | `'order_book'` | `'full_screen_chart'`
  - **Legacy discovery value** _(`PERPS_EVENT_VALUE.BUTTON_LOCATION.ASSET_DETAILS`)_: `'asset_details'` — formerly the magnifying-glass button on the asset details screen. That button was replaced by the market-list arrow, which now reports `button_location = 'perp_market_details'` with `button_clicked = 'market_list'`.
- `result_count` (optional): Number of search results after a market search query stabilises; included with `interaction_type = search_clicked`. Reported for both non-zero and zero-result searches. _(`PERPS_EVENT_PROPERTY.RESULT_COUNT`.)_
- `initial_payment_method` (optional): Payment method before change (e.g. `'perps_balance'` or token symbol; used with `payment_method_changed`)
- `new_payment_method` (optional): Payment method after change (e.g. `'perps_balance'` or token symbol; used with `payment_method_changed`)
- `max_slippage_pct` (optional): Current max slippage percentage (number, used with slippage interactions)
- `max_slippage_source` (optional): How the slippage value was set: `'default' | 'user_configured'` (used with slippage interactions)
- `estimated_slippage_pct` (optional): Estimated slippage percentage (number, used with `slippage_limit_blocked_order`)
- `section_viewed` (optional): Stable section name scrolled into view (e.g., `'explore_crypto'`, `'explore_stocks'`, `'recent_activity'`; used with `slide` interaction). Values match `PERPS_EVENT_VALUE.SECTION_NAME` constants.
- `location` (optional): Location context for scroll tracking (e.g., `'perps_home'`)
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
- `source` (optional): Screen where trade was initiated (e.g., `'perp_asset_screen'`, `'order_book_long_button'`, `'position_screen'`, `'explore'`)
- `action` (optional): Specific trade action: `'create_position'` | `'increase_exposure'` | `'flip_long_to_short'` | `'flip_short_to_long'`
- `order_value` (optional): USD value of the order (order_size × asset_price; number)
- `margin_used` (optional): Margin required/used in USDC (number)
- `metamask_fee` (optional): MetaMask fee amount in USDC (number)
- `metamask_fee_rate` (optional): MetaMask fee rate as decimal (number)
- `discount_percentage` (optional): Fee discount percentage (number)
- `estimated_rewards` (optional): Estimated reward points (number)
- `take_profit_price` (optional): Take profit trigger price (number)
- `stop_loss_price` (optional): Stop loss trigger price (number)
- `input_method` (optional): How value was entered: `'slider' | 'keyboard' | 'preset' | 'manual' | 'percentage_button'`
- `limit_price` (optional): Limit order price (for limit orders) (number)
- `trade_with_token` (optional): Whether the user paid with a token other than Perps balance (boolean)
- `mm_pay_token_selected` (optional): Token symbol selected for pay-with (e.g. `'USDC'`); when `trade_with_token` is true, the selected token symbol; when user uses Perps balance, `'Perps Balance'`
- `mm_pay_network_selected` (optional): Network/chain for pay-with (e.g. `'ethereum'`), included when `trade_with_token` is true
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
- `source` (optional): Screen where close was initiated (e.g., `'perp_asset_screen'`, `'order_book'`, `'position_screen'`)
- `order_value` (optional): USD value of the close order (requested_size × asset_price; number)
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

- `status` (required): `'completed' | 'failed'` (withdrawal uses `completed` rather than `executed`)
- `withdrawal_amount` (required): Amount being withdrawn in USDC (number)
- `completion_duration` (optional): Duration in milliseconds (number)
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
- `action` (optional): Which TP/SL fields were set: `'tp'` (take profit only) | `'sl'` (stop loss only) | `'tpsl'` (both)
- `position_size` (optional): Size of the position (number)
- `screen_type` (optional): `'create_tpsl' | 'edit_tpsl'` - Whether creating TP/SL for new order or editing existing position
- `has_take_profit` (optional): Whether take profit is set (boolean)
- `has_stop_loss` (optional): Whether stop loss is set (boolean)
- `take_profit_percentage` (optional): Take profit percentage from entry price (number)
- `stop_loss_percentage` (optional): Stop loss percentage from entry price (number)
- `error_message` (optional): Error description when status is 'failed'

### 8. PERPS_ERROR

**Properties:**

- `error_type` (required for errors): `'network' | 'app_crash' | 'backend' | 'validation' | 'warning'`
- `error_message` (required for errors): Error description string (prefer `PERPS_EVENT_VALUE.ERROR_MESSAGE_KEY` for consistent analytics)
- `warning_message` (required for warnings): Warning description string
- `screen_type` (optional): Screen where error/warning occurred (e.g., `'trading'`, `'withdrawal'`, `'market_list'`, `'position_close'`)
- `screen_name` (optional): Specific screen name (e.g., `'connection_error'`, `'perps_market_details'`, `'perps_order'`, `'perps_hero_card'`, `'perps_activity_history'`, `'perps_home'`)
- `retry_attempts` (optional): Number of retry attempts (number)
- `asset` (optional): Asset symbol if error is asset-specific (e.g., `'BTC'`, `'ETH'`)
- `action` (optional): Action being attempted when error occurred

**Note:** This event is used for both errors (with `error_type` + `error_message`) and warnings (with `warning_message`). Use `PERPS_EVENT_VALUE.ERROR_MESSAGE_KEY` for standardized error message keys (e.g., `insufficient_balance`, `order_failed`, `geo_restriction`).

### 9. PERPS_ACCOUNT_SETUP

Tracks unified account (HIP-3) migration lifecycle on HyperLiquid. Fired from the controller's `HyperLiquidProvider` during account abstraction mode transitions. Not used directly from UI components.

**Properties:**

- `status` (required): Migration outcome
  - `'not_applicable'` - Wallet has no HyperLiquid account yet (nothing to migrate)
  - `'already_enabled'` - Account is already in a compatible mode (`unifiedAccount` or `portfolioMargin`)
  - `'migration_required'` - Account needs migration from a legacy mode
  - `'success'` - Migration completed successfully
  - `'failed'` - Migration failed (user rejected signature or network error)
- `abstraction_mode` (required): Current or target account abstraction mode (string, e.g., `'unifiedAccount'`, `'dexAbstraction'`, `'default'`, `'disabled'`)
- `previous_abstraction_mode` (optional): Account mode before migration attempt (string, included on success/failure)
- `error_message` (optional): Error description when status is `'failed'` or `'not_applicable'` (e.g., `'no_hl_account'`)

**Usage (controller-side only):**

```typescript
// Inside HyperLiquidProvider (via trackPerpsEvent)
this.#deps.metrics.trackPerpsEvent(PerpsAnalyticsEvent.AccountSetup, {
  [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.SUCCESS,
  [PERPS_EVENT_PROPERTY.PREVIOUS_ABSTRACTION_MODE]: currentMode,
  [PERPS_EVENT_PROPERTY.ABSTRACTION_MODE]: 'unifiedAccount',
});
```

## Quick Reference

> **Note:** In code, property names and values are accessed via `PERPS_EVENT_PROPERTY` and `PERPS_EVENT_VALUE` from `@metamask/perps-controller` (source: `packages/perps-controller/src/constants/eventNames.ts` in the [MetaMask/core](https://github.com/MetaMask/core) monorepo). The string values shown in the event sections above are what actually gets sent to Segment.

## Adding Events

### Screen View

```typescript
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';

usePerpsEventTracking({
  eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
  properties: {
    [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
      PERPS_EVENT_VALUE.SCREEN_TYPE.YOUR_SCREEN,
  },
});
```

### UI Interaction

```typescript
const { track } = usePerpsEventTracking();
track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
  [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
    PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
});
```

### Transaction (Controller / Services)

```typescript
// Via metrics adapter (trackPerpsEvent)
this.#getMetrics().trackPerpsEvent(PerpsAnalyticsEvent.TradeTransaction, {
  [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.EXECUTED,
  [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: duration,
});
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
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';

usePerpsEventTracking({
  eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
  properties: {
    [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
      PERPS_EVENT_VALUE.SCREEN_TYPE.ASSET_DETAILS,
    [PERPS_EVENT_PROPERTY.ASSET]: 'BTC',
    // Test 1: Button color test (TAT-1937) - only included when enabled
    ...(isButtonColorTestEnabled && {
      [PERPS_EVENT_PROPERTY.AB_TEST_BUTTON_COLOR]: buttonColorVariant,
    }),
    // Test 2: Asset CTA test (TAT-1940) - future
    ...(isAssetCTATestEnabled && {
      [PERPS_EVENT_PROPERTY.AB_TEST_ASSET_CTA]: assetCTAVariant,
    }),
    // Test 3: Homepage CTA test (TAT-1827) - future
    ...(isHomepageCTATestEnabled && {
      [PERPS_EVENT_PROPERTY.AB_TEST_HOMEPAGE_CTA]: homepageCTAVariant,
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
- `dollar_pnl`: P&L in dollars (number)
- `percent_pnl`: P&L as percentage (ROE)
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
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';

// Screen view tracking
usePerpsEventTracking({
  eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
  properties: {
    [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: isEditingExistingPosition
      ? PERPS_EVENT_VALUE.SCREEN_TYPE.EDIT_TPSL
      : PERPS_EVENT_VALUE.SCREEN_TYPE.CREATE_TPSL,
    [PERPS_EVENT_PROPERTY.ASSET]: asset,
    [PERPS_EVENT_PROPERTY.HAS_TAKE_PROFIT]: !!initialTakeProfitPrice,
    [PERPS_EVENT_PROPERTY.HAS_STOP_LOSS]: !!initialStopLossPrice,
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

| Value                         | Description                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `'deposit'`                   | Add funds / deposit button                                                                                            |
| `'withdraw'`                  | Withdraw funds button                                                                                                 |
| `'perps_home'`                | Navigate to perps home button                                                                                         |
| `'tutorial'`                  | Learn more / tutorial button                                                                                          |
| `'tooltip'`                   | Got it button in tooltip bottom sheets                                                                                |
| `'market_list'`               | Market list navigation button                                                                                         |
| `'open_position'`             | Tap on a position card                                                                                                |
| `'magnifying_glass'`          | Search icon button                                                                                                    |
| `'crypto'`                    | Crypto tab in market list                                                                                             |
| `'stocks'`                    | Stocks & Commodities tab in market list                                                                               |
| `'commodities'`               | Commodities tab                                                                                                       |
| `'forex'`                     | Forex tab                                                                                                             |
| `'new'`                       | New markets                                                                                                           |
| `'give_feedback'`             | Give feedback button                                                                                                  |
| `'competition_banner_engage'` | User tapped the competition banner to navigate to rewards _(local constant, pending addition to `PERPS_EVENT_VALUE`)_ |
| `'competition_banner_close'`  | User dismissed the competition banner _(local constant, pending addition to `PERPS_EVENT_VALUE`)_                     |
| `'watchlist'`                 | Watchlist section "See all" header tap (home) or watchlist toggle in market list _(local constant)_                   |
| `'top_movers'`                | Top Movers section "View All" header tap _(local constant)_                                                           |
| `'whats_happening'`           | What's Happening section header tap _(local constant)_                                                                |

### Button Location Values

| Value                      | Description                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `'perps_home'`             | Perps home screen                                                                                                                         |
| `'perps_tutorial'`         | Tutorial screen                                                                                                                           |
| `'perps_home_empty_state'` | Perps home empty state (no balance)                                                                                                       |
| `'perps_asset_screen'`     | Asset details screen                                                                                                                      |
| `'perps_tab'`              | Positions tab                                                                                                                             |
| `'trade_menu_action'`      | Trade menu action button                                                                                                                  |
| `'wallet_home'`            | Wallet home screen                                                                                                                        |
| `'market_list'`            | Market list screen                                                                                                                        |
| `'screen'`                 | Generic screen location                                                                                                                   |
| `'tooltip'`                | Tooltip bottom sheet                                                                                                                      |
| `'perp_market_details'`    | Market details screen                                                                                                                     |
| `'order_book'`             | Order book screen                                                                                                                         |
| `'full_screen_chart'`      | Full screen chart view                                                                                                                    |
| `'asset_details'`          | Legacy — former magnifying-glass button on the asset details screen (replaced by the market-list arrow reporting `'perp_market_details'`) |

### Usage Example

```typescript
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';

// Track button click
track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
  [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
    PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
  [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
    PERPS_EVENT_VALUE.BUTTON_CLICKED.DEPOSIT,
  [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
    PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
});

// Pass to navigation for screen view tracking
navigation.navigate(Routes.PERPS.MARKET_LIST, {
  button_clicked: PERPS_EVENT_VALUE.BUTTON_CLICKED.MAGNIFYING_GLASS,
  button_location: PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
});

// Include in screen view event
usePerpsEventTracking({
  eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
  properties: {
    [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
      PERPS_EVENT_VALUE.SCREEN_TYPE.MARKET_LIST,
    ...(buttonClicked && {
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]: buttonClicked,
    }),
    ...(buttonLocation && {
      [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]: buttonLocation,
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
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';

usePerpsEventTracking({
  eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
  properties: {
    [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
      PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
    [PERPS_EVENT_PROPERTY.SOURCE]: PERPS_EVENT_VALUE.SOURCE.DEPOSIT_BUTTON, // or other blocked action
  },
});
```

---

## Compliance (OFAC) Blocking Tracking

When a wallet is blocked by an OFAC compliance check, the `compliance_block_notif` screen type is used. The event fires automatically via `AccessRestrictedContext` whenever `showAccessRestrictedModal()` is called — no per-action tracking is needed.

### Properties

- `screen_type`: `'compliance_block_notif'`

### Constant

```typescript
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';

// PERPS_EVENT_VALUE.SCREEN_TYPE.COMPLIANCE_BLOCK_NOTIF === 'compliance_block_notif'
```

### Where the event fires

The event is tracked in `showAccessRestrictedModal` inside `AccessRestrictedContext.tsx`. All call sites — `useComplianceGate` and every gated action handler — call this method, so coverage is automatic.

```typescript
// app/components/UI/Compliance/contexts/AccessRestrictedContext.tsx
const showAccessRestrictedModal = useCallback(() => {
  notificationAsync(NotificationFeedbackType.Warning);
  setIsVisible(true);
  track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
    [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
      PERPS_EVENT_VALUE.SCREEN_TYPE.COMPLIANCE_BLOCK_NOTIF,
  });
}, [track]);
```

### Difference from geo-blocking

|                    | Geo-blocking                       | Compliance blocking                            |
| ------------------ | ---------------------------------- | ---------------------------------------------- |
| `screen_type`      | `geo_block_notif`                  | `compliance_block_notif`                       |
| Tracked per action | Yes — each handler tracks `source` | No — tracked once in context                   |
| Source property    | Identifies the blocked action      | Not included (all routes share the same modal) |
| Feature flag       | Geo eligibility                    | `complianceEnabled`                            |

---

---

## Section Identity Mapping (Discovery System)

The Perps Discovery System uses a unified **`source` + `source_section`** model across all entry points. `source` identifies the high-level origin screen; `source_section` identifies the specific sub-section within it.

> **Deprecation note**: Encoded `source` values like `perps_home_watchlist`, `perps_home_explore_crypto`, `perps_home_top_gainers` are replaced by `source = perps_home` + `source_section`. The old encoded values still exist in `@metamask/perps-controller` but are no longer emitted from the discovery system.

### 1. Home screen taps (`source = perps_home`)

When a user taps a market in `PerpsHomeView`, `source = perps_home` and `source_section` identifies the section:

| Home section          | `source_section` value | Constant                                           |
| --------------------- | ---------------------- | -------------------------------------------------- |
| Position card         | `'positions'`          | `PERPS_EVENT_VALUE.SOURCE_SECTION.POSITIONS`       |
| Order card            | `'orders'`             | `PERPS_EVENT_VALUE.SOURCE_SECTION.ORDERS`          |
| Watchlist             | `'watchlist'`          | `PERPS_EVENT_VALUE.SOURCE_SECTION.WATCHLIST`       |
| What's Happening      | `'whats_happening'`    | `PERPS_EVENT_VALUE.SOURCE_SECTION.WHATS_HAPPENING` |
| Products              | `'products'`           | `PERPS_EVENT_VALUE.SOURCE_SECTION.PRODUCTS`        |
| Top Movers (gainers)  | `'top_gainers'`        | `PERPS_EVENT_VALUE.SOURCE_SECTION.TOP_GAINERS`     |
| Top Movers (losers)   | `'top_losers'`         | `PERPS_EVENT_VALUE.SOURCE_SECTION.TOP_LOSERS`      |
| Explore › Crypto      | `'crypto'`             | `PERPS_EVENT_VALUE.SOURCE_SECTION.CRYPTO`          |
| Explore › Commodities | `'commodity'`          | `PERPS_EVENT_VALUE.SOURCE_SECTION.COMMODITY`       |
| Explore › Stocks      | `'stock'`              | `PERPS_EVENT_VALUE.SOURCE_SECTION.STOCK`           |
| Explore › Forex       | `'forex'`              | `PERPS_EVENT_VALUE.SOURCE_SECTION.FOREX`           |

### 2. Explore/Trending taps (`source = explore`)

When a user taps a market in the Explore/Trending view, `source = explore` and `source_section` identifies the tab's Perps section:

| Explore tab | Perps section            | `source_section` value       | Constant                                                    |
| ----------- | ------------------------ | ---------------------------- | ----------------------------------------------------------- |
| Now         | Perps Movers (pill list) | `'perps_movers'`             | `PERPS_EVENT_VALUE.SOURCE_SECTION.PERPS_MOVERS`             |
| Crypto      | Crypto Perps (tiles)     | `'perps_crypto'`             | `PERPS_EVENT_VALUE.SOURCE_SECTION.PERPS_CRYPTO`             |
| Macro       | Stocks & Commodities     | `'perps_stocks_commodities'` | `PERPS_EVENT_VALUE.SOURCE_SECTION.PERPS_STOCKS_COMMODITIES` |
| RWAs        | RWA markets              | `'perps_markets'`            | `PERPS_EVENT_VALUE.SOURCE_SECTION.PERPS_MARKETS`            |

### 3. Market list taps (`source = perp_markets`)

When navigating from `PerpsMarketListView` → `PerpsMarketDetailsView`, `source = perp_markets` (always) and `source_section` carries the active subsection at the time of tap:

| Active state in market list | `source_section` value | Constant                                         |
| --------------------------- | ---------------------- | ------------------------------------------------ |
| No filter, no search        | `'all_markets'`        | `PERPS_EVENT_VALUE.SOURCE_SECTION.ALL_MARKETS`   |
| Crypto filter active        | `'crypto'`             | `PERPS_EVENT_VALUE.SOURCE_SECTION.CRYPTO`        |
| Stock filter active         | `'stock'`              | `PERPS_EVENT_VALUE.SOURCE_SECTION.STOCK`         |
| Commodity filter active     | `'commodity'`          | `PERPS_EVENT_VALUE.SOURCE_SECTION.COMMODITY`     |
| Forex filter active         | `'forex'`              | `PERPS_EVENT_VALUE.SOURCE_SECTION.FOREX`         |
| New markets filter active   | `'new'`                | `PERPS_EVENT_VALUE.SOURCE_SECTION.NEW`           |
| Watchlist toggle active     | `'watchlist'`          | `PERPS_EVENT_VALUE.SOURCE_SECTION.WATCHLIST`     |
| Search query present        | `'active_search'`      | `PERPS_EVENT_VALUE.SOURCE_SECTION.ACTIVE_SEARCH` |

### 4. Section impression events (`screen_type = perps_home`)

`usePerpsHomeSectionTracking` emits two events per section as the user scrolls it into view:

1. `PERPS_UI_INTERACTION { interaction_type: slide, section_viewed: <section_name>, location: perps_home }` — existing slide event (kept)
2. `PERPS_SCREEN_VIEWED { screen_type: perps_home, section_name, section_index }` — per-section impression

Section names used in impression events:

| Home section        | `section_name` value    | `PERPS_EVENT_VALUE.SECTION_NAME` constant |
| ------------------- | ----------------------- | ----------------------------------------- |
| Balance             | `'balance'`             | `BALANCE`                                 |
| Positions           | `'positions'`           | `POSITIONS`                               |
| Orders              | `'orders'`              | `ORDERS`                                  |
| Watchlist           | `'watchlist'`           | `WATCHLIST`                               |
| What's Happening    | `'whats_happening'`     | `WHATS_HAPPENING`                         |
| Products            | `'products'`            | `PRODUCTS`                                |
| Top Movers          | `'top_movers'`          | `TOP_MOVERS`                              |
| Explore Crypto      | `'explore_crypto'`      | `EXPLORE_CRYPTO`                          |
| Explore Commodities | `'explore_commodities'` | `EXPLORE_COMMODITIES`                     |
| Explore Stocks      | `'explore_stocks'`      | `EXPLORE_STOCKS`                          |
| Explore Forex       | `'explore_forex'`       | `EXPLORE_FOREX`                           |
| Recent Activity     | `'recent_activity'`     | `RECENT_ACTIVITY`                         |

`section_index` = 1-based rank by y-position among rendered sections. Adjusts automatically for hidden or A/B-reordered sections.

> **All `source_section` and `section_name` values are sourced from `@metamask/perps-controller`** (`PERPS_EVENT_VALUE.SOURCE_SECTION` and `PERPS_EVENT_VALUE.SECTION_NAME`).

---

## Best Practices

1. **Use constants** - Never hardcode strings
2. **Track status** - Always include success/failure
3. **Track duration** - Include `completion_duration` for transactions
4. **Use properties** - Don't create new events for minor variations
5. **Auto timestamp** - `usePerpsEventTracking` adds it automatically
6. **AB test tracking** - Only in screen view events, not every interaction
7. **Entry point tracking** - Include `button_clicked` and `button_location` to track user navigation flows
8. **Source = current screen** - The `source` property must always identify the screen the user is currently on, never a screen from earlier in the navigation chain. If the user navigates A → B → action C, the source for C must be B, not A.
9. **Explicit source passing** - Reusable components (e.g., `PerpsMarketTypeSection`, `PerpsWatchlistMarkets`, `PerpsCard`) must receive `source` as a prop from the parent screen rather than setting it implicitly. The screen component is the single owner of the `source` value.

## Sentry vs MetaMetrics

| Sentry                | MetaMetrics             |
| --------------------- | ----------------------- |
| 38+ traces            | 9 events                |
| Performance           | Behavior                |
| Technical metrics     | Business metrics        |
| `usePerpsMeasurement` | `usePerpsEventTracking` |

## Related Files

- **Event Tracking Hook**: `app/components/UI/Perps/hooks/usePerpsEventTracking.ts`
- **Events**: `app/core/Analytics/MetaMetrics.events.ts`
- **Properties & Values**: Exported from `@metamask/perps-controller` as `PERPS_EVENT_PROPERTY`, `PERPS_EVENT_VALUE` (source: `packages/perps-controller/src/constants/eventNames.ts` in the [MetaMask/core](https://github.com/MetaMask/core) monorepo)
- **Metrics Adapter**: `app/components/UI/Perps/adapters/mobileInfrastructure.ts` (maps `trackPerpsEvent` to MetaMetrics)
- **Controller**: `@metamask/perps-controller` (`PerpsController`, `HyperLiquidProvider`, `TradingService`, `AccountService`)
- **Asset Viewed Funnel**: `app/core/Analytics/trade-transaction-funnel/assetViewedAnalytics.ts` (parallel `ASSET_VIEWED` emission for Perps)
