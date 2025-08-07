/**
 * Performance measurement names for Sentry monitoring
 * These constants ensure consistency across the Perps feature
 */
export enum PerpsMeasurementName {
  // Order Operation Metrics (milliseconds)
  ORDER_VALIDATION_MS = 'order_validation_ms',
  ORDER_SUBMISSION_MS = 'order_submission_ms',
  TOTAL_ORDER_TIME_MS = 'total_order_time_ms',

  // Position Metrics
  LEVERAGE_RATIO = 'leverage_ratio',
  POSITION_SIZE_USD = 'position_size_usd',
  LIMIT_PRICE_DISTANCE_BPS = 'limit_price_distance_bps',

  // Close Position Metrics (milliseconds)
  GET_POSITIONS_MS = 'get_positions_ms',
  TOTAL_CLOSE_POSITION_MS = 'total_close_position_ms',

  // Account State Metrics (milliseconds)
  ACCOUNT_STATE_API_MS = 'account_state_api_ms',
  TOTAL_ACCOUNT_STATE_MS = 'total_account_state_ms',

  // Market Data Metrics
  MARKETS_API_MS = 'markets_api_ms',
  TOTAL_MARKETS_MS = 'total_markets_ms',
  MARKETS_COUNT = 'markets_count',

  // WebSocket Metrics
  PRICE_UPDATE_PROCESS_MS = 'price_update_process_ms',
  WS_MESSAGES_PER_MINUTE = 'ws_messages_per_minute',
}
