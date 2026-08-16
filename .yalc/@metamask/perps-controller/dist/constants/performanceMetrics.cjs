"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerpsMeasurementName = void 0;
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
var PerpsMeasurementName;
(function (PerpsMeasurementName) {
    // ===== ACTIVE SENTRY METRICS =====
    // WebSocket Performance Metrics (milliseconds)
    // Tracks WebSocket connection lifecycle and data flow
    PerpsMeasurementName["PerpsWebsocketConnectionEstablishment"] = "perps.websocket.connection_establishment";
    PerpsMeasurementName["PerpsWebsocketConnectionWithPreload"] = "perps.websocket.connection_with_preload";
    PerpsMeasurementName["PerpsWebsocketFirstPositionData"] = "perps.websocket.first_position_data";
    PerpsMeasurementName["PerpsWebsocketAccountSwitchReconnection"] = "perps.websocket.account_switch_reconnection";
    PerpsMeasurementName["PerpsConnectionHealthCheck"] = "perps.websocket.health_check";
    PerpsMeasurementName["PerpsReconnectionHealthCheck"] = "perps.websocket.reconnection_health_check";
    // Connection Lifecycle Metrics (milliseconds)
    // Tracks connection initialization and reconnection sub-stages
    PerpsMeasurementName["PerpsProviderInit"] = "perps.connection.provider_init";
    PerpsMeasurementName["PerpsAccountStateFetch"] = "perps.connection.account_state_fetch";
    PerpsMeasurementName["PerpsSubscriptionsPreload"] = "perps.connection.subscriptions_preload";
    PerpsMeasurementName["PerpsReconnectionCleanup"] = "perps.connection.cleanup";
    PerpsMeasurementName["PerpsControllerReinit"] = "perps.connection.controller_reinit";
    PerpsMeasurementName["PerpsNewAccountFetch"] = "perps.connection.new_account_fetch";
    PerpsMeasurementName["PerpsReconnectionPreload"] = "perps.connection.reconnection_preload";
    // API Call Metrics (milliseconds)
    // Tracks external API performance
    PerpsMeasurementName["PerpsDataLakeApiCall"] = "perps.api.data_lake_call";
    PerpsMeasurementName["PerpsRewardsFeeDiscountApiCall"] = "perps.api.rewards_fee_discount";
    PerpsMeasurementName["PerpsRewardsPointsEstimationApiCall"] = "perps.api.rewards_points_estimation";
    PerpsMeasurementName["PerpsRewardsOrderExecutionFeeDiscountApiCall"] = "perps.api.rewards_order_execution_fee_discount";
    // Data Operation Metrics (milliseconds)
    // Tracks data fetch operations
    PerpsMeasurementName["PerpsGetPositionsOperation"] = "perps.operation.get_positions";
    PerpsMeasurementName["PerpsGetOpenOrdersOperation"] = "perps.operation.get_open_orders";
    PerpsMeasurementName["PerpsMarketDataPreload"] = "perps.operation.market_data_preload";
    PerpsMeasurementName["PerpsUserDataPreload"] = "perps.operation.user_data_preload";
    // Screen Load Metrics (milliseconds)
    // Tracks full screen render performance
    PerpsMeasurementName["PerpsWithdrawalScreenLoaded"] = "perps.screen.withdrawal_loaded";
    PerpsMeasurementName["PerpsMarketsScreenLoaded"] = "perps.screen.markets_loaded";
    PerpsMeasurementName["PerpsAssetScreenLoaded"] = "perps.screen.asset_loaded";
    PerpsMeasurementName["PerpsTradeScreenLoaded"] = "perps.screen.trade_loaded";
    PerpsMeasurementName["PerpsCloseScreenLoaded"] = "perps.screen.close_loaded";
    PerpsMeasurementName["PerpsTransactionHistoryScreenLoaded"] = "perps.screen.transaction_history_loaded";
    PerpsMeasurementName["PerpsTabLoaded"] = "perps.screen.tab_loaded";
    // UI Component Metrics (milliseconds)
    // Tracks individual UI component render performance
    PerpsMeasurementName["PerpsLeverageBottomSheetLoaded"] = "perps.ui.leverage_bottom_sheet_loaded";
    PerpsMeasurementName["PerpsOrderSubmissionToastLoaded"] = "perps.ui.order_submission_toast_loaded";
    PerpsMeasurementName["PerpsOrderConfirmationToastLoaded"] = "perps.ui.order_confirmation_toast_loaded";
    PerpsMeasurementName["PerpsCloseOrderSubmissionToastLoaded"] = "perps.ui.close_order_submission_toast_loaded";
    PerpsMeasurementName["PerpsCloseOrderConfirmationToastLoaded"] = "perps.ui.close_order_confirmation_toast_loaded";
})(PerpsMeasurementName || (exports.PerpsMeasurementName = PerpsMeasurementName = {}));
//# sourceMappingURL=performanceMetrics.cjs.map