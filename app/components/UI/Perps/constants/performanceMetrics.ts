/**
 * Performance measurement names for Sentry monitoring
 * These constants ensure consistency across the Perps feature
 */
export enum PerpsMeasurementName {
  // ===== DASHBOARD REQUIRED METRICS (From Sentry Dashboard) =====
  // Screen Load Metrics - Funding (milliseconds)
  FUNDING_SCREEN_INPUT_LOADED = 'funding_screen_input_loaded',
  FUNDING_SCREEN_REVIEW_LOADED = 'funding_screen_review_loaded',
  FUNDING_SOURCE_TOKEN_LIST_LOADED = 'funding_source_token_list_loaded',
  TRANSACTION_SUBMISSION_SCREEN_LOADED = 'transaction_submission_screen_loaded',
  TRANSACTION_EXECUTION_CONFIRMATION_SCREEN_LOADED = 'transaction_execution_confirmation_screen_loaded',

  // Screen Load Metrics - Withdrawal (milliseconds)
  WITHDRAWAL_SCREEN_LOADED = 'withdrawal_screen_loaded',
  WITHDRAWAL_TRANSACTION_SUBMISSION_LOADED = 'withdrawal_transaction_submission_loaded',
  WITHDRAWAL_TRANSACTION_CONFIRMATION_LOADED = 'withdrawal_transaction_confirmation_loaded',

  // Screen Load Metrics - Trading (milliseconds)
  MARKETS_SCREEN_LOADED = 'markets_screen_loaded',
  MARKETS_DATA_LOADED = 'markets_data_loaded',
  ASSET_SCREEN_LOADED = 'asset_screen_loaded',
  TRADE_SCREEN_LOADED = 'trade_screen_loaded',
  TP_SL_BOTTOM_SHEET_LOADED = 'tp_sl_bottom_sheet_loaded',
  LEVERAGE_BOTTOM_SHEET_LOADED = 'leverage_bottom_sheet_loaded',
  UPDATE_DEPENDENT_METRICS = 'update_dependent_metrics',
  ORDER_SUBMISSION_TOAST_LOADED = 'order_submission_toast_loaded',
  ORDER_CONFIRMATION_TOAST_LOADED = 'order_confirmation_toast_loaded',
  ASSET_BALANCES_DISPLAYED_UPDATED = 'asset_balances_displayed_updated',

  // Screen Load Metrics - Position Close (milliseconds)
  POSITION_DATA_LOADED_PERP_TAB = 'position_data_loaded_perp_tab',
  POSITION_DATA_LOADED_PERP_ASSET_SCREEN = 'position_data_loaded_perp_asset_screen',
  CLOSE_SCREEN_LOADED = 'close_screen_loaded',
  CLOSE_ORDER_SUBMISSION_TOAST_LOADED = 'close_order_submission_toast_loaded',
  CLOSE_ORDER_CONFIRMATION_TOAST_LOADED = 'close_order_confirmation_toast_loaded',

  // Screen Load Metrics - History (milliseconds)
  TRANSACTION_HISTORY_SCREEN_LOADED = 'transaction_history_screen_loaded',

  // ===== INTERNAL METRICS (Not in dashboard but useful for debugging) =====
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

/**
 * Performance targets (p75) from dashboard requirements
 */
export const PerpsPerformanceTargets: Record<string, number> = {
  // Existing metrics targets
  [PerpsMeasurementName.ORDER_VALIDATION_MS]: 100,
  [PerpsMeasurementName.ORDER_SUBMISSION_MS]: 1000,
  [PerpsMeasurementName.TOTAL_ORDER_TIME_MS]: 2000,
  // New screen load targets from dashboard
  [PerpsMeasurementName.FUNDING_SCREEN_INPUT_LOADED]: 200,
  [PerpsMeasurementName.FUNDING_SCREEN_REVIEW_LOADED]: 200,
  [PerpsMeasurementName.FUNDING_SOURCE_TOKEN_LIST_LOADED]: 1000,
  [PerpsMeasurementName.TRANSACTION_SUBMISSION_SCREEN_LOADED]: 1000,
  [PerpsMeasurementName.TRANSACTION_EXECUTION_CONFIRMATION_SCREEN_LOADED]: 15000,
  [PerpsMeasurementName.WITHDRAWAL_SCREEN_LOADED]: 200,
  [PerpsMeasurementName.WITHDRAWAL_TRANSACTION_SUBMISSION_LOADED]: 1000,
  [PerpsMeasurementName.WITHDRAWAL_TRANSACTION_CONFIRMATION_LOADED]: 15000,
  [PerpsMeasurementName.MARKETS_SCREEN_LOADED]: 200,
  [PerpsMeasurementName.MARKETS_DATA_LOADED]: 1000,
  [PerpsMeasurementName.ASSET_SCREEN_LOADED]: 200,
  [PerpsMeasurementName.TRADE_SCREEN_LOADED]: 200,
  [PerpsMeasurementName.TP_SL_BOTTOM_SHEET_LOADED]: 50,
  [PerpsMeasurementName.LEVERAGE_BOTTOM_SHEET_LOADED]: 50,
  [PerpsMeasurementName.UPDATE_DEPENDENT_METRICS]: 50,
  [PerpsMeasurementName.ORDER_SUBMISSION_TOAST_LOADED]: 200,
  [PerpsMeasurementName.ORDER_CONFIRMATION_TOAST_LOADED]: 1000,
  [PerpsMeasurementName.ASSET_BALANCES_DISPLAYED_UPDATED]: 200,
  [PerpsMeasurementName.POSITION_DATA_LOADED_PERP_TAB]: 200,
  [PerpsMeasurementName.POSITION_DATA_LOADED_PERP_ASSET_SCREEN]: 200,
  [PerpsMeasurementName.CLOSE_SCREEN_LOADED]: 200,
  [PerpsMeasurementName.CLOSE_ORDER_SUBMISSION_TOAST_LOADED]: 200,
  [PerpsMeasurementName.CLOSE_ORDER_CONFIRMATION_TOAST_LOADED]: 200,
  [PerpsMeasurementName.TRANSACTION_HISTORY_SCREEN_LOADED]: 1000,
};

/**
 * Performance priority levels from dashboard
 */
export enum PerpsPerformancePriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Performance metric priorities
 */
export const PerpsMetricPriorities: Record<string, PerpsPerformancePriority> = {
  [PerpsMeasurementName.MARKETS_SCREEN_LOADED]: PerpsPerformancePriority.HIGH,
  [PerpsMeasurementName.ASSET_SCREEN_LOADED]: PerpsPerformancePriority.HIGH,
  [PerpsMeasurementName.TRADE_SCREEN_LOADED]: PerpsPerformancePriority.HIGH,
  [PerpsMeasurementName.UPDATE_DEPENDENT_METRICS]:
    PerpsPerformancePriority.HIGH,
  [PerpsMeasurementName.ORDER_CONFIRMATION_TOAST_LOADED]:
    PerpsPerformancePriority.HIGH,
  // All others are MEDIUM by default
};
