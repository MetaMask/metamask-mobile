/**
 * Performance measurement names for Sentry monitoring
 * These constants ensure consistency across the Perps feature
 * Used for direct setMeasurement() calls in controllers and services
 *
 * Naming Convention: perps.{category}.{metric_name}
 * - Uses dot notation for hierarchical grouping in Sentry
 * - Categories: websocket, connection, api, operation, screen, ui
 * - Enables easy filtering (e.g., perps.websocket.*) and dashboard aggregation
 */
export enum PerpsMeasurementName {
  // ===== ACTIVE SENTRY METRICS =====

  // WebSocket Performance Metrics (milliseconds)
  // Tracks WebSocket connection lifecycle and data flow
  PERPS_WEBSOCKET_CONNECTION_ESTABLISHMENT = 'perps.websocket.connection_establishment',
  PERPS_WEBSOCKET_CONNECTION_WITH_PRELOAD = 'perps.websocket.connection_with_preload',
  PERPS_WEBSOCKET_FIRST_POSITION_DATA = 'perps.websocket.first_position_data',
  PERPS_WEBSOCKET_ACCOUNT_SWITCH_RECONNECTION = 'perps.websocket.account_switch_reconnection',
  PERPS_CONNECTION_HEALTH_CHECK = 'perps.websocket.health_check',
  PERPS_RECONNECTION_HEALTH_CHECK = 'perps.websocket.reconnection_health_check',

  // Connection Lifecycle Metrics (milliseconds)
  // Tracks connection initialization and reconnection sub-stages
  PERPS_PROVIDER_INIT = 'perps.connection.provider_init',
  PERPS_ACCOUNT_STATE_FETCH = 'perps.connection.account_state_fetch',
  PERPS_SUBSCRIPTIONS_PRELOAD = 'perps.connection.subscriptions_preload',
  PERPS_RECONNECTION_CLEANUP = 'perps.connection.cleanup',
  PERPS_CONTROLLER_REINIT = 'perps.connection.controller_reinit',
  PERPS_NEW_ACCOUNT_FETCH = 'perps.connection.new_account_fetch',
  PERPS_RECONNECTION_PRELOAD = 'perps.connection.reconnection_preload',

  // API Call Metrics (milliseconds)
  // Tracks external API performance
  PERPS_DATA_LAKE_API_CALL = 'perps.api.data_lake_call',
  PERPS_REWARDS_FEE_DISCOUNT_API_CALL = 'perps.api.rewards_fee_discount',
  PERPS_REWARDS_POINTS_ESTIMATION_API_CALL = 'perps.api.rewards_points_estimation',
  PERPS_REWARDS_ORDER_EXECUTION_FEE_DISCOUNT_API_CALL = 'perps.api.rewards_order_execution_fee_discount',

  // Data Operation Metrics (milliseconds)
  // Tracks data fetch operations
  PERPS_GET_POSITIONS_OPERATION = 'perps.operation.get_positions',
  PERPS_GET_OPEN_ORDERS_OPERATION = 'perps.operation.get_open_orders',

  // Screen Load Metrics (milliseconds)
  // Tracks full screen render performance
  PERPS_WITHDRAWAL_SCREEN_LOADED = 'perps.screen.withdrawal_loaded',
  PERPS_MARKETS_SCREEN_LOADED = 'perps.screen.markets_loaded',
  PERPS_ASSET_SCREEN_LOADED = 'perps.screen.asset_loaded',
  PERPS_TRADE_SCREEN_LOADED = 'perps.screen.trade_loaded',
  PERPS_CLOSE_SCREEN_LOADED = 'perps.screen.close_loaded',
  PERPS_TRANSACTION_HISTORY_SCREEN_LOADED = 'perps.screen.transaction_history_loaded',
  PERPS_TAB_LOADED = 'perps.screen.tab_loaded',

  // UI Component Metrics (milliseconds)
  // Tracks individual UI component render performance
  PERPS_LEVERAGE_BOTTOM_SHEET_LOADED = 'perps.ui.leverage_bottom_sheet_loaded',
  PERPS_ORDER_SUBMISSION_TOAST_LOADED = 'perps.ui.order_submission_toast_loaded',
  PERPS_ORDER_CONFIRMATION_TOAST_LOADED = 'perps.ui.order_confirmation_toast_loaded',
  PERPS_CLOSE_ORDER_SUBMISSION_TOAST_LOADED = 'perps.ui.close_order_submission_toast_loaded',
  PERPS_CLOSE_ORDER_CONFIRMATION_TOAST_LOADED = 'perps.ui.close_order_confirmation_toast_loaded',
}
