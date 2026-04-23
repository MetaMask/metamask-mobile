/**
 * This file is auto generated.
 * Do not edit manually.
 */

import type { PerpsController } from './PerpsController';

/**
 * Read cached market data for the currently active provider (or aggregated).
 * Returns null when no valid cache exists or when cache has expired.
 *
 * @returns The cached market data array, or null if no valid cache.
 */
export type PerpsControllerGetCachedMarketDataForActiveProviderAction = {
  type: `PerpsController:getCachedMarketDataForActiveProvider`;
  handler: PerpsController['getCachedMarketDataForActiveProvider'];
};

/**
 * Read cached user data for the currently active provider (or aggregated).
 * Returns null when no valid cache exists, cache has expired, or address
 * does not match the currently selected EVM account.
 *
 * @returns The cached user data, or null if no valid cache.
 */
export type PerpsControllerGetCachedUserDataForActiveProviderAction = {
  type: `PerpsController:getCachedUserDataForActiveProvider`;
  handler: PerpsController['getCachedUserDataForActiveProvider'];
};

/**
 * Initialize the PerpsController providers
 * Must be called before using any other methods
 * Prevents double initialization with promise caching
 *
 * @returns A promise that resolves when the operation completes.
 */
export type PerpsControllerInitAction = {
  type: `PerpsController:init`;
  handler: PerpsController['init'];
};

/**
 * Get the currently active provider.
 * In aggregated mode, returns AggregatedPerpsProvider which routes to underlying providers.
 * In single provider mode, returns HyperLiquidProvider directly.
 *
 * @returns The active provider (aggregated wrapper or direct provider based on mode)
 * @throws Error if provider is not initialized or reinitializing
 */
export type PerpsControllerGetActiveProviderAction = {
  type: `PerpsController:getActiveProvider`;
  handler: PerpsController['getActiveProvider'];
};

/**
 * Get the currently active provider, returning null if not available
 * Use this method when the caller can gracefully handle a missing provider
 * (e.g., UI components during initialization or reconnection)
 *
 * @returns The active provider, or null if not initialized/reinitializing
 */
export type PerpsControllerGetActiveProviderOrNullAction = {
  type: `PerpsController:getActiveProviderOrNull`;
  handler: PerpsController['getActiveProviderOrNull'];
};

/**
 * Place a new order
 * Thin delegation to TradingService
 *
 * @param params - The operation parameters.
 * @returns The order result with order ID and status.
 */
export type PerpsControllerPlaceOrderAction = {
  type: `PerpsController:placeOrder`;
  handler: PerpsController['placeOrder'];
};

/**
 * Edit an existing order
 * Thin delegation to TradingService
 *
 * @param params - The operation parameters.
 * @returns The updated order result with order ID and status.
 */
export type PerpsControllerEditOrderAction = {
  type: `PerpsController:editOrder`;
  handler: PerpsController['editOrder'];
};

/**
 * Cancel an existing order
 *
 * @param params - The operation parameters.
 * @returns The cancellation result with status.
 */
export type PerpsControllerCancelOrderAction = {
  type: `PerpsController:cancelOrder`;
  handler: PerpsController['cancelOrder'];
};

/**
 * Cancel multiple orders in parallel
 * Batch version of cancelOrder() that cancels multiple orders simultaneously
 *
 * @param params - The operation parameters.
 * @returns The batch cancellation results for each order.
 */
export type PerpsControllerCancelOrdersAction = {
  type: `PerpsController:cancelOrders`;
  handler: PerpsController['cancelOrders'];
};

/**
 * Close a position (partial or full)
 * Thin delegation to TradingService
 *
 * @param params - The operation parameters.
 * @returns The order result from the close position request.
 */
export type PerpsControllerClosePositionAction = {
  type: `PerpsController:closePosition`;
  handler: PerpsController['closePosition'];
};

/**
 * Close multiple positions in parallel
 * Batch version of closePosition() that closes multiple positions simultaneously
 *
 * @param params - The operation parameters.
 * @returns The batch close results for each position.
 */
export type PerpsControllerClosePositionsAction = {
  type: `PerpsController:closePositions`;
  handler: PerpsController['closePositions'];
};

/**
 * Update TP/SL for an existing position
 *
 * @param params - The operation parameters.
 * @returns The order result from the TP/SL update.
 */
export type PerpsControllerUpdatePositionTPSLAction = {
  type: `PerpsController:updatePositionTPSL`;
  handler: PerpsController['updatePositionTPSL'];
};

