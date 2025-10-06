/**
 * Performance measurement names for Sentry monitoring
 * These constants ensure consistency across the Perps feature
 * Used for direct setMeasurement() calls in controllers and services
 */
export enum PerpsMeasurementName {
  // ===== ACTIVE SENTRY METRICS =====
  // Screen Load Metrics - Withdrawal (milliseconds)
  PERPS_WITHDRAWAL_SCREEN_LOADED = 'perps_withdrawal_screen_loaded',

  // Screen Load Metrics - Trading (milliseconds)
  PERPS_MARKETS_SCREEN_LOADED = 'perps_markets_screen_loaded',
  PERPS_ASSET_SCREEN_LOADED = 'perps_asset_screen_loaded',
  PERPS_TRADE_SCREEN_LOADED = 'perps_trade_screen_loaded',
  PERPS_LEVERAGE_BOTTOM_SHEET_LOADED = 'perps_leverage_bottom_sheet_loaded',
  PERPS_ORDER_SUBMISSION_TOAST_LOADED = 'perps_order_submission_toast_loaded',
  PERPS_ORDER_CONFIRMATION_TOAST_LOADED = 'perps_order_confirmation_toast_loaded',

  // Screen Load Metrics - Position Close (milliseconds)
  PERPS_CLOSE_SCREEN_LOADED = 'perps_close_screen_loaded',
  PERPS_CLOSE_ORDER_SUBMISSION_TOAST_LOADED = 'perps_close_order_submission_toast_loaded',
  PERPS_CLOSE_ORDER_CONFIRMATION_TOAST_LOADED = 'perps_close_order_confirmation_toast_loaded',

  // Screen Load Metrics - History (milliseconds)
  PERPS_TRANSACTION_HISTORY_SCREEN_LOADED = 'perps_transaction_history_screen_loaded',

  // Screen Load Metrics - Tab Performance (milliseconds)
  PERPS_TAB_LOADED = 'perps_tab_loaded',

  // Data Lake API Metrics (milliseconds)
  PERPS_DATA_LAKE_API_CALL = 'perps_data_lake_api_call',

  // Rewards API Metrics (milliseconds)
  PERPS_REWARDS_FEE_DISCOUNT_API_CALL = 'perps_rewards_fee_discount_api_call',
  PERPS_REWARDS_POINTS_ESTIMATION_API_CALL = 'perps_rewards_points_estimation_api_call',
  PERPS_REWARDS_ORDER_EXECUTION_FEE_DISCOUNT_API_CALL = 'perps_rewards_order_execution_fee_discount_api_call',

  // WebSocket Performance Metrics (milliseconds)
  PERPS_WEBSOCKET_CONNECTION_ESTABLISHMENT = 'perps_websocket_connection_establishment',
  PERPS_WEBSOCKET_CONNECTION_WITH_PRELOAD = 'perps_websocket_connection_with_preload',
  PERPS_WEBSOCKET_FIRST_POSITION_DATA = 'perps_websocket_first_position_data',
  PERPS_WEBSOCKET_ACCOUNT_SWITCH_RECONNECTION = 'perps_websocket_account_switch_reconnection',

  // Data Fetch Operation Metrics (milliseconds)
  PERPS_GET_POSITIONS_OPERATION = 'perps_get_positions_operation',
  PERPS_GET_ACCOUNT_STATE_OPERATION = 'perps_get_account_state_operation',
  PERPS_GET_MARKETS_OPERATION = 'perps_get_markets_operation',
  PERPS_GET_ORDER_FILLS_OPERATION = 'perps_get_order_fills_operation',
  PERPS_GET_ORDERS_OPERATION = 'perps_get_orders_operation',
  PERPS_GET_OPEN_ORDERS_OPERATION = 'perps_get_open_orders_operation',
  PERPS_GET_FUNDING_OPERATION = 'perps_get_funding_operation',
  PERPS_GET_HISTORICAL_PORTFOLIO_OPERATION = 'perps_get_historical_portfolio_operation',

  // Connection Sub-Stage Metrics (milliseconds)
  PERPS_PROVIDER_INIT = 'perps_provider_init',
  PERPS_ACCOUNT_STATE_FETCH = 'perps_account_state_fetch',
  PERPS_SUBSCRIPTIONS_PRELOAD = 'perps_subscriptions_preload',

  // Reconnection Sub-Stage Metrics (milliseconds)
  PERPS_RECONNECTION_CLEANUP = 'perps_reconnection_cleanup',
  PERPS_CONTROLLER_REINIT = 'perps_controller_reinit',
  PERPS_NEW_ACCOUNT_FETCH = 'perps_new_account_fetch',
  PERPS_RECONNECTION_PRELOAD = 'perps_reconnection_preload',
}
