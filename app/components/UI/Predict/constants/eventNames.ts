/**
 * Predict event property keys and values
 * Event names are defined in MetaMetrics.events.ts as the single source of truth
 */

/**
 * Event property keys - ensures consistent property naming
 */
export const PredictEventProperties = {
  // Common properties
  TIMESTAMP: 'timestamp',
  MARKET_ID: 'market_id',
  MARKET_TITLE: 'market_title',
  MARKET_CATEGORY: 'market_category',
  MARKET_TAGS: 'market_tags',
  ENTRY_POINT: 'entry_point',
  ACTION_TYPE: 'action_type',
  TRANSACTION_TYPE: 'transaction_type',
  LIQUIDITY: 'liquidity',
  VOLUME: 'volume',
  FAILURE_REASON: 'failure_reason',
  SURFACE: 'surface',
  VARIANT: 'variant',
  CTA_NAME: 'cta_name',
  CATEGORY_NAME: 'category_name',

  // Trade specific
  MARKET_TYPE: 'market_type',
  OUTCOME: 'outcome',
  ORDER_TYPE: 'order_type',

  // Sensitive properties
  AMOUNT_USD: 'amount_usd',
  SHARE_PRICE: 'share_price',
  PNL: 'pnl', // profit% or loss% - sell only
  ORDER_ID: 'order_id',
  USER_ADDRESS: 'user_address',

  // Trade status
  STATUS: 'status',

  // Performance metrics
  COMPLETION_DURATION: 'completion_duration',

  // Market details specific
  MARKET_DETAILS_VIEWED: 'market_details_viewed',

  // Position specific
  OPEN_POSITIONS_COUNT: 'open_positions_count',
  CLAIMABLE_POSITIONS_COUNT: 'claimable_positions_count',
  HAS_CLAIMABLE_WINNINGS: 'has_claimable_winnings',
  PORTFOLIO_MODULE_ENABLED: 'portfolio_module_enabled',

  // Activity specific
  ACTIVITY_TYPE: 'activity_type',

  // Geo-blocking specific
  COUNTRY: 'country',
  ATTEMPTED_ACTION: 'attempted_action',

  // Feed session specific
  PREDICT_FEED_TAB: 'predict_feed_tab',
  PREDICT_SCREEN: 'predict_screen',
  PREDICT_COMPONENT: 'predict_component',
  NUM_FEED_PAGES_VIEWED_IN_SESSION: 'num_feed_pages_viewed_in_session',
  SESSION_TIME_IN_FEED: 'session_time_in_feed',
  SESSION_ID: 'session_id',
  IS_SESSION_END: 'is_session_end',

  // Payment token (buy-with-any-token flow only)
  PAYMENT_TOKEN_ADDRESS: 'payment_token_address',
  PAYMENT_TOKEN_SYMBOL: 'payment_token_symbol',

  // Betslip dismissal
  DISMISSAL_METHOD: 'dismissal_method',
  HAD_ENTERED_AMOUNT: 'had_entered_amount',
  TIME_ON_SCREEN_MS: 'time_on_screen_ms',

  // A/B test attribution
  ACTIVE_AB_TESTS: 'active_ab_tests',

  // Market slug and game properties (for live sports markets)
  MARKET_SLUG: 'market_slug',
  GAME_ID: 'game_id',
  GAME_START_TIME: 'game_start_time',
  GAME_LEAGUE: 'game_league',
  GAME_STATUS: 'game_status',
  GAME_PERIOD: 'game_period',
  GAME_CLOCK: 'game_clock',

  // Banner properties
  BANNER_TYPE: 'banner_type',

  // Search engagement
  INTERACTION_TYPE: 'interaction_type',
  SEARCH_QUERY: 'search_query',
  RESULTS_COUNT: 'results_count',
} as const;

/**
 * Property value constants
 */