/**
 * Update margin for an existing position (add or remove)
 *
 * @param params - The operation parameters.
 * @returns The margin update result.
 */
export type PerpsControllerUpdateMarginAction = {
  type: `PerpsController:updateMargin`;
  handler: PerpsController['updateMargin'];
};

/**
 * Flip position (reverse direction while keeping size and leverage)
 *
 * @param params - The operation parameters.
 * @returns The order result from the position flip.
 */
export type PerpsControllerFlipPositionAction = {
  type: `PerpsController:flipPosition`;
  handler: PerpsController['flipPosition'];
};

/**
 * Simplified deposit method that prepares transaction for confirmation screen
 * No complex state tracking - just sets a loading flag
 *
 * @param params - Parameters for the deposit flow
 * @param params.amount - Optional deposit amount
 * @param params.placeOrder - If true, uses addTransaction instead of submit to avoid navigation
 * @returns An object containing a promise that resolves to the transaction hash.
 */
export type PerpsControllerDepositWithConfirmationAction = {
  type: `PerpsController:depositWithConfirmation`;
  handler: PerpsController['depositWithConfirmation'];
};

/**
 * Same as depositWithConfirmation - prepares transaction for confirmation screen.
 *
 * @returns A promise that resolves to the string result.
 */
export type PerpsControllerDepositWithOrderAction = {
  type: `PerpsController:depositWithOrder`;
  handler: PerpsController['depositWithOrder'];
};

/**
 * Clear the last deposit result after it has been shown to the user
 */
export type PerpsControllerClearDepositResultAction = {
  type: `PerpsController:clearDepositResult`;
  handler: PerpsController['clearDepositResult'];
};

export type PerpsControllerClearWithdrawResultAction = {
  type: `PerpsController:clearWithdrawResult`;
  handler: PerpsController['clearWithdrawResult'];
};

/**
 * Update withdrawal request status when it completes, or remove it on failure.
 * This is called when a withdrawal is matched with a completed withdrawal from the API.
 * When status is `failed`, the request is removed from the queue (not retained).
 *
 * @param withdrawalId - The withdrawal transaction ID.
 * @param status - The current status.
 * @param txHash - The transaction hash.
 */
export type PerpsControllerUpdateWithdrawalStatusAction = {
  type: `PerpsController:updateWithdrawalStatus`;
  handler: PerpsController['updateWithdrawalStatus'];
};

/**
 * Complete a specific withdrawal detected via transaction history polling (FIFO queue).
 * Called when a completed withdrawal appears in the transaction history matching a pending request.
 *
 * Uses FIFO matching: oldest pending withdrawal is matched with first completed withdrawal
 * in history that happened after its submission time.
 *
 * @param withdrawalRequestId - The ID of the pending withdrawal request to mark as complete.
 * @param completedWithdrawal - The completed withdrawal data from the history API.
 * @param completedWithdrawal.txHash - The on-chain transaction hash.
 * @param completedWithdrawal.amount - The withdrawal amount.
 * @param completedWithdrawal.timestamp - The completion timestamp from the history API.
 * @param completedWithdrawal.asset - The asset symbol (e.g. USDC).
 */
export type PerpsControllerCompleteWithdrawalFromHistoryAction = {
  type: `PerpsController:completeWithdrawalFromHistory`;
  handler: PerpsController['completeWithdrawalFromHistory'];
};

/**
 * Update withdrawal progress (persistent across navigation)
 *
 * @param progress - The progress indicator.
 * @param activeWithdrawalId - The active withdrawal ID.
 */
export type PerpsControllerUpdateWithdrawalProgressAction = {
  type: `PerpsController:updateWithdrawalProgress`;
  handler: PerpsController['updateWithdrawalProgress'];
};

/**
 * Get current withdrawal progress
 *
 * @returns The withdrawal progress, last update timestamp, and active withdrawal ID.
 */
export type PerpsControllerGetWithdrawalProgressAction = {
  type: `PerpsController:getWithdrawalProgress`;
  handler: PerpsController['getWithdrawalProgress'];
};

/**
 * Withdraw funds from trading account
 *
 * The withdrawal process varies by provider and may involve:
 * - Direct on-chain transfers
 * - Bridge operations
 * - Multi-step validation processes
 *
 * Check the specific provider documentation for detailed withdrawal flows.
 *
 * @param params Withdrawal parameters
 * @returns WithdrawResult with withdrawal ID and tracking info
 */
