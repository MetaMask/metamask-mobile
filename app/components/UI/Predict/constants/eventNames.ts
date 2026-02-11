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
  TRANSACTION_TYPE: 'transaction_type',
  LIQUIDITY: 'liquidity',
  VOLUME: 'volume',
  FAILURE_REASON: 'failure_reason',

  // Trade specific
  MARKET_TYPE: 'market_type',
  OUTCOME: 'outcome',

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

  // Activity specific
  ACTIVITY_TYPE: 'activity_type',

  // Geo-blocking specific
  COUNTRY: 'country',
  ATTEMPTED_ACTION: 'attempted_action',

  // Feed session specific
  PREDICT_FEED_TAB: 'predict_feed_tab',
  NUM_FEED_PAGES_VIEWED_IN_SESSION: 'num_feed_pages_viewed_in_session',
  SESSION_TIME_IN_FEED: 'session_time_in_feed',
  SESSION_ID: 'session_id',
  IS_SESSION_END: 'is_session_end',

  // Market slug and game properties (for live sports markets)
  MARKET_SLUG: 'market_slug',
  GAME_ID: 'game_id',
  GAME_START_TIME: 'game_start_time',
  GAME_LEAGUE: 'game_league',
  GAME_STATUS: 'game_status',
  GAME_PERIOD: 'game_period',
  GAME_CLOCK: 'game_clock',
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
    REWARDS: 'rewards',
    GTM_MODAL: 'gtm_modal',
    BACKGROUND: 'background',
    TRENDING_SEARCH: 'trending_search',
    TRENDING: 'trending',
    BUY_PREVIEW: 'buy_preview',
  },
  TRANSACTION_TYPE: {
    MM_PREDICT_BUY: 'mm_predict_buy',
    MM_PREDICT_SELL: 'mm_predict_sell',
    MM_PREDICT_DEPOSIT: 'mm_predict_deposit',
    MM_PREDICT_WITHDRAW: 'mm_predict_withdraw',
    MM_PREDICT_CLAIM: 'mm_predict_claim',
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
} as const;

export type PredictTradeStatusValue =
  (typeof PredictTradeStatus)[keyof typeof PredictTradeStatus];

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
