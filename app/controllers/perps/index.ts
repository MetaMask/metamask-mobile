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
 * import { usePerpsController } from './controllers';
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

// Core controller and types
export {
  PerpsController,
  getDefaultPerpsControllerState,
  InitializationState,
} from './PerpsController';
export type {
  PerpsControllerState,
  PerpsControllerOptions,
  PerpsControllerMessenger,
  PerpsControllerActions,
  PerpsControllerEvents,
} from './PerpsController';

// Provider interfaces and implementations
export { HyperLiquidProvider } from './providers/HyperLiquidProvider';

// Type definitions (explicit named exports)
export { WebSocketConnectionState, PerpsAnalyticsEvent } from './types';
export type {
  RawLedgerUpdate,
  UserHistoryItem,
  GetUserHistoryParams,
  TradeConfiguration,
  OrderType,
  MarketType,
  MarketTypeFilter,
  InputMethod,
  TradeAction,
  TrackingData,
  TPSLTrackingData,
  OrderParams,
  OrderResult,
  Position,
  AccountState,
  ClosePositionParams,
  ClosePositionsParams,
  ClosePositionsResult,
  UpdateMarginParams,
  MarginResult,
  FlipPositionParams,
  InitializeResult,
  ReadyToTradeResult,
  DisconnectResult,
  MarketInfo,
  PerpsMarketData,
  ToggleTestnetResult,
  AssetRoute,
  SwitchProviderResult,
  CancelOrderParams,
  CancelOrderResult,
  BatchCancelOrdersParams,
  CancelOrdersParams,
  CancelOrdersResult,
  EditOrderParams,
  DepositParams,
  DepositWithConfirmationParams,
  DepositResult,
  DepositStatus,
  DepositFlowType,
  DepositStepInfo,
  WithdrawParams,
  WithdrawResult,
  TransferBetweenDexsParams,
  TransferBetweenDexsResult,
  GetHistoricalPortfolioParams,
  HistoricalPortfolioResult,
  LiveDataConfig,
  PerpsControllerConfig,
  PriceUpdate,
  OrderFill,
  CheckEligibilityParams,
  GetPositionsParams,
  GetAccountStateParams,
  GetOrderFillsParams,
  GetOrFetchFillsParams,
  GetOrdersParams,
  GetFundingParams,
  GetSupportedPathsParams,
  GetAvailableDexsParams,
  GetMarketsParams,
  SubscribePricesParams,
  SubscribePositionsParams,
  SubscribeOrderFillsParams,
  SubscribeOrdersParams,
  SubscribeAccountParams,
  SubscribeOICapsParams,
  SubscribeCandlesParams,
  OrderBookLevel,
  OrderBookData,
  SubscribeOrderBookParams,
  LiquidationPriceParams,
  MaintenanceMarginParams,
  FeeCalculationParams,
  FeeCalculationResult,
  UpdatePositionTPSLParams,
  Order,
  Funding,
  PerpsProvider,
  PerpsProviderType,
  PerpsActiveProviderMode,
  AggregationMode,
  RoutingStrategy,
  AggregatedProviderConfig,
  ProviderError,
  AggregatedAccountState,
  PerpsLogger,
  PerpsTraceName,
  PerpsTraceValue,
  PerpsAnalyticsProperties,
  PerpsMetrics,
  PerpsDebugLogger,
  PerpsStreamManager,
  PerpsPerformance,
  PerpsTracer,
  PerpsTypedMessageParams,
  PerpsTransactionParams,
  PerpsAddTransactionOptions,
  PerpsInternalAccount,
  PerpsRemoteFeatureFlagState,
  PerpsPlatformDependencies,
  PerpsCacheType,
  InvalidateCacheParams,
  PerpsCacheInvalidator,
  MarketDataFormatters,
  PaymentToken,
  PerpsSelectedPaymentToken,
  VersionGatedFeatureFlag,
} from './types';
export {
  PerpsTraceNames,
  PerpsTraceOperations,
  isVersionGatedFeatureFlag,
} from './types';

// Types from sub-modules (re-exported via types/index.ts)
export type {
  TestResultStatus,
  TestResult,
  SDKTestType,
  HyperliquidAsset,
  CandleStick,
  CandleData,
  OrderFormState,
  OrderDirection,
  ReconnectOptions,
  ExtendedAssetMeta,
  ExtendedPerpDex,
} from './types';
export type {
  BaseTransactionResult,
  LastTransactionResult,
  TransactionStatus,
  TransactionRecord,
} from './types';
export { isTransactionRecord, isLastTransactionResult } from './types';
export type {
  AssetPosition,
  SpotBalance,
  PerpsUniverse,
  PerpsAssetCtx,
  PredictedFunding,
  FrontendOrder,
  SDKOrderParams,
  ClearinghouseStateResponse,
  SpotClearinghouseStateResponse,
  MetaResponse,
  FrontendOpenOrdersResponse,
  AllMidsResponse,
  MetaAndAssetCtxsResponse,
  PredictedFundingsResponse,
  SpotMetaResponse,
} from './types';
export type {
  HyperLiquidEndpoints,
  AssetNetworkConfig,
  HyperLiquidAssetConfigs,
  BridgeContractConfig,
  HyperLiquidBridgeContracts,
  TransportReconnectConfig,
  TransportKeepAliveConfig,
  HyperLiquidTransportConfig,
  TradingAmountConfig,
  TradingDefaultsConfig,
  FeeRatesConfig,
  HyperLiquidNetwork,
} from './types';
export type { PerpsToken } from './types';