export type PerpsControllerWithdrawAction = {
  type: `PerpsController:withdraw`;
  handler: PerpsController['withdraw'];
};

/**
 * Get current positions
 * Thin delegation to MarketDataService
 *
 * For standalone mode, bypasses getActiveProvider() to allow position queries
 * without full perps initialization (e.g., for showing positions on token details page)
 *
 * @param params - The operation parameters.
 * @returns Array of open positions for the active provider.
 */
export type PerpsControllerGetPositionsAction = {
  type: `PerpsController:getPositions`;
  handler: PerpsController['getPositions'];
};

/**
 * Get historical user fills (trade executions)
 * Thin delegation to MarketDataService
 *
 * @param params - The operation parameters.
 * @returns Array of historical trade executions (fills).
 */
export type PerpsControllerGetOrderFillsAction = {
  type: `PerpsController:getOrderFills`;
  handler: PerpsController['getOrderFills'];
};

/**
 * Get historical user orders (order lifecycle)
 * Thin delegation to MarketDataService
 *
 * @param params - The operation parameters.
 * @returns Array of historical orders.
 */
export type PerpsControllerGetOrdersAction = {
  type: `PerpsController:getOrders`;
  handler: PerpsController['getOrders'];
};

/**
 * Get currently open orders (real-time status)
 * Thin delegation to MarketDataService
 *
 * For standalone mode, bypasses getActiveProvider() to allow open order queries
 * without full perps initialization (e.g., for background preloading)
 *
 * @param params - The operation parameters.
 * @returns A promise that resolves to the result.
 */
export type PerpsControllerGetOpenOrdersAction = {
  type: `PerpsController:getOpenOrders`;
  handler: PerpsController['getOpenOrders'];
};

/**
 * Get historical user funding history (funding payments)
 * Thin delegation to MarketDataService
 *
 * @param params - The operation parameters.
 * @returns Array of historical funding payments.
 */
export type PerpsControllerGetFundingAction = {
  type: `PerpsController:getFunding`;
  handler: PerpsController['getFunding'];
};

/**
 * Get account state (balances, etc.)
 * Thin delegation to MarketDataService
 *
 * For standalone mode, bypasses getActiveProvider() to allow account state queries
 * without full perps initialization (e.g., for checking if user has perps funds)
 *
 * @param params - The operation parameters.
 * @returns A promise that resolves to the result.
 */
export type PerpsControllerGetAccountStateAction = {
  type: `PerpsController:getAccountState`;
  handler: PerpsController['getAccountState'];
};

/**
 * Get historical portfolio data
 * Thin delegation to MarketDataService
 *
 * @param params - The operation parameters.
 * @returns The historical portfolio data points.
 */
export type PerpsControllerGetHistoricalPortfolioAction = {
  type: `PerpsController:getHistoricalPortfolio`;
  handler: PerpsController['getHistoricalPortfolio'];
};

/**
 * Get available markets with optional filtering
 * Thin delegation to MarketDataService
 *
 * For standalone mode, bypasses getActiveProvider() to allow market discovery
 * without full perps initialization (e.g., for discovery banners on spot screens)
 *
 * @param params - The operation parameters.
 * @returns Array of available markets matching the filter criteria.
 */
export type PerpsControllerGetMarketsAction = {
  type: `PerpsController:getMarkets`;
  handler: PerpsController['getMarkets'];
};

/**
 * Get market data with prices (includes price, volume, 24h change)
 *
 * For standalone mode, bypasses getActiveProvider() to allow market data queries
 * without full perps initialization (e.g., for background preloading on app start)
 *
 * @param params - The operation parameters.
 * @param params.standalone - Whether to use standalone mode.
 * @returns A promise that resolves to the market data.
 */
export type PerpsControllerGetMarketDataWithPricesAction = {
  type: `PerpsController:getMarketDataWithPrices`;
  handler: PerpsController['getMarketDataWithPrices'];
};

/**
 * Start background market data preloading.
 * Fetches market data immediately and refreshes every 5 minutes.
 * Watches for isTestnet and hip3ConfigVersion changes to re-preload.
 */
export type PerpsControllerStartMarketDataPreloadAction = {
  type: `PerpsController:startMarketDataPreload`;
  handler: PerpsController['startMarketDataPreload'];
};

/**
 * Stop background market data preloading.
 */
export type PerpsControllerStopMarketDataPreloadAction = {
  type: `PerpsController:stopMarketDataPreload`;
  handler: PerpsController['stopMarketDataPreload'];
};

