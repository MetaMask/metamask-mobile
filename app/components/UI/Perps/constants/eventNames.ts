/**
 * Perps event property keys and values - matching dashboard requirements exactly
 * Event names are defined in MetaMetrics.events.ts as the single source of truth
 */

/**
 * Event property keys - ensures consistent property naming
 */
export const PerpsEventProperties = {
  // Common properties
  TIMESTAMP: 'timestamp',
  ASSET: 'asset',
  DIRECTION: 'direction',
  SOURCE: 'source',
  TAB_NAME: 'tab_name',

  // Trade properties
  LEVERAGE: 'leverage',
  LEVERAGE_USED: 'leverage_used',
  ORDER_SIZE: 'order_size',
  MARGIN_USED: 'margin_used',
  ORDER_TYPE: 'order_type', // lowercase per dashboard
  ORDER_TIMESTAMP: 'order_timestamp',
  LIMIT_PRICE: 'limit_price',
  FEES: 'fees',
  FEE: 'fee',
  METAMASK_FEE: 'metamask_fee',
  METAMASK_FEE_RATE: 'metamask_fee_rate',
  DISCOUNT_PERCENTAGE: 'discount_percentage',
  ESTIMATED_REWARDS: 'estimated_rewards',
  ASSET_PRICE: 'asset_price',
  COMPLETION_DURATION: 'completion_duration',

  // Position properties
  OPEN_POSITION: 'open_position',
  OPEN_POSITION_SIZE: 'open_position_size',
  UNREALIZED_PNL_DOLLAR: 'unrealized_dollar_pnl',
  UNREALIZED_PNL_PERCENT: 'unrealized_percent_pnl',
  CLOSE_VALUE: 'close_value',
  CLOSE_PERCENTAGE: 'close_percentage',
  CLOSE_TYPE: 'close_type',
  PERCENTAGE_CLOSED: 'percentage_closed',
  PNL_DOLLAR: 'dollar_pnl',
  PNL_PERCENT: 'percent_pnl',
  RECEIVED_AMOUNT: 'received_amount',

  // Order type variations
  CURRENT_ORDER_TYPE: 'current_order_type',
  SELECTED_ORDER_TYPE: 'selected_order_type',

  // Funding properties
  SOURCE_CHAIN: 'source_chain',
  SOURCE_ASSET: 'source_asset',
  SOURCE_AMOUNT: 'source_amount',
  DESTINATION_AMOUNT: 'destination_amount',
  NETWORK_FEE: 'network_fee',
  WITHDRAWAL_AMOUNT: 'withdrawal_amount',

  // Chart properties
  INTERACTION_TYPE: 'interaction_type',
  TIME_SERIE_SELECTED: 'time_serie_selected',
  CANDLE_PERIOD: 'candle_period',

  // Risk management properties
  STOP_LOSS_PRICE: 'stop_loss_price',
  STOP_LOSS_PERCENT: 'stop_loss_percent',
  TAKE_PROFIT_PRICE: 'take_profit_price',
  TAKE_PROFIT_PERCENT: 'take_profit_percent',
  POSITION_SIZE: 'position_size',
  POSITION_AGE: 'position_age',

  // Notification properties
  NOTIFICATION_TYPE: 'notification_type',

  // Other properties
  INPUT_METHOD: 'input_method', // camelCase per requirements
  ACTION_TYPE: 'action_type',
  SETTING_TYPE: 'setting_type',
  FAILURE_REASON: 'failure_reason',
  WARNING_TYPE: 'warning_type',
  WARNING_MESSAGE: 'warning_message',
  ERROR_TYPE: 'error_type',
  ERROR_MESSAGE: 'error_message',
  COMPLETION_DURATION_TUTORIAL: 'completion_duration_tutorial',
  STEPS_VIEWED: 'steps_viewed',
  VIEW_OCCURRENCES: 'view_occurrences',
  AMOUNT_FILLED: 'amount_filled',
  REMAINING_AMOUNT: 'remaining_amount',

  // Tutorial carousel navigation properties
  PREVIOUS_SCREEN: 'previous_screen',
  CURRENT_SCREEN: 'current_screen',
  SCREEN_POSITION: 'screen_position',
  TOTAL_SCREENS: 'total_screens',
  NAVIGATION_METHOD: 'navigation_method',
  STATUS: 'status',
  SCREEN_TYPE: 'screen_type',
  SCREEN_NAME: 'screen_name',
  ACTION: 'action',
  RETRY_ATTEMPTS: 'retry_attempts',
  SHOW_BACK_BUTTON: 'show_back_button',
  ATTEMPT_NUMBER: 'attempt_number',

  // PnL Hero Card properties
  IMAGE_SELECTED: 'image_selected',
  TAB_NUMBER: 'tab_number',

  // A/B testing properties (flat per test for multiple concurrent tests)
  // Only include AB test properties when test is enabled (event not sent when disabled)
  // Button color test (TAT-1937)
  AB_TEST_BUTTON_COLOR: 'ab_test_button_color',
  // Future tests: add as AB_TEST_{TEST_NAME} (no _ENABLED property needed)

  // Watchlist/Favorites properties
  FAVORITES_COUNT: 'favorites_count',
} as const;

/**
 * Property value constants
 */
