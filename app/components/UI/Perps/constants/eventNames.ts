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
  LOCATION: 'location',

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
  LIQUIDATION_DISTANCE_OLD: 'liquidation_distance_old',
  LIQUIDATION_DISTANCE_NEW: 'liquidation_distance_new',

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

  // Entry point tracking properties
  BUTTON_CLICKED: 'button_clicked',
  BUTTON_LOCATION: 'button_location',

  // Balance properties
  HAS_PERP_BALANCE: 'has_perp_balance',

  // TP/SL differentiation properties
  HAS_TAKE_PROFIT: 'has_take_profit',
  HAS_STOP_LOSS: 'has_stop_loss',
  TAKE_PROFIT_PERCENTAGE: 'take_profit_percentage',
  STOP_LOSS_PERCENTAGE: 'stop_loss_percentage',
  // Watchlist/Favorites properties
  FAVORITES_COUNT: 'favorites_count',

  // Scroll tracking properties
  SECTION_VIEWED: 'section_viewed',
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
    PERPS_HOME: 'perps_home',
    PERPS_TUTORIAL: 'perps_tutorial',
    PERPS_HOME_EMPTY_STATE: 'perps_home_empty_state',
    PERPS_ASSET_SCREEN_NO_FUNDS: 'perps_asset_screen_no_funds',
    TRADE_MENU_ACTION: 'trade_menu_action',
    WALLET_HOME: 'wallet_home',
    TOOLTIP: 'tooltip',
    MAGNIFYING_GLASS: 'magnifying_glass',
    CRYPTO_BUTTON: 'crypto_button',
    STOCKS_BUTTON: 'stocks_button',
    CLOSE_TOAST: 'close_toast',
    // Perps home section sources (for navigation tracking)
    PERPS_HOME_POSITION: 'perps_home_position',
    PERPS_HOME_ORDERS: 'perps_home_orders',
    PERPS_HOME_WATCHLIST: 'perps_home_watchlist',
    PERPS_HOME_EXPLORE_CRYPTO: 'perps_home_explore_crypto',
    PERPS_HOME_EXPLORE_STOCKS: 'perps_home_explore_stocks',
    PERPS_HOME_ACTIVITY: 'perps_home_activity',
    // Market list tab sources
    PERPS_MARKET_LIST_ALL: 'perps_market_list_all',
    PERPS_MARKET_LIST_CRYPTO: 'perps_market_list_crypto',
    PERPS_MARKET_LIST_STOCKS: 'perps_market_list_stocks',
    // Other navigation sources
    PERPS_TAB: 'perps_tab',
    WALLET_MAIN_ACTION_MENU: 'wallet_main_action_menu',
    PUSH_NOTIFICATION: 'push_notification',
    ORDER_BOOK: 'order_book',
    FULL_SCREEN_CHART: 'full_screen_chart',
    STOP_LOSS_PROMPT_BANNER: 'stop_loss_prompt_banner',
    // Position management sources
    OPEN_POSITION: 'open_position',
    POSITION_CLOSE_TOAST: 'position_close_toast',
    TRADE_DETAILS: 'trade_details',
    // Geo-block trigger sources (for tracking what action was blocked)
    DEPOSIT_BUTTON: 'deposit_button',
    WITHDRAW_BUTTON: 'withdraw_button',
    TRADE_ACTION: 'trade_action',
    ADD_FUNDS_ACTION: 'add_funds_action',
    CANCEL_ORDER: 'cancel_order',
    ASSET_DETAIL_SCREEN: 'asset_detail_screen',
    // TAT-2449: Geo-block sources for close/modify actions
    CLOSE_POSITION_ACTION: 'close_position_action',
    MODIFY_POSITION_ACTION: 'modify_position_action',
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
    WARNING: 'warning',
  },
  // Standardized error message keys for PERP_ERROR events
  // These should be used instead of localized strings for consistent analytics
  ERROR_MESSAGE_KEY: {
    ORDER_CHANGED_FROM_LIMIT_TO_MARKET: 'order_changed_from_limit_to_market',
    OPEN_CROSS_MARGIN_POSITION_DETECTED: 'open_cross_margin_position_detected',
    INSUFFICIENT_BALANCE: 'insufficient_balance',
    ORDER_FAILED: 'order_failed',
    GEO_RESTRICTION: 'geo_restriction',
    MINIMUM_ORDER_SIZE: 'minimum_order_size',
    MAXIMUM_LEVERAGE_EXCEEDED: 'maximum_leverage_exceeded',
    PRICE_DEVIATION_TOO_HIGH: 'price_deviation_too_high',
    MARKET_AT_CAPACITY: 'market_at_capacity',
    NETWORK_ERROR: 'network_error',
    CONNECTION_FAILED: 'connection_failed',
    POSITION_UPDATE_FAILED: 'position_update_failed',
    TP_SL_UPDATE_FAILED: 'tp_sl_update_failed',
    MARGIN_UPDATE_FAILED: 'margin_update_failed',
  },
  INTERACTION_TYPE: {
    TAP: 'tap',
    ZOOM: 'zoom',
    SLIDE: 'slide',
    SEARCH_CLICKED: 'search_clicked',
    ORDER_TYPE_VIEWED: 'order_type_viewed',
    ORDER_TYPE_SELECTED: 'order_type_selected',
    /** @deprecated Use LEVERAGE_CHANGED instead for clarity */
    SETTING_CHANGED: 'setting_changed',
    LEVERAGE_CHANGED: 'leverage_changed',
    TUTORIAL_STARTED: 'tutorial_started',
    TUTORIAL_COMPLETED: 'tutorial_completed',
    TUTORIAL_NAVIGATION: 'tutorial_navigation',
    CANDLE_PERIOD_VIEWED: 'candle_period_viewed',
    CANDLE_PERIOD_CHANGED: 'candle_period_changed',
    FAVORITE_TOGGLED: 'favorite_toggled',
    BUTTON_CLICKED: 'button_clicked',
    // Position management interactions
    CONTACT_SUPPORT: 'contact_support',
    STOP_LOSS_ONE_CLICK_PROMPT: 'stop_loss_one_click_prompt',
    ADD_MARGIN: 'add_margin',
    REMOVE_MARGIN: 'remove_margin',
    INCREASE_EXPOSURE: 'increase_exposure',
    REDUCE_EXPOSURE: 'reduce_exposure',
    FLIP_POSITION: 'flip_position',
    // Hero card interactions
    DISPLAY_HERO_CARD: 'display_hero_card',
    SHARE_PNL_HERO_CARD: 'share_pnl_hero_card',
    // Chart interactions
    FULL_SCREEN_CHART: 'full_screen_chart',
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
    MARKET_LIST: 'market_list',
    ASSET_DETAILS: 'asset_details',
    TRADING: 'trading',
    /** @deprecated Use PERPS_HOME or WALLET_HOME_PERPS_TAB instead */
    HOMESCREEN: 'homescreen',
    PERPS_HOME: 'perps_home',
    WALLET_HOME_PERPS_TAB: 'wallet_home_perps_tab',
    POSITION_CLOSE: 'position_close',
    LEVERAGE: 'leverage',
    TUTORIAL: 'tutorial',
    WITHDRAWAL: 'withdrawal',
    TP_SL: 'tp_sl',
    CREATE_TPSL: 'create_tpsl',
    EDIT_TPSL: 'edit_tpsl',
    DEPOSIT_INPUT: 'deposit_input',
    DEPOSIT_REVIEW: 'deposit_review',
    CLOSE_ALL_POSITIONS: 'close_all_positions',
    CANCEL_ALL_ORDERS: 'cancel_all_orders',
    PNL_HERO_CARD: 'pnl_hero_card',
    ORDER_BOOK: 'order_book',
    ERROR: 'error',
    // Market list tab screen types
    MARKET_LIST_ALL: 'market_list_all',
    MARKET_LIST_CRYPTO: 'market_list_crypto',
    MARKET_LIST_STOCKS: 'market_list_stocks',
    // Additional screens
    FULL_SCREEN_CHART: 'full_screen_chart',
    ACTIVITY: 'activity',
    INCREASE_EXPOSURE: 'increase_exposure',
    ADD_MARGIN: 'add_margin',
    REMOVE_MARGIN: 'remove_margin',
    GEO_BLOCK_NOTIF: 'geo_block_notif',
  },
  SETTING_TYPE: {
    LEVERAGE: 'leverage',
  },
  SCREEN_NAME: {
    CONNECTION_ERROR: 'connection_error',
    PERPS_HERO_CARD: 'perps_hero_card',
    PERPS_ACTIVITY_HISTORY: 'perps_activity_history',
    PERPS_HOME: 'perps_home',
    PERPS_MARKET_DETAILS: 'perps_market_details',
    PERPS_ORDER: 'perps_order',
  },
  ACTION: {
    CONNECTION_RETRY: 'connection_retry',
    SHARE: 'share',
    // Risk management actions
    ADD_MARGIN: 'add_margin',
    REMOVE_MARGIN: 'remove_margin',
    EDIT_TP_SL: 'edit_tp_sl',
    CREATE_TP_SL: 'create_tp_sl',
    // Trade transaction actions - differentiates new position from adding to existing
    CREATE_POSITION: 'create_position',
    INCREASE_EXPOSURE: 'increase_exposure',
  },
  // Risk management sources
  RISK_MANAGEMENT_SOURCE: {
    TRADE_SCREEN: 'trade_screen',
    POSITION_SCREEN: 'position_screen',
    STOP_LOSS_PROMPT_BANNER: 'stop_loss_prompt_banner',
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
  BUTTON_CLICKED: {
    DEPOSIT: 'deposit',
    WITHDRAW: 'withdraw',
    PERPS_HOME: 'perps_home',
    TUTORIAL: 'tutorial',
    TOOLTIP: 'tooltip',
    MARKET_LIST: 'market_list',
    OPEN_POSITION: 'open_position',
    MAGNIFYING_GLASS: 'magnifying_glass',
    CRYPTO: 'crypto',
    STOCKS: 'stocks',
    GIVE_FEEDBACK: 'give_feedback',
  },
  BUTTON_LOCATION: {
    PERPS_HOME: 'perps_home',
    PERPS_TUTORIAL: 'perps_tutorial',
    PERPS_HOME_EMPTY_STATE: 'perps_home_empty_state',
    PERPS_ASSET_SCREEN: 'perps_asset_screen',
    PERPS_TAB: 'perps_tab',
    TRADE_MENU_ACTION: 'trade_menu_action',
    WALLET_HOME: 'wallet_home',
    MARKET_LIST: 'market_list',
    SCREEN: 'screen',
    TOOLTIP: 'tooltip',
    PERP_MARKET_DETAILS: 'perp_market_details',
    ORDER_BOOK: 'order_book',
    FULL_SCREEN_CHART: 'full_screen_chart',
  },
} as const;