/**
 * Get list of available HIP-3 builder-deployed DEXs
 *
 * @param params - Optional parameters for filtering
 * @returns Array of DEX names
 */
export type PerpsControllerGetAvailableDexsAction = {
  type: `PerpsController:getAvailableDexs`;
  handler: PerpsController['getAvailableDexs'];
};

/**
 * Fetch historical candle data
 * Thin delegation to MarketDataService
 *
 * @param options - The configuration options.
 * @param options.symbol - The trading pair symbol.
 * @param options.interval - The candle interval period.
 * @param options.limit - Maximum number of items to fetch.
 * @param options.endTime - End timestamp in milliseconds.
 * @returns The historical candle data for the requested symbol and interval.
 */
export type PerpsControllerFetchHistoricalCandlesAction = {
  type: `PerpsController:fetchHistoricalCandles`;
  handler: PerpsController['fetchHistoricalCandles'];
};

/**
 * Calculate liquidation price for a position
 * Uses provider-specific formulas based on protocol rules
 *
 * @param params - The operation parameters.
 * @returns A promise that resolves to the string result.
 */
export type PerpsControllerCalculateLiquidationPriceAction = {
  type: `PerpsController:calculateLiquidationPrice`;
  handler: PerpsController['calculateLiquidationPrice'];
};

/**
 * Calculate maintenance margin for a specific asset
 * Returns a percentage (e.g., 0.0125 for 1.25%)
 *
 * @param params - The operation parameters.
 * @returns A promise that resolves to the numeric result.
 */
export type PerpsControllerCalculateMaintenanceMarginAction = {
  type: `PerpsController:calculateMaintenanceMargin`;
  handler: PerpsController['calculateMaintenanceMargin'];
};

/**
 * Get maximum leverage allowed for an asset
 *
 * @param asset - The asset identifier.
 * @returns A promise that resolves to the numeric result.
 */
export type PerpsControllerGetMaxLeverageAction = {
  type: `PerpsController:getMaxLeverage`;
  handler: PerpsController['getMaxLeverage'];
};

/**
 * Validate order parameters according to protocol-specific rules
 *
 * @param params - The operation parameters.
 * @returns True if the condition is met.
 */
export type PerpsControllerValidateOrderAction = {
  type: `PerpsController:validateOrder`;
  handler: PerpsController['validateOrder'];
};

/**
 * Validate close position parameters according to protocol-specific rules
 *
 * @param params - The operation parameters.
 * @returns A promise that resolves to the result.
 */
export type PerpsControllerValidateClosePositionAction = {
  type: `PerpsController:validateClosePosition`;
  handler: PerpsController['validateClosePosition'];
};

/**
 * Validate withdrawal parameters according to protocol-specific rules
 *
 * @param params - The operation parameters.
 * @returns True if the condition is met.
 */
export type PerpsControllerValidateWithdrawalAction = {
  type: `PerpsController:validateWithdrawal`;
  handler: PerpsController['validateWithdrawal'];
};

/**
 * Get supported withdrawal routes - returns complete asset and routing information
 *
 * @returns Array of supported asset routes for withdrawals.
 */
export type PerpsControllerGetWithdrawalRoutesAction = {
  type: `PerpsController:getWithdrawalRoutes`;
  handler: PerpsController['getWithdrawalRoutes'];
};

/**
 * Toggle between testnet and mainnet
 *
 * @returns The toggle result with success status and current network mode.
 */
export type PerpsControllerToggleTestnetAction = {
  type: `PerpsController:toggleTestnet`;
  handler: PerpsController['toggleTestnet'];
};

/**
 * Switch to a different provider
 * Uses a full reinit approach: disconnect() → update state → init()
 * This ensures complete state reset including WebSocket connections and caches.
 *
 * @param providerId - The provider identifier.
 * @returns The switch result with success status and active provider.
 */
export type PerpsControllerSwitchProviderAction = {
  type: `PerpsController:switchProvider`;
  handler: PerpsController['switchProvider'];
};

/**
 * Get current network (mainnet/testnet)
 *
 * @returns Either 'mainnet' or 'testnet' based on the current configuration.
 */
export type PerpsControllerGetCurrentNetworkAction = {
  type: `PerpsController:getCurrentNetwork`;
  handler: PerpsController['getCurrentNetwork'];
};

/**
 * Get the current WebSocket connection state from the active provider.
 * Used by the UI to monitor connection health and show notifications.
 *
 * @returns The current WebSocket connection state, or DISCONNECTED if not supported
 */