// Constants (explicit named exports)
export {
  CandlePeriod,
  TimeDuration,
  ChartInterval,
  MAX_CANDLE_COUNT,
  DURATION_CANDLE_PERIODS,
  CANDLE_PERIODS,
  DEFAULT_CANDLE_PERIOD,
  getCandlePeriodsForDuration,
  getDefaultCandlePeriodForDuration,
  calculateCandleCount,
} from './constants';
export { PERPS_EVENT_PROPERTY, PERPS_EVENT_VALUE } from './constants';
export { DETAILED_ORDER_TYPES, isTPSLOrder } from './constants';
export { PERPS_TRANSACTIONS_HISTORY_CONSTANTS } from './constants';
export {
  ARBITRUM_MAINNET_CHAIN_ID_HEX,
  ARBITRUM_MAINNET_CHAIN_ID,
  ARBITRUM_TESTNET_CHAIN_ID,
  ARBITRUM_MAINNET_CAIP_CHAIN_ID,
  ARBITRUM_TESTNET_CAIP_CHAIN_ID,
  HYPERLIQUID_MAINNET_CHAIN_ID,
  HYPERLIQUID_TESTNET_CHAIN_ID,
  HYPERLIQUID_MAINNET_CAIP_CHAIN_ID,
  HYPERLIQUID_TESTNET_CAIP_CHAIN_ID,
  HYPERLIQUID_NETWORK_NAME,
  USDC_SYMBOL,
  USDC_NAME,
  USDC_DECIMALS,
  TOKEN_DECIMALS,
  ZERO_ADDRESS,
  ZERO_BALANCE,
  ARBITRUM_SEPOLIA_CHAIN_ID,
  USDC_ETHEREUM_MAINNET_ADDRESS,
  USDC_ARBITRUM_MAINNET_ADDRESS,
  USDC_ARBITRUM_TESTNET_ADDRESS,
  USDC_TOKEN_ICON_URL,
  HYPERLIQUID_ENDPOINTS,
  HYPERLIQUID_ASSET_ICONS_BASE_URL,
  METAMASK_PERPS_ICONS_BASE_URL,
  HYPERLIQUID_ASSET_CONFIGS,
  HYPERLIQUID_BRIDGE_CONTRACTS,
  HYPERLIQUID_TRANSPORT_CONFIG,
  TRADING_DEFAULTS,
  FEE_RATES,
  HIP3_FEE_CONFIG,
  BUILDER_FEE_CONFIG,
  REFERRAL_CONFIG,
  DEPOSIT_CONFIG,
  HYPERLIQUID_WITHDRAWAL_MINUTES,
  getWebSocketEndpoint,
  getChainId,
  getCaipChainId,
  getBridgeInfo,
  getSupportedAssets,
  CAIP_ASSET_NAMESPACES,
  HYPERLIQUID_CONFIG,
  HIP3_ASSET_ID_CONFIG,
  BASIS_POINTS_DIVISOR,
  SPOT_ASSET_ID_OFFSET,
  HIP3_ASSET_MARKET_TYPES,
  TESTNET_HIP3_CONFIG,
  MAINNET_HIP3_CONFIG,
  HIP3_MARGIN_CONFIG,
  USDH_CONFIG,
  INITIAL_AMOUNT_UI_PROGRESS,
  WITHDRAWAL_PROGRESS_STAGES,
  PROGRESS_BAR_COMPLETION_DELAY_MS,
} from './constants';
export type { SupportedAsset } from './constants';
export { PerpsMeasurementName } from './constants';
export {
  BNB_MAINNET_CHAIN_ID,
  BNB_TESTNET_CHAIN_ID,
  BNB_MAINNET_CAIP_CHAIN_ID,
  BNB_TESTNET_CAIP_CHAIN_ID,
  getMYXChainId,
  MYX_ENDPOINTS,
  getMYXHttpEndpoint,
  MYX_PRICE_DECIMALS,
  MYX_SIZE_DECIMALS,
  MYX_COLLATERAL_DECIMALS,
  USDT_BNB_TESTNET,
  USDT_BNB_MAINNET,
  MYX_ASSET_CONFIGS,
  fromMYXPrice,
  toMYXPrice,
  fromMYXSize,
  toMYXSize,
  fromMYXCollateral,
  MYX_PRICE_POLLING_INTERVAL_MS,
  MYX_HTTP_TIMEOUT_MS,
  MYX_MAX_RETRIES,
  MYX_TRADING_DEFAULTS,
  MYX_FEE_CONFIG,
} from './constants';
export {
  PERPS_CONSTANTS,
  WITHDRAWAL_CONSTANTS,
  VALIDATION_THRESHOLDS,
  ORDER_SLIPPAGE_CONFIG,
  PERFORMANCE_CONFIG,
  TP_SL_CONFIG,
  HYPERLIQUID_ORDER_LIMITS,
  CLOSE_POSITION_CONFIG,
  MARGIN_ADJUSTMENT_CONFIG,
  DATA_LAKE_API_CONFIG,
  DECIMAL_PRECISION_CONFIG,
  MARKET_SORTING_CONFIG,
  PROVIDER_CONFIG,
} from './constants';
export type { SortOptionId } from './constants';

