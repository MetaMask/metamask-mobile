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

  // Performance metrics
  COMPLETION_DURATION: 'completion_duration',

  // Market details specific
  MARKET_DETAILS_VIEWED: 'market_details_viewed',

  // Position specific
  OPEN_POSITIONS_COUNT: 'open_positions_count',

  // Activity specific
  ACTIVITY_TYPE: 'activity_type',

  // Feed session specific
  PREDICT_FEED_TAB: 'predict_feed_tab',
  NUM_FEED_PAGES_VIEWED_IN_SESSION: 'num_feed_pages_viewed_in_session',
  SESSION_TIME_IN_FEED: 'session_time_in_feed',
  SESSION_ID: 'session_id',
  IS_SESSION_END: 'is_session_end',
} as const;

/**
 * Property value constants
 */
export const PredictEventValues = {
  ENTRY_POINT: {
    PREDICT_FEED: 'predict_feed',
    PREDICT_MARKET_DETAILS: 'predict_market_details',
    SEARCH: 'search',
    HOMEPAGE_POSITIONS: 'homepage_positions',
    HOMEPAGE_NEW_PREDICTION: 'homepage_new_prediction',
    HOMEPAGE_BALANCE: 'homepage_balance',
    MAIN_TRADE_BUTTON: 'main_trade_button',
    BACKGROUND: 'background',
  },
  TRANSACTION_TYPE: {
    MM_PREDICT_BUY: 'mm_predict_buy',
    MM_PREDICT_SELL: 'mm_predict_sell',
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
} as const;

/**
 * Event type constants for analytics tracking
 */
export const PredictEventType = {
  INITIATED: 'INITIATED',
  SUBMITTED: 'SUBMITTED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type PredictEventTypeValue =
  (typeof PredictEventType)[keyof typeof PredictEventType];