export type PerpsControllerGetWebSocketConnectionStateAction = {
  type: `PerpsController:getWebSocketConnectionState`;
  handler: PerpsController['getWebSocketConnectionState'];
};

/**
 * Subscribe to WebSocket connection state changes from the active provider.
 * The listener will be called immediately with the current state and whenever the state changes.
 *
 * @param listener - Callback function that receives the new connection state and reconnection attempt
 * @returns Unsubscribe function to remove the listener, or no-op if not supported
 */
export type PerpsControllerSubscribeToConnectionStateAction = {
  type: `PerpsController:subscribeToConnectionState`;
  handler: PerpsController['subscribeToConnectionState'];
};

/**
 * Manually trigger a WebSocket reconnection attempt.
 * Used by the UI retry button when connection is lost.
 */
export type PerpsControllerReconnectAction = {
  type: `PerpsController:reconnect`;
  handler: PerpsController['reconnect'];
};

/**
 * Subscribe to live price updates
 *
 * @param params - The operation parameters.
 * @returns A cleanup function to remove the subscription.
 */
export type PerpsControllerSubscribeToPricesAction = {
  type: `PerpsController:subscribeToPrices`;
  handler: PerpsController['subscribeToPrices'];
};

/**
 * Subscribe to live position updates
 *
 * @param params - The operation parameters.
 * @returns A cleanup function to remove the subscription.
 */
export type PerpsControllerSubscribeToPositionsAction = {
  type: `PerpsController:subscribeToPositions`;
  handler: PerpsController['subscribeToPositions'];
};

/**
 * Subscribe to live order fill updates
 *
 * @param params - The operation parameters.
 * @returns A cleanup function to remove the subscription.
 */
export type PerpsControllerSubscribeToOrderFillsAction = {
  type: `PerpsController:subscribeToOrderFills`;
  handler: PerpsController['subscribeToOrderFills'];
};

/**
 * Subscribe to live order updates
 *
 * @param params - The operation parameters.
 * @returns A cleanup function to remove the subscription.
 */
export type PerpsControllerSubscribeToOrdersAction = {
  type: `PerpsController:subscribeToOrders`;
  handler: PerpsController['subscribeToOrders'];
};

/**
 * Subscribe to live account updates.
 * Updates controller state (Redux) when new account data arrives so consumers
 * like usePerpsBalanceTokenFilter (PayWithModal) see the latest balance.
 *
 * @param params - The operation parameters.
 * @returns A cleanup function to remove the subscription.
 */
export type PerpsControllerSubscribeToAccountAction = {
  type: `PerpsController:subscribeToAccount`;
  handler: PerpsController['subscribeToAccount'];
};

/**
 * Subscribe to full order book updates with multiple depth levels
 * Creates a dedicated L2Book subscription for real-time order book data
 *
 * @param params - The operation parameters.
 * @returns A cleanup function to remove the subscription.
 */
export type PerpsControllerSubscribeToOrderBookAction = {
  type: `PerpsController:subscribeToOrderBook`;
  handler: PerpsController['subscribeToOrderBook'];
};

/**
 * Subscribe to live candle updates
 *
 * @param params - The operation parameters.
 * @returns A cleanup function to remove the subscription.
 */
export type PerpsControllerSubscribeToCandlesAction = {
  type: `PerpsController:subscribeToCandles`;
  handler: PerpsController['subscribeToCandles'];
};

/**
 * Subscribe to open interest cap updates
 * Zero additional network overhead - data comes from existing webData3 subscription
 *
 * @param params - The operation parameters.
 * @returns A cleanup function to remove the subscription.
 */
export type PerpsControllerSubscribeToOICapsAction = {
  type: `PerpsController:subscribeToOICaps`;
  handler: PerpsController['subscribeToOICaps'];
};

/**
 * Configure live data throttling
 *
 * @param config - The configuration object.
 */
export type PerpsControllerSetLiveDataConfigAction = {
  type: `PerpsController:setLiveDataConfig`;
  handler: PerpsController['setLiveDataConfig'];
};

/**
 * Calculate trading fees for the active provider
 * Each provider implements its own fee structure
 *
 * @param params - The operation parameters.
 * @returns The fee calculation result for the trade.
 */
export type PerpsControllerCalculateFeesAction = {
  type: `PerpsController:calculateFees`;
  handler: PerpsController['calculateFees'];
};