// Utilities (explicit named exports)
export {
  findEvmAccount,
  getEvmAccountFromAccountGroup,
  getSelectedEvmAccount,
  calculateWeightedReturnOnEquity,
  aggregateAccountStates,
} from './utils';
export type { ReturnOnEquityInput } from './utils';
export { ensureError } from './utils';
export type {
  OrderBookCacheEntry,
  ProcessL2BookDataParams,
  ProcessBboDataParams,
} from './utils';
export { processL2BookData, processBboData } from './utils';
export type { ValidationDebugLogger } from './utils';
export {
  createErrorResult,
  validateWithdrawalParams,
  validateDepositParams,
  validateAssetSupport,
  validateBalance,
  applyPathFilters,
  getSupportedPaths,
  getMaxOrderValue,
  validateOrderParams,
  validateCoinExists,
} from './utils';
export {
  generatePerpsId,
  generateDepositId,
  generateWithdrawalId,
  generateOrderId,
  generateTransactionId,
} from './utils';
export {
  calculateOpenInterestUSD,
  transformMarketData,
  formatChange,
} from './utils';
export type { HyperLiquidMarketData } from './utils';
export {
  adaptMarketFromMYX,
  adaptPriceFromMYX,
  adaptMarketDataFromMYX,
  filterMYXExclusiveMarkets,
  isOverlappingMarket,
  buildPoolSymbolMap,
  buildSymbolPoolsMap,
  extractSymbolFromPoolId,
} from './utils';
export {
  MAX_MARKET_PATTERN_LENGTH,
  escapeRegex,
  validateMarketPattern,
  compileMarketPattern,
  matchesMarketPattern,
  shouldIncludeMarket,
  getPerpsDisplaySymbol,
  getPerpsDexFromSymbol,
  calculateFundingCountdown,
  calculate24hHighLow,
  filterMarketsByQuery,
} from './utils';
export type { MarketPatternMatcher, CompiledMarketPattern } from './utils';
export type {
  OrderCalculationsDebugLogger,
  CalculateFinalPositionSizeParams,
  CalculateFinalPositionSizeResult,
  CalculateOrderPriceAndSizeParams,
  CalculateOrderPriceAndSizeResult,
  BuildOrdersArrayParams,
  BuildOrdersArrayResult,
} from './utils';
export {
  calculatePositionSize,
  calculateMarginRequired,
  getMaxAllowedAmount,
  calculateFinalPositionSize,
  calculateOrderPriceAndSize,
  buildOrdersArray,
} from './utils';
export {
  formatAccountToCaipAccountId,
  isCaipAccountId,
  handleRewardsError,
} from './utils';
export {
  countSignificantFigures,
  hasExceededSignificantFigures,
  roundToSignificantFigures,
} from './utils';
export type { SortField, SortDirection, SortMarketsParams } from './utils';
export { parseVolume, sortMarkets } from './utils';
export type { StandaloneInfoClientOptions } from './utils';
export {
  createStandaloneInfoClient,
  queryStandaloneClearinghouseStates,
  queryStandaloneOpenOrders,
} from './utils';
export { stripQuotes, parseCommaSeparatedString } from './utils';
export { generateERC20TransferData } from './utils';
export { wait } from './utils';
export {
  adaptOrderToSDK,
  adaptPositionFromSDK,
  adaptOrderFromSDK,
  adaptMarketFromSDK,
  adaptAccountStateFromSDK,
  buildAssetMapping,
  formatHyperLiquidPrice,
  formatHyperLiquidSize,
  calculateHip3AssetId,
  parseAssetName,
  adaptHyperLiquidLedgerUpdateToUserHistoryItem,
} from './utils';
export { getEnvironment } from './utils';

// Error codes (explicit named exports)
export { PERPS_ERROR_CODES } from './perpsErrorCodes';
export type { PerpsErrorCode } from './perpsErrorCodes';

// Selectors (explicit named exports)
export {
  selectIsFirstTimeUser,
  selectHasPlacedFirstOrder,
  selectWatchlistMarkets,
  selectIsWatchlistMarket,
  selectTradeConfiguration,
  selectPendingTradeConfiguration,
  selectMarketFilterPreferences,
  selectOrderBookGrouping,
} from './selectors';

// Services (only externally consumed items)
export { TradingReadinessCache } from './services/TradingReadinessCache';
export type { ServiceContext } from './services/ServiceContext';

// Removed with Live Market Prices component:
// - usePerpsPrices