export const PerpsEventValues = {
  DIRECTION: {
    LONG: 'long',
    SHORT: 'short',
  },
  ORDER_TYPE: {
    MARKET: 'market',
    LIMIT: 'limit',
  },
  ORDER_TYPE_CAPITALIZED: {
    MARKET: 'market',
    LIMIT: 'limit',
  },
  INPUT_METHOD: {
    SLIDER: 'slider',
    KEYBOARD: 'keyboard',
    PRESET: 'preset',
    MANUAL: 'manual',
    PERCENTAGE_BUTTON: 'percentage_button',
  },
  SOURCE: {
    BANNER: 'banner',
    NOTIFICATION: 'notification',
    MAIN_ACTION_BUTTON: 'main_action_button',
    POSITION_TAB: 'position_tab',
    PERP_MARKETS: 'perp_markets',
    DEEPLINK: 'deeplink',
    TUTORIAL: 'tutorial',
    TRADE_SCREEN: 'trade_screen',
    HOMESCREEN_TAB: 'homescreen_tab',
    PERP_ASSET_SCREEN: 'perp_asset_screen',
    PERP_MARKET: 'perp_market',
    PERP_MARKET_SEARCH: 'perp_market_search',
    POSITION_SCREEN: 'position_screen',
    TP_SL_VIEW: 'tp_sl_view',
  },
  WARNING_TYPE: {
    MINIMUM_DEPOSIT: 'minimum_deposit',
    MINIMUM_ORDER_SIZE: 'minimum_order_size',
    INSUFFICIENT_BALANCE: 'insufficient_balance',
  },
  ERROR_TYPE: {
    NETWORK: 'network',
    APP_CRASH: 'app_crash',
    BACKEND: 'backend',
    VALIDATION: 'validation',
  },
  INTERACTION_TYPE: {
    TAP: 'tap',
    ZOOM: 'zoom',
    SLIDE: 'slide',
    SEARCH_CLICKED: 'search_clicked',
    ORDER_TYPE_VIEWED: 'order_type_viewed',
    ORDER_TYPE_SELECTED: 'order_type_selected',
    SETTING_CHANGED: 'setting_changed',
    TUTORIAL_STARTED: 'tutorial_started',
    TUTORIAL_COMPLETED: 'tutorial_completed',
    TUTORIAL_NAVIGATION: 'tutorial_navigation',
    CANDLE_PERIOD_VIEWED: 'candle_period_viewed',
    CANDLE_PERIOD_CHANGED: 'candle_period_changed',
    FAVORITE_TOGGLED: 'favorite_toggled',
  },
  ACTION_TYPE: {
    START_TRADING: 'start_trading',
    SKIP: 'skip',
    STOP_LOSS_SET: 'stop_loss_set',
    TAKE_PROFIT_SET: 'take_profit_set',
    ADL_LEARN_MORE: 'adl_learn_more',
    LEARN_MORE: 'learn_more',
    FAVORITE_MARKET: 'favorite_market',
    UNFAVORITE_MARKET: 'unfavorite_market',
  },
  NOTIFICATION_TYPE: {
    POSITION_LIQUIDATED: 'position_liquidated',
    TP_EXECUTED: 'tp_executed',
    SL_EXECUTED: 'sl_executed',
    LIMIT_ORDER_EXECUTED: 'limit_order_executed',
  },
  CLOSE_TYPE: {
    FULL: 'full',
    PARTIAL: 'partial',
  },
  NAVIGATION_METHOD: {
    SWIPE: 'swipe',
    CONTINUE_BUTTON: 'continue_button',
    PROGRESS_DOT: 'progress_dot',
  },
  STATUS: {
    VIEWED: 'viewed',
    STARTED: 'started',
    COMPLETED: 'completed',
    INITIATED: 'initiated',
    SUBMITTED: 'submitted',
    EXECUTED: 'executed',
    PARTIALLY_FILLED: 'partially_filled',
    FAILED: 'failed',
    SUCCESS: 'success',
  },
  SCREEN_TYPE: {
    MARKETS: 'markets',
    ASSET_DETAILS: 'asset_details',
    TRADING: 'trading',
    HOMESCREEN: 'homescreen',
    POSITION_CLOSE: 'position_close',
    LEVERAGE: 'leverage',
    TUTORIAL: 'tutorial',
    WITHDRAWAL: 'withdrawal',
    TP_SL: 'tp_sl',
    DEPOSIT_INPUT: 'deposit_input',
    DEPOSIT_REVIEW: 'deposit_review',
    CLOSE_ALL_POSITIONS: 'close_all_positions',
    CANCEL_ALL_ORDERS: 'cancel_all_orders',
    ORDER_BOOK: 'order_book',
    ERROR: 'error',
  },
  SETTING_TYPE: {
    LEVERAGE: 'leverage',
  },
  SCREEN_NAME: {
    CONNECTION_ERROR: 'connection_error',
    PERPS_HERO_CARD: 'perps_hero_card',
    PERPS_ACTIVITY_HISTORY: 'perps_activity_history',
  },
  ACTION: {
    CONNECTION_RETRY: 'connection_retry',
    SHARE: 'share',
  },
  PERPS_HISTORY_TABS: {
    TRADES: 'trades',
    ORDERS: 'orders',
    FUNDING: 'funding',
    DEPOSITS: 'deposits',
  },
  // A/B testing values
  AB_TEST: {
    // Test IDs
    BUTTON_COLOR_TEST: 'button_color_test',
    // Button color test variants
    CONTROL: 'control',
    MONOCHROME: 'monochrome',
  },
} as const;