/**
 * Disconnect provider and cleanup subscriptions
 * Call this when navigating away from Perps screens to prevent battery drain
 */
export type PerpsControllerDisconnectAction = {
  type: `PerpsController:disconnect`;
  handler: PerpsController['disconnect'];
};

/**
 * Resume eligibility monitoring after onboarding completes.
 * Clears the deferred flag and triggers an immediate eligibility check
 * using the current remote feature flag state.
 */
export type PerpsControllerStartEligibilityMonitoringAction = {
  type: `PerpsController:startEligibilityMonitoring`;
  handler: PerpsController['startEligibilityMonitoring'];
};

/**
 * Stops geo-blocking eligibility monitoring.
 * Call this when the user disables basic functionality (e.g. useExternalServices becomes false).
 * Prevents geolocation calls until startEligibilityMonitoring() is called again.
 * Safe to call multiple times.
 */
export type PerpsControllerStopEligibilityMonitoringAction = {
  type: `PerpsController:stopEligibilityMonitoring`;
  handler: PerpsController['stopEligibilityMonitoring'];
};

export type PerpsControllerRefreshEligibilityAction = {
  type: `PerpsController:refreshEligibility`;
  handler: PerpsController['refreshEligibility'];
};

/**
 * Get block explorer URL for an address or just the base URL
 *
 * @param address - Optional address to append to the base URL
 * @returns Block explorer URL
 */
export type PerpsControllerGetBlockExplorerUrlAction = {
  type: `PerpsController:getBlockExplorerUrl`;
  handler: PerpsController['getBlockExplorerUrl'];
};

/**
 * Check if user is first-time for the current network
 *
 * @returns True if the condition is met.
 */
export type PerpsControllerIsFirstTimeUserOnCurrentNetworkAction = {
  type: `PerpsController:isFirstTimeUserOnCurrentNetwork`;
  handler: PerpsController['isFirstTimeUserOnCurrentNetwork'];
};

/**
 * Mark that the user has completed the tutorial/onboarding
 * This prevents the tutorial from showing again
 */
export type PerpsControllerMarkTutorialCompletedAction = {
  type: `PerpsController:markTutorialCompleted`;
  handler: PerpsController['markTutorialCompleted'];
};

export type PerpsControllerMarkFirstOrderCompletedAction = {
  type: `PerpsController:markFirstOrderCompleted`;
  handler: PerpsController['markFirstOrderCompleted'];
};

/**
 * Reset first-time user state for both networks
 * This is useful for testing the tutorial flow
 * Called by Reset Account feature in settings
 */
export type PerpsControllerResetFirstTimeUserStateAction = {
  type: `PerpsController:resetFirstTimeUserState`;
  handler: PerpsController['resetFirstTimeUserState'];
};

/**
 * Clear pending/bridging withdrawal and deposit requests
 * This is useful when users want to clear stuck pending indicators
 * Called by Reset Account feature in settings
 */
export type PerpsControllerClearPendingTransactionRequestsAction = {
  type: `PerpsController:clearPendingTransactionRequests`;
  handler: PerpsController['clearPendingTransactionRequests'];
};

/**
 * Get saved trade configuration for a market
 *
 * @param symbol - The trading pair symbol.
 * @returns The resulting string value.
 */
export type PerpsControllerGetTradeConfigurationAction = {
  type: `PerpsController:getTradeConfiguration`;
  handler: PerpsController['getTradeConfiguration'];
};

/**
 * Save trade configuration for a market
 *
 * @param symbol - Market symbol
 * @param leverage - Leverage value
 */
export type PerpsControllerSaveTradeConfigurationAction = {
  type: `PerpsController:saveTradeConfiguration`;
  handler: PerpsController['saveTradeConfiguration'];
};

/**
 * Save pending trade configuration for a market
 * This is a temporary configuration that expires after 5 minutes
 *
 * @param symbol - Market symbol
 * @param config - Pending trade configuration (includes optional selected payment token from Pay row)
 * @param config.amount - The amount value.
 * @param config.leverage - The leverage multiplier.
 * @param config.takeProfitPrice - The take profit price.
 * @param config.stopLossPrice - The stop loss price.
 * @param config.limitPrice - The limit price.
 * @param config.orderType - The order type.
 * @param config.selectedPaymentToken - The selected payment token.
 */
export type PerpsControllerSavePendingTradeConfigurationAction = {
  type: `PerpsController:savePendingTradeConfiguration`;
  handler: PerpsController['savePendingTradeConfiguration'];
};

