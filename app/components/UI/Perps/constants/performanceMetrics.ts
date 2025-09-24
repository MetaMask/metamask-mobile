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
  ASSET_SCREEN_LOADED = 'asset_screen_loaded',
  TRADE_SCREEN_LOADED = 'trade_screen_loaded',
  TP_SL_BOTTOM_SHEET_LOADED = 'tp_sl_bottom_sheet_loaded',
  LEVERAGE_BOTTOM_SHEET_LOADED = 'leverage_bottom_sheet_loaded',
  UPDATE_DEPENDENT_METRICS_ON_INPUT = 'update_dependent_metrics_on_input',
  QUOTE_RECEIVED = 'quote_received',
  ORDER_SUBMISSION_TOAST_LOADED = 'order_submission_toast_loaded',
  ORDER_CONFIRMATION_TOAST_LOADED = 'order_confirmation_toast_loaded',
  ASSET_BALANCES_DISPLAYED_UPDATED = 'asset_balances_displayed_updated',

  // Screen Load Metrics - Position Close (milliseconds)
  CLOSE_SCREEN_LOADED = 'close_screen_loaded',
  CLOSE_ORDER_SUBMISSION_TOAST_LOADED = 'close_order_submission_toast_loaded',
  CLOSE_ORDER_CONFIRMATION_TOAST_LOADED = 'close_order_confirmation_toast_loaded',

  // Screen Load Metrics - History (milliseconds)
  TRANSACTION_HISTORY_SCREEN_LOADED = 'transaction_history_screen_loaded',

  // Screen Load Metrics - Tab Performance (milliseconds)
  PERPS_TAB_LOADED = 'perps_tab_loaded',

  // Data Lake API Metrics (milliseconds)
  DATA_LAKE_API_CALL = 'data_lake_api_call',
  DATA_LAKE_API_RETRY = 'data_lake_api_retry',

  // WebSocket Performance Metrics (milliseconds)
  WEBSOCKET_CONNECTION_ESTABLISHMENT = 'websocket_connection_establishment',
  WEBSOCKET_FIRST_POSITION_DATA = 'websocket_first_position_data',
  WEBSOCKET_ACCOUNT_SWITCH_RECONNECTION = 'websocket_account_switch_reconnection',
}

/**
 * Performance targets (p75) from dashboard requirements
 */
export const PerpsPerformanceTargets: Record<string, number> = {
  // Screen load targets from dashboard
  [PerpsMeasurementName.FUNDING_SCREEN_INPUT_LOADED]: 200,
  [PerpsMeasurementName.FUNDING_SCREEN_REVIEW_LOADED]: 200,
  [PerpsMeasurementName.FUNDING_SOURCE_TOKEN_LIST_LOADED]: 1000,
  [PerpsMeasurementName.TRANSACTION_SUBMISSION_SCREEN_LOADED]: 1000,
  [PerpsMeasurementName.TRANSACTION_EXECUTION_CONFIRMATION_SCREEN_LOADED]: 15000,
  [PerpsMeasurementName.WITHDRAWAL_SCREEN_LOADED]: 200,
  [PerpsMeasurementName.WITHDRAWAL_TRANSACTION_SUBMISSION_LOADED]: 1000,
  [PerpsMeasurementName.WITHDRAWAL_TRANSACTION_CONFIRMATION_LOADED]: 15000,
  [PerpsMeasurementName.MARKETS_SCREEN_LOADED]: 200,
  [PerpsMeasurementName.ASSET_SCREEN_LOADED]: 200,
  [PerpsMeasurementName.TRADE_SCREEN_LOADED]: 200,
  [PerpsMeasurementName.TP_SL_BOTTOM_SHEET_LOADED]: 50,
  [PerpsMeasurementName.LEVERAGE_BOTTOM_SHEET_LOADED]: 50,
  [PerpsMeasurementName.UPDATE_DEPENDENT_METRICS_ON_INPUT]: 50,
  [PerpsMeasurementName.QUOTE_RECEIVED]: 2000,
  [PerpsMeasurementName.ORDER_SUBMISSION_TOAST_LOADED]: 200,
  [PerpsMeasurementName.ORDER_CONFIRMATION_TOAST_LOADED]: 1000,
  [PerpsMeasurementName.ASSET_BALANCES_DISPLAYED_UPDATED]: 200,
  [PerpsMeasurementName.CLOSE_SCREEN_LOADED]: 200,
  [PerpsMeasurementName.CLOSE_ORDER_SUBMISSION_TOAST_LOADED]: 200,
  [PerpsMeasurementName.CLOSE_ORDER_CONFIRMATION_TOAST_LOADED]: 200,
  [PerpsMeasurementName.TRANSACTION_HISTORY_SCREEN_LOADED]: 1000,
  [PerpsMeasurementName.PERPS_TAB_LOADED]: 200,

  // Data Lake API targets
  [PerpsMeasurementName.DATA_LAKE_API_CALL]: 2000, // 2 seconds target
  [PerpsMeasurementName.DATA_LAKE_API_RETRY]: 5000, // 5 seconds for all retries

  // WebSocket Performance targets
  [PerpsMeasurementName.WEBSOCKET_CONNECTION_ESTABLISHMENT]: 2000, // 2 seconds target
  [PerpsMeasurementName.WEBSOCKET_FIRST_POSITION_DATA]: 1000, // 1 second target
  [PerpsMeasurementName.WEBSOCKET_ACCOUNT_SWITCH_RECONNECTION]: 3000, // 3 seconds target
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
  [PerpsMeasurementName.UPDATE_DEPENDENT_METRICS_ON_INPUT]:
    PerpsPerformancePriority.HIGH,
  [PerpsMeasurementName.QUOTE_RECEIVED]: PerpsPerformancePriority.HIGH,
  [PerpsMeasurementName.ORDER_CONFIRMATION_TOAST_LOADED]:
    PerpsPerformancePriority.HIGH,
  // All others are MEDIUM by default
};
