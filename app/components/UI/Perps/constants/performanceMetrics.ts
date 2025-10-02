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

  // Rewards API Metrics (milliseconds)
  REWARDS_FEE_DISCOUNT_API_CALL = 'rewards_fee_discount_api_call',
  REWARDS_POINTS_ESTIMATION_API_CALL = 'rewards_points_estimation_api_call',
  REWARDS_ORDER_EXECUTION_FEE_DISCOUNT_API_CALL = 'rewards_order_execution_fee_discount_api_call',

  // WebSocket Performance Metrics (milliseconds)
  WEBSOCKET_CONNECTION_ESTABLISHMENT = 'websocket_connection_establishment',
  WEBSOCKET_CONNECTION_WITH_PRELOAD = 'websocket_connection_with_preload',
  WEBSOCKET_FIRST_POSITION_DATA = 'websocket_first_position_data',
  WEBSOCKET_ACCOUNT_SWITCH_RECONNECTION = 'websocket_account_switch_reconnection',

  // Transaction Operation Metrics (milliseconds)
  ORDER_EDIT_OPERATION = 'order_edit_operation',
  ORDER_CANCEL_OPERATION = 'order_cancel_operation',
  POSITION_TPSL_UPDATE_OPERATION = 'position_tpsl_update_operation',
}