/**
 * Get pending trade configuration for a market
 * Returns undefined if config doesn't exist or has expired (more than 5 minutes old)
 *
 * @param symbol - Market symbol
 * @returns Pending trade configuration or undefined
 */
export type PerpsControllerGetPendingTradeConfigurationAction = {
  type: `PerpsController:getPendingTradeConfiguration`;
  handler: PerpsController['getPendingTradeConfiguration'];
};

/**
 * Clear pending trade configuration for a market
 *
 * @param symbol - Market symbol
 */
export type PerpsControllerClearPendingTradeConfigurationAction = {
  type: `PerpsController:clearPendingTradeConfiguration`;
  handler: PerpsController['clearPendingTradeConfiguration'];
};

/**
 * Get saved market filter preferences
 * Handles backward compatibility with legacy string format
 *
 * @returns The saved sort option ID and direction.
 */
export type PerpsControllerGetMarketFilterPreferencesAction = {
  type: `PerpsController:getMarketFilterPreferences`;
  handler: PerpsController['getMarketFilterPreferences'];
};

/**
 * Save market filter preferences
 *
 * @param optionId - Sort/filter option ID
 * @param direction - Sort direction ('asc' or 'desc')
 */
export type PerpsControllerSaveMarketFilterPreferencesAction = {
  type: `PerpsController:saveMarketFilterPreferences`;
  handler: PerpsController['saveMarketFilterPreferences'];
};

/**
 * Set the selected payment token for the Perps order/deposit flow.
 * Pass null or a token with description PERPS_CONSTANTS.PerpsBalanceTokenDescription to select Perps balance.
 * Only required fields (address, chainId) are stored in state; description and symbol are optional.
 *
 * @param token - The token identifier.
 */
export type PerpsControllerSetSelectedPaymentTokenAction = {
  type: `PerpsController:setSelectedPaymentToken`;
  handler: PerpsController['setSelectedPaymentToken'];
};

/**
 * Reset the selected payment token to Perps balance (null).
 * Call when leaving the Perps order view so the next visit defaults to Perps balance.
 */
export type PerpsControllerResetSelectedPaymentTokenAction = {
  type: `PerpsController:resetSelectedPaymentToken`;
  handler: PerpsController['resetSelectedPaymentToken'];
};

/**
 * Get saved order book grouping for a market
 *
 * @param symbol - Market symbol
 * @returns The saved grouping value or undefined if not set
 */
export type PerpsControllerGetOrderBookGroupingAction = {
  type: `PerpsController:getOrderBookGrouping`;
  handler: PerpsController['getOrderBookGrouping'];
};

/**
 * Save order book grouping for a market
 *
 * @param symbol - Market symbol
 * @param grouping - Price grouping value
 */
export type PerpsControllerSaveOrderBookGroupingAction = {
  type: `PerpsController:saveOrderBookGrouping`;
  handler: PerpsController['saveOrderBookGrouping'];
};

/**
 * Toggle watchlist status for a market
 * Watchlist markets are stored per network (testnet/mainnet)
 *
 * @param symbol - The trading pair symbol.
 */
export type PerpsControllerToggleWatchlistMarketAction = {
  type: `PerpsController:toggleWatchlistMarket`;
  handler: PerpsController['toggleWatchlistMarket'];
};

/**
 * Check if a market is in the watchlist on the current network
 *
 * @param symbol - The trading pair symbol.
 * @returns True if the condition is met.
 */
export type PerpsControllerIsWatchlistMarketAction = {
  type: `PerpsController:isWatchlistMarket`;
  handler: PerpsController['isWatchlistMarket'];
};

/**
 * Get all watchlist markets for the current network
 *
 * @returns The resulting string value.
 */
export type PerpsControllerGetWatchlistMarketsAction = {
  type: `PerpsController:getWatchlistMarkets`;
  handler: PerpsController['getWatchlistMarkets'];
};

/**
 * Check if the controller is currently reinitializing
 *
 * @returns true if providers are being reinitialized
 */
export type PerpsControllerIsCurrentlyReinitializingAction = {
  type: `PerpsController:isCurrentlyReinitializing`;
  handler: PerpsController['isCurrentlyReinitializing'];
};

/**
 * Union of all PerpsController action types.
 */