export const PredictEventValues = {
  ENTRY_POINT: {
    CAROUSEL: 'carousel',
    PREDICT_FEED: 'predict_feed',
    PREDICT_MARKET_DETAILS: 'predict_market_details',
    SEARCH: 'search',
    HOMEPAGE_POSITIONS: 'homepage_positions',
    HOMEPAGE_NEW_PREDICTION: 'homepage_new_prediction',
    HOMEPAGE_BALANCE: 'homepage_balance',
    HOMEPAGE_FEATURED_CAROUSEL: 'homepage_featured_carousel',
    HOMEPAGE_FEATURED_LIST: 'homepage_featured_list',
    MAIN_TRADE_BUTTON: 'main_trade_button',
    HOMESCREEN_PILL: 'homescreen_pill',
    REWARDS: 'rewards',
    GTM_MODAL: 'gtm_modal',
    BACKGROUND: 'background',
    TRENDING_SEARCH: 'trending_search',
    TRENDING: 'trending',
    BUY_PREVIEW: 'buy_preview',
    HOME_SECTION: 'home_section',
    EXPLORE: 'explore',
  },
  TRANSACTION_TYPE: {
    MM_PREDICT_BUY: 'mm_predict_buy',
    MM_PREDICT_SELL: 'mm_predict_sell',
    MM_PREDICT_DEPOSIT: 'mm_predict_deposit',
    MM_PREDICT_WITHDRAW: 'mm_predict_withdraw',
    MM_PREDICT_CLAIM: 'mm_predict_claim',
    MM_PREDICT_TRANSACTION_SUBMISSION: 'mm_predict_transaction_submission',
    MM_PREDICT_WALLET_CREATION: 'mm_predict_wallet_creation',
  },
  CLAIM_FAILURE_REASON: {
    PENDING_RESOLUTION: 'pending_resolution',
    INSUFFICIENT_GAS: 'insufficient_gas',
    NETWORK_ERROR: 'network_error',
    USER_REJECTED: 'user_rejected',
    UNKNOWN: 'unknown',
  },
  MARKET_TYPE: {
    BINARY: 'binary',
    MULTI_OUTCOME: 'multi-outcome',
  },
  MARKET_DETAILS_TAB: {
    ABOUT: 'about',
    POSITIONS: 'positions',
    OUTCOMES: 'outcomes',
  },
  ACTIVITY_TYPE: {
    ACTIVITY_LIST: 'activity_list',
    PREDICTED: 'predicted',
    CASHED_OUT: 'cashed_out',
    CLAIMED: 'claimed',
  },
  ATTEMPTED_ACTION: {
    DEPOSIT: 'deposit',
    PREDICT: 'predict_action',
    CASHOUT: 'cashout',
    CLAIM: 'claim',
    WITHDRAW: 'withdraw',
  },
  PREDICT_SCREEN: {
    WORLD_CUP: 'world_cup',
    PREDICT_POSITIONS_SCREEN: 'predict_positions_screen',
  },
  PREDICT_COMPONENT: {
    PREDICT_PORTFOLIO_MODULE: 'predict_portfolio_module',
  },
  PREDICT_FEED_TAB: {
    POSITIONS: 'positions',
    HISTORY: 'history',
  },
  ACTION_TYPE: {
    VIEWED: 'viewed',
    CLICKED: 'clicked',
  },
  BANNER_TYPE: {
    WORLD_CUP: 'world_cup',
    PREDICT_THE_PITCH: 'predict_the_pitch',
  },
  SEARCH_INTERACTION: {
    OPENED: 'opened',
    QUERIED: 'queried',
    RESULT_CLICKED: 'result_clicked',
  },
} as const;

/**
 * Trade transaction status values for analytics tracking
 * Used as the 'status' property in PREDICT_TRADE_TRANSACTION event
 */
export const PredictTradeStatus = {
  INITIATED: 'initiated',
  SUBMITTED: 'submitted',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  SWAP_INITIATED: 'swap_initiated',
  SWAP_SUCCESS: 'swap_success',
  SWAP_FAILED: 'swap_failed',
  RETRY_PROMPTED: 'retry_prompted',
  RETRY_SUBMITTED: 'retry_submitted',
} as const;

export type PredictTradeStatusValue =
  (typeof PredictTradeStatus)[keyof typeof PredictTradeStatus];

/**
 * Dismissal method values for the Predict Betslip Dismissed event
 */
export const PredictDismissalMethod = {
  BACK_BUTTON: 'back_button',
  SWIPE: 'swipe',
  HARDWARE_BACK: 'hardware_back',
} as const;

export type PredictDismissalMethodValue =
  (typeof PredictDismissalMethod)[keyof typeof PredictDismissalMethod];

// Legacy export for backward compatibility during transition
export const PredictEventType = PredictTradeStatus;
export type PredictEventTypeValue = PredictTradeStatusValue;

/**
 * Share action status values for analytics tracking
 * Used as the 'status' property in SHARE_ACTION event for Predict
 */
export const PredictShareStatus = {
  INITIATED: 'initiated',
  SUCCESS: 'success',
  FAILED: 'failed',
} as const;

export type PredictShareStatusValue =
  (typeof PredictShareStatus)[keyof typeof PredictShareStatus];

/**
 * GTM Modal constants for analytics tracking
 */
export const PREDICT_GTM_WHATS_NEW_MODAL = 'predict-gtm-whats-new-modal';
export const PREDICT_GTM_MODAL_ENGAGE = 'engage';
export const PREDICT_GTM_MODAL_DECLINE = 'decline';
