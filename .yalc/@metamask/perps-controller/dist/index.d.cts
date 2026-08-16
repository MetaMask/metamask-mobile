/**
 * PerpsController - Protocol-agnostic perpetuals trading controller
 *
 * This module provides a unified interface for perpetual futures trading
 * across multiple protocols with high-performance real-time data handling.
 *
 * Key Features:
 * - Protocol abstraction (HyperLiquid first, extensible to GMX, dYdX, etc.)
 * - Dual data flow: Redux for persistence, direct callbacks for live data
 * - MetaMask native integration with BaseController pattern
 * - Mobile-optimized with throttling and performance considerations
 *
 * Usage:
 * ```typescript
 * import { usePerpsController } from './controllers.js';
 *
 * const { placeOrder, getPositions } = usePerpsController();
 * // Live prices hooks removed with Live Market Prices component
 *
 * // Place a market order
 * await placeOrder({
 *   coin: 'ETH',
 *   is_buy: true,
 *   sz: '0.1',
 *   order_type: 'market'
 * });
 * ```
 */
export { PerpsController, getDefaultPerpsControllerState, InitializationState, PerpsMode, DEFAULT_PERPS_MODE, DEFAULT_PRO_LAYOUT_PREFERENCES, } from "./PerpsController.cjs";
export type { PerpsControllerState, PerpsControllerOptions, PerpsControllerMessenger, PerpsControllerGetStateAction, PerpsControllerActions, PerpsControllerEvents, ProLayoutPreferences, ProOrdersSideFilter, ProOrdersSortDirection, ProOrdersSortField, ProPositionsSideFilter, ProPositionsSortDirection, ProPositionsSortField, } from "./PerpsController.cjs";
export type { PerpsControllerApproveSubscriptionBuilderFeeAction, PerpsControllerCalculateFeesAction, PerpsControllerCalculateLiquidationPriceAction, PerpsControllerCalculateMaintenanceMarginAction, PerpsControllerCancelOrderAction, PerpsControllerCancelOrdersAction, PerpsControllerClearDepositResultAction, PerpsControllerClearPendingTradeConfigurationAction, PerpsControllerClearPendingTransactionRequestsAction, PerpsControllerClearWithdrawResultAction, PerpsControllerClosePositionAction, PerpsControllerClosePositionsAction, PerpsControllerClearAttributionContextAction, PerpsControllerCompleteWithdrawalFromHistoryAction, PerpsControllerDepositWithConfirmationAction, PerpsControllerDepositWithOrderAction, PerpsControllerDisconnectAction, PerpsControllerEditOrderAction, PerpsControllerFetchHistoricalCandlesAction, PerpsControllerFlipPositionAction, PerpsControllerGetAccountStateAction, PerpsControllerGetActiveProviderAction, PerpsControllerGetActiveProviderOrNullAction, PerpsControllerGetAttributionContextAction, PerpsControllerGetAvailableDexsAction, PerpsControllerGetBlockExplorerUrlAction, PerpsControllerGetCachedMarketDataForActiveProviderAction, PerpsControllerGetCachedUserDataForActiveProviderAction, PerpsControllerGetUserDataSnapshotAction, PerpsControllerGetCurrentNetworkAction, PerpsControllerGetFundingAction, PerpsControllerGetHistoricalPortfolioAction, PerpsControllerGetMarketDataWithPricesAction, PerpsControllerGetMarketFilterPreferencesAction, PerpsControllerGetMarketCategoriesAction, PerpsControllerGetMarketsAction, PerpsControllerGetMaxLeverageAction, PerpsControllerGetOpenOrdersAction, PerpsControllerGetOrderBookGroupingAction, PerpsControllerGetOrderFillsAction, PerpsControllerGetOrdersAction, PerpsControllerGetPendingTradeConfigurationAction, PerpsControllerGetPositionsAction, PerpsControllerGetTradeConfigurationAction, PerpsControllerGetRecentlyViewedMarketsAction, PerpsControllerGetWatchlistMarketsAction, PerpsControllerGetWebSocketConnectionStateAction, PerpsControllerGetWithdrawalProgressAction, PerpsControllerGetWithdrawalRoutesAction, PerpsControllerInitAction, PerpsControllerInvalidateSubscriptionBenefitsAction, PerpsControllerIsCurrentlyReinitializingAction, PerpsControllerIsFirstTimeUserOnCurrentNetworkAction, PerpsControllerIsWatchlistMarketAction, PerpsControllerMarkFirstOrderCompletedAction, PerpsControllerMarkTutorialCompletedAction, PerpsControllerPlaceOrderAction, PerpsControllerReconnectAction, PerpsControllerRecordMarketViewedAction, PerpsControllerRefreshEligibilityAction, PerpsControllerResetFirstTimeUserStateAction, PerpsControllerResetSelectedPaymentTokenAction, PerpsControllerSaveMarketFilterPreferencesAction, PerpsControllerGetProLayoutPreferencesAction, PerpsControllerSetProLayoutPreferencesAction, PerpsControllerSetPerpsModeAction, PerpsControllerSaveOrderBookGroupingAction, PerpsControllerSavePendingTradeConfigurationAction, PerpsControllerSaveTradeConfigurationAction, PerpsControllerSetAttributionContextAction, PerpsControllerSetLiveDataConfigAction, PerpsControllerSetSelectedPaymentTokenAction, PerpsControllerStartEligibilityMonitoringAction, PerpsControllerStartMarketDataPreloadAction, PerpsControllerStopEligibilityMonitoringAction, PerpsControllerStopMarketDataPreloadAction, PerpsControllerSubscribeToAccountAction, PerpsControllerSubscribeToCandlesAction, PerpsControllerSubscribeToConnectionStateAction, PerpsControllerSubscribeToOICapsAction, PerpsControllerSubscribeToOrderBookAction, PerpsControllerSubscribeToOrderFillsAction, PerpsControllerSubscribeToOrdersAction, PerpsControllerSubscribeToPositionsAction, PerpsControllerSubscribeToPricesAction, PerpsControllerSwitchProviderAction, PerpsControllerToggleTestnetAction, PerpsControllerToggleWatchlistMarketAction, PerpsControllerUpdateMarginAction, PerpsControllerUpdatePositionTPSLAction, PerpsControllerUpdateWithdrawalProgressAction, PerpsControllerUpdateWithdrawalStatusAction, PerpsControllerValidateClosePositionAction, PerpsControllerValidateOrderAction, PerpsControllerValidateWithdrawalAction, PerpsControllerWithdrawAction, } from "./PerpsController-method-action-types.cjs";
export { HyperLiquidProvider } from "./providers/HyperLiquidProvider.cjs";
export { WebSocketConnectionState, PerpsAnalyticsEvent, MARKET_CATEGORIES, MarketCategory, } from "./types/index.cjs";
export type { RawLedgerUpdate, UserHistoryItem, GetUserHistoryParams, TradeConfiguration, OrderType, TriggerOrderType, StrategyOrderType, OrdinaryOrderType, OrderExecution, TriggerDirection, TpslLinkage, PositionTriggerOrder, MarketType, MarketTypeFilter, InputMethod, TradeAction, TrackingData, TPSLTrackingData, OrderParams, OrderResult, Position, AccountState, ClosePositionParams, ClosePositionsParams, ClosePositionsResult, UpdateMarginParams, MarginResult, FlipPositionParams, InitializeResult, ReadyToTradeResult, DisconnectResult, MarketInfo, PerpsMarketData, ToggleTestnetResult, AssetRoute, SwitchProviderResult, CancelOrderParams, CancelOrderResult, BatchCancelOrdersParams, CancelOrdersParams, CancelOrdersResult, EditOrderParams, DepositParams, DepositWithConfirmationParams, DepositResult, DepositStatus, DepositFlowType, DepositStepInfo, WithdrawParams, WithdrawResult, TransferBetweenDexsParams, TransferBetweenDexsResult, GetHistoricalPortfolioParams, HistoricalPortfolioResult, LiveDataConfig, PerpsControllerConfig, PriceUpdate, OrderFill, CheckEligibilityParams, GetPositionsParams, GetAccountStateParams, GetUserDataSnapshotParams, PerpsUserDataSnapshot, GetOrderFillsParams, GetOrFetchFillsParams, GetOrdersParams, GetFundingParams, GetSupportedPathsParams, GetAvailableDexsParams, GetMarketsParams, GetMarketDataWithPricesParams, SortField, SortDirection, SubscribePricesParams, SubscribePositionsParams, SubscribeOrderFillsParams, SubscribeOrdersParams, SubscribeAccountParams, SubscribeOICapsParams, SubscribeCandlesParams, OrderBookLevel, OrderBookData, SubscribeOrderBookParams, LiquidationPriceParams, MaintenanceMarginParams, FeeCalculationParams, FeeCalculationResult, PerpsSubscriptionBenefits, PerpsSubscriptionUsage, PerpsSubscriptionFeeWaiverStatus, PerpsFeeSource, PerpsFeeResolution, UpdatePositionTPSLParams, Order, Funding, PerpsProvider, PerpsProviderType, PerpsActiveProviderMode, AggregationMode, RoutingStrategy, AggregatedProviderConfig, ProviderError, AggregatedAccountState, PerpsLogger, PerpsTraceName, PerpsTraceValue, PerpsAnalyticsProperties, PerpsAttributionContext, PerpsMetrics, PerpsDebugLogger, PerpsStreamManager, PerpsPerformance, PerpsTracer, PerpsTypedMessageParams, PerpsTransactionParams, PerpsAddTransactionOptions, PerpsInternalAccount, PerpsRemoteFeatureFlagState, PerpsPlatformDependencies, PerpsTerminalMarketService, PerpsGlobalSnapshotRequest, PerpsGlobalSnapshotResult, TerminalAssetMetadata, PerpsCacheType, InvalidateCacheParams, PerpsCacheInvalidator, MarketDataFormatters, PaymentToken, PerpsSelectedPaymentToken, VersionGatedFeatureFlag, } from "./types/index.cjs";
export { PerpsTraceNames, PerpsTraceOperations, isVersionGatedFeatureFlag, } from "./types/index.cjs";
export type { TestResultStatus, TestResult, SDKTestType, HyperliquidAsset, CandleStick, CandleData, OrderFormState, OrderDirection, ReconnectOptions, ExtendedAssetMeta, ExtendedPerpDex, } from "./types/index.cjs";
export type { BaseTransactionResult, LastTransactionResult, TransactionStatus, TransactionRecord, } from "./types/index.cjs";
export { isTransactionRecord, isLastTransactionResult } from "./types/index.cjs";
export type { AssetPosition, SpotBalance, PerpsUniverse, PerpsAssetCtx, PredictedFunding, FrontendOrder, SDKOrderParams, ClearinghouseStateResponse, SpotClearinghouseStateResponse, MetaResponse, FrontendOpenOrdersResponse, AllMidsResponse, MetaAndAssetCtxsResponse, PredictedFundingsResponse, SpotMetaResponse, } from "./types/index.cjs";
export type { HyperLiquidEndpoints, AssetNetworkConfig, HyperLiquidAssetConfigs, BridgeContractConfig, HyperLiquidBridgeContracts, TransportReconnectConfig, TransportKeepAliveConfig, HyperLiquidTransportConfig, TradingAmountConfig, TradingDefaultsConfig, FeeRatesConfig, HyperLiquidNetwork, } from "./types/index.cjs";
export type { PerpsToken } from "./types/index.cjs";
export { CandlePeriod, TimeDuration, ChartInterval, MAX_CANDLE_COUNT, DURATION_CANDLE_PERIODS, CANDLE_PERIODS, DEFAULT_CANDLE_PERIOD, getCandlePeriodsForDuration, getDefaultCandlePeriodForDuration, calculateCandleCount, } from "./constants/index.cjs";
export { PERPS_EVENT_PROPERTY, PERPS_EVENT_VALUE } from "./constants/index.cjs";
export { DETAILED_ORDER_TYPES, isTPSLOrder } from "./constants/index.cjs";
export { PERPS_TRANSACTIONS_HISTORY_CONSTANTS } from "./constants/index.cjs";
export { ARBITRUM_MAINNET_CHAIN_ID_HEX, ARBITRUM_MAINNET_CHAIN_ID, ARBITRUM_TESTNET_CHAIN_ID, ARBITRUM_MAINNET_CAIP_CHAIN_ID, ARBITRUM_TESTNET_CAIP_CHAIN_ID, HYPERLIQUID_MAINNET_CHAIN_ID, HYPERLIQUID_TESTNET_CHAIN_ID, HYPERLIQUID_MAINNET_CAIP_CHAIN_ID, HYPERLIQUID_TESTNET_CAIP_CHAIN_ID, HYPERLIQUID_NETWORK_NAME, USDC_SYMBOL, USDC_NAME, USDC_DECIMALS, TOKEN_DECIMALS, ZERO_ADDRESS, ZERO_BALANCE, ARBITRUM_SEPOLIA_CHAIN_ID, USDC_ETHEREUM_MAINNET_ADDRESS, USDC_ARBITRUM_MAINNET_ADDRESS, USDC_ARBITRUM_TESTNET_ADDRESS, USDC_TOKEN_ICON_URL, HYPERLIQUID_ENDPOINTS, HYPERLIQUID_ASSET_ICONS_BASE_URL, METAMASK_PERPS_ICONS_BASE_URL, HYPERLIQUID_ASSET_CONFIGS, HYPERLIQUID_BRIDGE_CONTRACTS, HYPERLIQUID_TRANSPORT_CONFIG, TRADING_DEFAULTS, FEE_RATES, HIP3_FEE_CONFIG, BUILDER_FEE_CONFIG, REFERRAL_CONFIG, DEPOSIT_CONFIG, HYPERLIQUID_WITHDRAWAL_MINUTES, getWebSocketEndpoint, getChainId, getCaipChainId, getBridgeInfo, getSupportedAssets, CAIP_ASSET_NAMESPACES, HYPERLIQUID_CONFIG, HIP3_ASSET_ID_CONFIG, BASIS_POINTS_DIVISOR, SPOT_ASSET_ID_OFFSET, HIP3_ASSET_MARKET_TYPES, TESTNET_HIP3_CONFIG, MAINNET_HIP3_CONFIG, HIP3_MARGIN_CONFIG, INITIAL_AMOUNT_UI_PROGRESS, WITHDRAWAL_PROGRESS_STAGES, PROGRESS_BAR_COMPLETION_DELAY_MS, } from "./constants/index.cjs";
export type { SupportedAsset } from "./constants/index.cjs";
export { PerpsMeasurementName } from "./constants/index.cjs";
export { MYX_MAINNET_CHAIN_ID, MYX_TESTNET_CHAIN_ID, MYX_MAINNET_CAIP_CHAIN_ID, MYX_TESTNET_CAIP_CHAIN_ID, getMYXChainId, MYX_ENDPOINTS, getMYXHttpEndpoint, MYX_PRICE_DECIMALS, MYX_SIZE_DECIMALS, MYX_COLLATERAL_DECIMALS, USDT_BNB_TESTNET, USDT_BNB_MAINNET, MYX_ASSET_CONFIGS, fromMYXPrice, toMYXPrice, fromMYXSize, toMYXSize, fromMYXCollateral, MYX_PRICE_POLLING_INTERVAL_MS, MYX_HTTP_TIMEOUT_MS, MYX_MAX_RETRIES, MYX_MAX_LEVERAGE, MYX_FEE_RATE, MYX_PROTOCOL_FEE_RATE, MYX_DEFAULT_SLIPPAGE_BPS, MYX_MINIMUM_ORDER_SIZE_USD, MYX_EXECUTION_FEE_TOKEN, } from "./constants/index.cjs";
export { LIGHTER_MAINNET_CHAIN_ID, LIGHTER_TESTNET_CHAIN_ID, getLighterChainId, LIGHTER_ENDPOINTS, getLighterHttpEndpoint, LIGHTER_DEFAULT_API_KEY_INDEX, LIGHTER_KEY_DERIVATION_MESSAGE_TEMPLATE, buildLighterKeyDerivationMessage, LIGHTER_HTTP_TIMEOUT_MS, LIGHTER_PRICE_POLLING_INTERVAL_MS, LIGHTER_MAX_LEVERAGE, toLighterInteger, fromLighterInteger, computeLighterMinOrderSize, } from "./constants/index.cjs";
export type { LighterNetwork, LighterSignerBridge, LighterWebSocketCtor, LighterWebSocketLike, LighterWasmCall, LighterAuthConfig, LighterPersonalSigner, } from "./types/lighter-types.cjs";
export { PERPS_CONSTANTS, WITHDRAWAL_CONSTANTS, VALIDATION_THRESHOLDS, ORDER_SLIPPAGE_CONFIG, CHASE_ORDER_CONFIG, MAX_SLIPPAGE_BOUNDS, PERFORMANCE_CONFIG, TP_SL_CONFIG, HYPERLIQUID_ORDER_LIMITS, HYPERLIQUID_TWAP_LIMITS, CLOSE_POSITION_CONFIG, MARGIN_ADJUSTMENT_CONFIG, DATA_LAKE_API_CONFIG, DECIMAL_PRECISION_CONFIG, MARKET_SORTING_CONFIG, PROVIDER_CONFIG, FUNDING_RATE_CONFIG, } from "./constants/index.cjs";
export type { SortOptionId } from "./constants/index.cjs";
export { findEvmAccount, getEvmAccountFromAccountGroup, getSelectedEvmAccount, calculateWeightedReturnOnEquity, aggregateAccountStates, } from "./utils/index.cjs";
export type { ReturnOnEquityInput } from "./utils/index.cjs";
export { ensureError, isAbortError } from "./utils/index.cjs";
export type { OrderBookCacheEntry, ProcessL2BookDataParams, ProcessBboDataParams, } from "./utils/index.cjs";
export { processL2BookData, processBboData } from "./utils/index.cjs";
export type { ValidationDebugLogger } from "./utils/index.cjs";
export { createErrorResult, validateWithdrawalParams, validateDepositParams, validateAssetSupport, validateBalance, applyPathFilters, getSupportedPaths, getMaxOrderValue, validateOrderParams, validateCoinExists, } from "./utils/index.cjs";
export { TRIGGER_ORDER_TYPES, STRATEGY_ORDER_TYPES, SCALE_ORDER_COUNT, isTriggerOrderType, isStrategyOrderType, isLimitExecutionOrderType, getTriggerExecution, getTriggerDirection, buildTriggerOrderType, buildPositionTriggerOrderFromOrder, computeScalePriceLadder, computeChaseQuotePrice, getPriceTick, splitScaleSizes, } from "./utils/index.cjs";
export { adaptTriggerOrderTypeFromSDK, adaptPositionTriggerOrderFromSDK, adaptTpslLinkageToGrouping, } from "./utils/index.cjs";
export { generatePerpsId, generateDepositId, generateWithdrawalId, generateOrderId, generateTransactionId, } from "./utils/index.cjs";
export { calculateOpenInterestUSD, isMarketTradable, transformMarketData, formatChange, } from "./utils/index.cjs";
export type { HyperLiquidMarketData } from "./utils/index.cjs";
export { getPerpsConnectionAttemptContext, withPerpsConnectionAttemptContext, } from "./utils/perpsConnectionAttemptContext.cjs";
export type { PerpsConnectionAttemptContext } from "./utils/perpsConnectionAttemptContext.cjs";
export { MAX_MARKET_PATTERN_LENGTH, escapeRegex, validateMarketPattern, compileMarketPattern, matchesMarketPattern, shouldIncludeMarket, getPerpsDisplaySymbol, getPerpsDexFromSymbol, calculateFundingCountdown, calculate24hHighLow, filterMarketsByQuery, matchesCategory, getMarketTypeFilter, applyMarketFilters, isHip3Market, rankMarketsByQuery, getMarketMatchRank, } from "./utils/index.cjs";
export { MarketMatchRank } from "./utils/index.cjs";
export type { MarketPatternMatcher, CompiledMarketPattern, } from "./utils/index.cjs";
export type { OrderCalculationsDebugLogger, CalculateFinalPositionSizeParams, CalculateFinalPositionSizeResult, CalculateOrderPriceAndSizeParams, CalculateOrderPriceAndSizeResult, BuildOrdersArrayParams, BuildOrdersArrayResult, } from "./utils/index.cjs";
export { calculatePositionSize, calculateMarginRequired, getMaxAllowedAmount, calculateFinalPositionSize, calculateOrderPriceAndSize, buildOrdersArray, } from "./utils/index.cjs";
export { formatAccountToCaipAccountId, isCaipAccountId, handleRewardsError, } from "./utils/index.cjs";
export { countSignificantFigures, hasExceededSignificantFigures, roundToSignificantFigures, } from "./utils/index.cjs";
export type { SortMarketsParams } from "./utils/index.cjs";
export { parseVolume, sortMarkets } from "./utils/index.cjs";
export type { StandaloneInfoClientOptions } from "./utils/index.cjs";
export { createStandaloneInfoClient, queryStandaloneClearinghouseStates, queryStandaloneOpenOrders, } from "./utils/index.cjs";
export { stripQuotes, parseCommaSeparatedString } from "./utils/index.cjs";
export { generateERC20TransferData } from "./utils/index.cjs";
export { wait } from "./utils/index.cjs";
export { adaptOrderToSDK, adaptPositionFromSDK, adaptOrderFromSDK, adaptMarketFromSDK, adaptAccountStateFromSDK, buildAssetMapping, formatHyperLiquidPrice, formatHyperLiquidSize, calculateHip3AssetId, parseAssetName, adaptHyperLiquidLedgerUpdateToUserHistoryItem, } from "./utils/index.cjs";
export { getEnvironment } from "./utils/index.cjs";
export type { FiatRangeConfig } from "./utils/index.cjs";
export { PRICE_THRESHOLD, formatWithSignificantDigits, PRICE_RANGES_MINIMAL_VIEW, PRICE_RANGES_UNIVERSAL, formatPerpsFiat, formatPositionSize, formatPnl, formatPercentage, formatFundingRate, } from "./utils/index.cjs";
export { PERPS_ERROR_CODES } from "./perpsErrorCodes.cjs";
export type { PerpsErrorCode } from "./perpsErrorCodes.cjs";
export { selectIsFirstTimeUser, selectHasPlacedFirstOrder, selectWatchlistMarkets, selectIsWatchlistMarket, selectRecentlyViewedMarkets, selectTradeConfiguration, selectPendingTradeConfiguration, selectMarketFilterPreferences, selectOrderBookGrouping, selectProLayoutPreferences, selectPerpsMode, } from "./selectors.cjs";
export { TradingReadinessCache } from "./services/TradingReadinessCache.cjs";
export type { ServiceContext } from "./services/ServiceContext.cjs";
export { AggregatedOrderBookConnection, processAggregatedOrderBook, } from "./services/AggregatedOrderBookConnection.cjs";
export type { OrderBookConnectionStatus, SubscribeAggregatedOrderBookParams, AggregatedOrderBookConnectionOptions, } from "./services/AggregatedOrderBookConnection.cjs";
//# sourceMappingURL=index.d.cts.map