export type PerpsControllerMethodActions =
  | PerpsControllerGetCachedMarketDataForActiveProviderAction
  | PerpsControllerGetCachedUserDataForActiveProviderAction
  | PerpsControllerInitAction
  | PerpsControllerGetActiveProviderAction
  | PerpsControllerGetActiveProviderOrNullAction
  | PerpsControllerPlaceOrderAction
  | PerpsControllerEditOrderAction
  | PerpsControllerCancelOrderAction
  | PerpsControllerCancelOrdersAction
  | PerpsControllerClosePositionAction
  | PerpsControllerClosePositionsAction
  | PerpsControllerUpdatePositionTPSLAction
  | PerpsControllerUpdateMarginAction
  | PerpsControllerFlipPositionAction
  | PerpsControllerDepositWithConfirmationAction
  | PerpsControllerDepositWithOrderAction
  | PerpsControllerClearDepositResultAction
  | PerpsControllerClearWithdrawResultAction
  | PerpsControllerUpdateWithdrawalStatusAction
  | PerpsControllerCompleteWithdrawalFromHistoryAction
  | PerpsControllerUpdateWithdrawalProgressAction
  | PerpsControllerGetWithdrawalProgressAction
  | PerpsControllerWithdrawAction
  | PerpsControllerGetPositionsAction
  | PerpsControllerGetOrderFillsAction
  | PerpsControllerGetOrdersAction
  | PerpsControllerGetOpenOrdersAction
  | PerpsControllerGetFundingAction
  | PerpsControllerGetAccountStateAction
  | PerpsControllerGetHistoricalPortfolioAction
  | PerpsControllerGetMarketsAction
  | PerpsControllerGetMarketDataWithPricesAction
  | PerpsControllerStartMarketDataPreloadAction
  | PerpsControllerStopMarketDataPreloadAction
  | PerpsControllerGetAvailableDexsAction
  | PerpsControllerFetchHistoricalCandlesAction
  | PerpsControllerCalculateLiquidationPriceAction
  | PerpsControllerCalculateMaintenanceMarginAction
  | PerpsControllerGetMaxLeverageAction
  | PerpsControllerValidateOrderAction
  | PerpsControllerValidateClosePositionAction
  | PerpsControllerValidateWithdrawalAction
  | PerpsControllerGetWithdrawalRoutesAction
  | PerpsControllerToggleTestnetAction
  | PerpsControllerSwitchProviderAction
  | PerpsControllerGetCurrentNetworkAction
  | PerpsControllerGetWebSocketConnectionStateAction
  | PerpsControllerSubscribeToConnectionStateAction
  | PerpsControllerReconnectAction
  | PerpsControllerSubscribeToPricesAction
  | PerpsControllerSubscribeToPositionsAction
  | PerpsControllerSubscribeToOrderFillsAction
  | PerpsControllerSubscribeToOrdersAction
  | PerpsControllerSubscribeToAccountAction
  | PerpsControllerSubscribeToOrderBookAction
  | PerpsControllerSubscribeToCandlesAction
  | PerpsControllerSubscribeToOICapsAction
  | PerpsControllerSetLiveDataConfigAction
  | PerpsControllerCalculateFeesAction
  | PerpsControllerDisconnectAction
  | PerpsControllerStartEligibilityMonitoringAction
  | PerpsControllerStopEligibilityMonitoringAction
  | PerpsControllerRefreshEligibilityAction
  | PerpsControllerGetBlockExplorerUrlAction
  | PerpsControllerIsFirstTimeUserOnCurrentNetworkAction
  | PerpsControllerMarkTutorialCompletedAction
  | PerpsControllerMarkFirstOrderCompletedAction
  | PerpsControllerResetFirstTimeUserStateAction
  | PerpsControllerClearPendingTransactionRequestsAction
  | PerpsControllerGetTradeConfigurationAction
  | PerpsControllerSaveTradeConfigurationAction
  | PerpsControllerSavePendingTradeConfigurationAction
  | PerpsControllerGetPendingTradeConfigurationAction
  | PerpsControllerClearPendingTradeConfigurationAction
  | PerpsControllerGetMarketFilterPreferencesAction
  | PerpsControllerSaveMarketFilterPreferencesAction
  | PerpsControllerSetSelectedPaymentTokenAction
  | PerpsControllerResetSelectedPaymentTokenAction
  | PerpsControllerGetOrderBookGroupingAction
  | PerpsControllerSaveOrderBookGroupingAction
  | PerpsControllerToggleWatchlistMarketAction
  | PerpsControllerIsWatchlistMarketAction
  | PerpsControllerGetWatchlistMarketsAction
  | PerpsControllerIsCurrentlyReinitializingAction;
