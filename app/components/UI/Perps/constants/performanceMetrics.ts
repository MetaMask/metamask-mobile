/**
 * Performance measurement names for Sentry monitoring
 * These constants ensure consistency across the Perps feature
 * Used for direct setMeasurement() calls in controllers and services
 */
export enum PerpsMeasurementName {
  // ===== ACTIVE SENTRY METRICS =====
  // Screen Load Metrics - Withdrawal (milliseconds)
  PERPS_WITHDRAWAL_SCREEN_LOADED = 'withdrawal_screen_loaded',

  // Screen Load Metrics - Trading (milliseconds)
  PERPS_MARKETS_SCREEN_LOADED = 'markets_screen_loaded',
  PERPS_ASSET_SCREEN_LOADED = 'asset_screen_loaded',
  PERPS_TRADE_SCREEN_LOADED = 'trade_screen_loaded',
  PERPS_LEVERAGE_BOTTOM_SHEET_LOADED = 'leverage_bottom_sheet_loaded',
  PERPS_ORDER_SUBMISSION_TOAST_LOADED = 'order_submission_toast_loaded',
  PERPS_ORDER_CONFIRMATION_TOAST_LOADED = 'order_confirmation_toast_loaded',

  // Screen Load Metrics - Position Close (milliseconds)
  PERPS_CLOSE_SCREEN_LOADED = 'close_screen_loaded',
  PERPS_CLOSE_ORDER_SUBMISSION_TOAST_LOADED = 'close_order_submission_toast_loaded',
  PERPS_CLOSE_ORDER_CONFIRMATION_TOAST_LOADED = 'close_order_confirmation_toast_loaded',

  // Screen Load Metrics - History (milliseconds)
  PERPS_TRANSACTION_HISTORY_SCREEN_LOADED = 'transaction_history_screen_loaded',

  // Screen Load Metrics - Tab Performance (milliseconds)
  PERPS_TAB_LOADED = 'perps_tab_loaded',

  // Data Lake API Metrics (milliseconds)
  PERPS_DATA_LAKE_API_CALL = 'data_lake_api_call',

  // Rewards API Metrics (milliseconds)
  PERPS_REWARDS_FEE_DISCOUNT_API_CALL = 'rewards_fee_discount_api_call',
  PERPS_REWARDS_POINTS_ESTIMATION_API_CALL = 'rewards_points_estimation_api_call',
  PERPS_REWARDS_ORDER_EXECUTION_FEE_DISCOUNT_API_CALL = 'rewards_order_execution_fee_discount_api_call',

  // WebSocket Performance Metrics (milliseconds)
  PERPS_WEBSOCKET_CONNECTION_ESTABLISHMENT = 'websocket_connection_establishment',
  PERPS_WEBSOCKET_CONNECTION_WITH_PRELOAD = 'websocket_connection_with_preload',
  PERPS_WEBSOCKET_FIRST_POSITION_DATA = 'websocket_first_position_data',
  PERPS_WEBSOCKET_ACCOUNT_SWITCH_RECONNECTION = 'websocket_account_switch_reconnection',

  // Data Fetch Operation Metrics (milliseconds)
  PERPS_GET_POSITIONS_OPERATION = 'get_positions_operation',
  PERPS_GET_ACCOUNT_STATE_OPERATION = 'get_account_state_operation',
  PERPS_GET_MARKETS_OPERATION = 'get_markets_operation',
  PERPS_GET_ORDER_FILLS_OPERATION = 'get_order_fills_operation',
  PERPS_GET_ORDERS_OPERATION = 'get_orders_operation',
  PERPS_GET_OPEN_ORDERS_OPERATION = 'get_open_orders_operation',
  PERPS_GET_FUNDING_OPERATION = 'get_funding_operation',
  PERPS_GET_HISTORICAL_PORTFOLIO_OPERATION = 'get_historical_portfolio_operation',
}
