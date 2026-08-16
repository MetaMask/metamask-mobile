"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.USDC_ARBITRUM_MAINNET_ADDRESS = exports.USDC_ETHEREUM_MAINNET_ADDRESS = exports.ARBITRUM_SEPOLIA_CHAIN_ID = exports.ZERO_BALANCE = exports.ZERO_ADDRESS = exports.TOKEN_DECIMALS = exports.USDC_DECIMALS = exports.USDC_NAME = exports.USDC_SYMBOL = exports.HYPERLIQUID_NETWORK_NAME = exports.HYPERLIQUID_TESTNET_CAIP_CHAIN_ID = exports.HYPERLIQUID_MAINNET_CAIP_CHAIN_ID = exports.HYPERLIQUID_TESTNET_CHAIN_ID = exports.HYPERLIQUID_MAINNET_CHAIN_ID = exports.ARBITRUM_TESTNET_CAIP_CHAIN_ID = exports.ARBITRUM_MAINNET_CAIP_CHAIN_ID = exports.ARBITRUM_TESTNET_CHAIN_ID = exports.ARBITRUM_MAINNET_CHAIN_ID = exports.ARBITRUM_MAINNET_CHAIN_ID_HEX = exports.PERPS_TRANSACTIONS_HISTORY_CONSTANTS = exports.isTPSLOrder = exports.DETAILED_ORDER_TYPES = exports.PERPS_EVENT_VALUE = exports.PERPS_EVENT_PROPERTY = exports.calculateCandleCount = exports.getDefaultCandlePeriodForDuration = exports.getCandlePeriodsForDuration = exports.DEFAULT_CANDLE_PERIOD = exports.CANDLE_PERIODS = exports.DURATION_CANDLE_PERIODS = exports.MAX_CANDLE_COUNT = exports.ChartInterval = exports.TimeDuration = exports.CandlePeriod = exports.isLastTransactionResult = exports.isTransactionRecord = exports.isVersionGatedFeatureFlag = exports.PerpsTraceOperations = exports.PerpsTraceNames = exports.MarketCategory = exports.MARKET_CATEGORIES = exports.PerpsAnalyticsEvent = exports.WebSocketConnectionState = exports.HyperLiquidProvider = exports.DEFAULT_PRO_LAYOUT_PREFERENCES = exports.DEFAULT_PERPS_MODE = exports.PerpsMode = exports.InitializationState = exports.getDefaultPerpsControllerState = exports.PerpsController = void 0;
exports.toMYXSize = exports.fromMYXSize = exports.toMYXPrice = exports.fromMYXPrice = exports.MYX_ASSET_CONFIGS = exports.USDT_BNB_MAINNET = exports.USDT_BNB_TESTNET = exports.MYX_COLLATERAL_DECIMALS = exports.MYX_SIZE_DECIMALS = exports.MYX_PRICE_DECIMALS = exports.getMYXHttpEndpoint = exports.MYX_ENDPOINTS = exports.getMYXChainId = exports.MYX_TESTNET_CAIP_CHAIN_ID = exports.MYX_MAINNET_CAIP_CHAIN_ID = exports.MYX_TESTNET_CHAIN_ID = exports.MYX_MAINNET_CHAIN_ID = exports.PerpsMeasurementName = exports.PROGRESS_BAR_COMPLETION_DELAY_MS = exports.WITHDRAWAL_PROGRESS_STAGES = exports.INITIAL_AMOUNT_UI_PROGRESS = exports.HIP3_MARGIN_CONFIG = exports.MAINNET_HIP3_CONFIG = exports.TESTNET_HIP3_CONFIG = exports.HIP3_ASSET_MARKET_TYPES = exports.SPOT_ASSET_ID_OFFSET = exports.BASIS_POINTS_DIVISOR = exports.HIP3_ASSET_ID_CONFIG = exports.HYPERLIQUID_CONFIG = exports.CAIP_ASSET_NAMESPACES = exports.getSupportedAssets = exports.getBridgeInfo = exports.getCaipChainId = exports.getChainId = exports.getWebSocketEndpoint = exports.HYPERLIQUID_WITHDRAWAL_MINUTES = exports.DEPOSIT_CONFIG = exports.REFERRAL_CONFIG = exports.BUILDER_FEE_CONFIG = exports.HIP3_FEE_CONFIG = exports.FEE_RATES = exports.TRADING_DEFAULTS = exports.HYPERLIQUID_TRANSPORT_CONFIG = exports.HYPERLIQUID_BRIDGE_CONTRACTS = exports.HYPERLIQUID_ASSET_CONFIGS = exports.METAMASK_PERPS_ICONS_BASE_URL = exports.HYPERLIQUID_ASSET_ICONS_BASE_URL = exports.HYPERLIQUID_ENDPOINTS = exports.USDC_TOKEN_ICON_URL = exports.USDC_ARBITRUM_TESTNET_ADDRESS = void 0;
exports.processBboData = exports.processL2BookData = exports.isAbortError = exports.ensureError = exports.aggregateAccountStates = exports.calculateWeightedReturnOnEquity = exports.getSelectedEvmAccount = exports.getEvmAccountFromAccountGroup = exports.findEvmAccount = exports.FUNDING_RATE_CONFIG = exports.PROVIDER_CONFIG = exports.MARKET_SORTING_CONFIG = exports.DECIMAL_PRECISION_CONFIG = exports.DATA_LAKE_API_CONFIG = exports.MARGIN_ADJUSTMENT_CONFIG = exports.CLOSE_POSITION_CONFIG = exports.HYPERLIQUID_TWAP_LIMITS = exports.HYPERLIQUID_ORDER_LIMITS = exports.TP_SL_CONFIG = exports.PERFORMANCE_CONFIG = exports.MAX_SLIPPAGE_BOUNDS = exports.CHASE_ORDER_CONFIG = exports.ORDER_SLIPPAGE_CONFIG = exports.VALIDATION_THRESHOLDS = exports.WITHDRAWAL_CONSTANTS = exports.PERPS_CONSTANTS = exports.computeLighterMinOrderSize = exports.fromLighterInteger = exports.toLighterInteger = exports.LIGHTER_MAX_LEVERAGE = exports.LIGHTER_PRICE_POLLING_INTERVAL_MS = exports.LIGHTER_HTTP_TIMEOUT_MS = exports.buildLighterKeyDerivationMessage = exports.LIGHTER_KEY_DERIVATION_MESSAGE_TEMPLATE = exports.LIGHTER_DEFAULT_API_KEY_INDEX = exports.getLighterHttpEndpoint = exports.LIGHTER_ENDPOINTS = exports.getLighterChainId = exports.LIGHTER_TESTNET_CHAIN_ID = exports.LIGHTER_MAINNET_CHAIN_ID = exports.MYX_EXECUTION_FEE_TOKEN = exports.MYX_MINIMUM_ORDER_SIZE_USD = exports.MYX_DEFAULT_SLIPPAGE_BPS = exports.MYX_PROTOCOL_FEE_RATE = exports.MYX_FEE_RATE = exports.MYX_MAX_LEVERAGE = exports.MYX_MAX_RETRIES = exports.MYX_HTTP_TIMEOUT_MS = exports.MYX_PRICE_POLLING_INTERVAL_MS = exports.fromMYXCollateral = void 0;
exports.matchesCategory = exports.filterMarketsByQuery = exports.calculate24hHighLow = exports.calculateFundingCountdown = exports.getPerpsDexFromSymbol = exports.getPerpsDisplaySymbol = exports.shouldIncludeMarket = exports.matchesMarketPattern = exports.compileMarketPattern = exports.validateMarketPattern = exports.escapeRegex = exports.MAX_MARKET_PATTERN_LENGTH = exports.withPerpsConnectionAttemptContext = exports.getPerpsConnectionAttemptContext = exports.formatChange = exports.transformMarketData = exports.isMarketTradable = exports.calculateOpenInterestUSD = exports.generateTransactionId = exports.generateOrderId = exports.generateWithdrawalId = exports.generateDepositId = exports.generatePerpsId = exports.adaptTpslLinkageToGrouping = exports.adaptPositionTriggerOrderFromSDK = exports.adaptTriggerOrderTypeFromSDK = exports.splitScaleSizes = exports.getPriceTick = exports.computeChaseQuotePrice = exports.computeScalePriceLadder = exports.buildPositionTriggerOrderFromOrder = exports.buildTriggerOrderType = exports.getTriggerDirection = exports.getTriggerExecution = exports.isLimitExecutionOrderType = exports.isStrategyOrderType = exports.isTriggerOrderType = exports.SCALE_ORDER_COUNT = exports.STRATEGY_ORDER_TYPES = exports.TRIGGER_ORDER_TYPES = exports.validateCoinExists = exports.validateOrderParams = exports.getMaxOrderValue = exports.getSupportedPaths = exports.applyPathFilters = exports.validateBalance = exports.validateAssetSupport = exports.validateDepositParams = exports.validateWithdrawalParams = exports.createErrorResult = void 0;
exports.selectIsFirstTimeUser = exports.PERPS_ERROR_CODES = exports.formatFundingRate = exports.formatPercentage = exports.formatPnl = exports.formatPositionSize = exports.formatPerpsFiat = exports.PRICE_RANGES_UNIVERSAL = exports.PRICE_RANGES_MINIMAL_VIEW = exports.formatWithSignificantDigits = exports.PRICE_THRESHOLD = exports.getEnvironment = exports.adaptHyperLiquidLedgerUpdateToUserHistoryItem = exports.parseAssetName = exports.calculateHip3AssetId = exports.formatHyperLiquidSize = exports.formatHyperLiquidPrice = exports.buildAssetMapping = exports.adaptAccountStateFromSDK = exports.adaptMarketFromSDK = exports.adaptOrderFromSDK = exports.adaptPositionFromSDK = exports.adaptOrderToSDK = exports.wait = exports.generateERC20TransferData = exports.parseCommaSeparatedString = exports.stripQuotes = exports.queryStandaloneOpenOrders = exports.queryStandaloneClearinghouseStates = exports.createStandaloneInfoClient = exports.sortMarkets = exports.parseVolume = exports.roundToSignificantFigures = exports.hasExceededSignificantFigures = exports.countSignificantFigures = exports.handleRewardsError = exports.isCaipAccountId = exports.formatAccountToCaipAccountId = exports.buildOrdersArray = exports.calculateOrderPriceAndSize = exports.calculateFinalPositionSize = exports.getMaxAllowedAmount = exports.calculateMarginRequired = exports.calculatePositionSize = exports.MarketMatchRank = exports.getMarketMatchRank = exports.rankMarketsByQuery = exports.isHip3Market = exports.applyMarketFilters = exports.getMarketTypeFilter = void 0;
exports.processAggregatedOrderBook = exports.AggregatedOrderBookConnection = exports.TradingReadinessCache = exports.selectPerpsMode = exports.selectProLayoutPreferences = exports.selectOrderBookGrouping = exports.selectMarketFilterPreferences = exports.selectPendingTradeConfiguration = exports.selectTradeConfiguration = exports.selectRecentlyViewedMarkets = exports.selectIsWatchlistMarket = exports.selectWatchlistMarkets = exports.selectHasPlacedFirstOrder = void 0;
// Core controller and types
var PerpsController_js_1 = require("./PerpsController.cjs");
Object.defineProperty(exports, "PerpsController", { enumerable: true, get: function () { return PerpsController_js_1.PerpsController; } });
Object.defineProperty(exports, "getDefaultPerpsControllerState", { enumerable: true, get: function () { return PerpsController_js_1.getDefaultPerpsControllerState; } });
Object.defineProperty(exports, "InitializationState", { enumerable: true, get: function () { return PerpsController_js_1.InitializationState; } });
Object.defineProperty(exports, "PerpsMode", { enumerable: true, get: function () { return PerpsController_js_1.PerpsMode; } });
Object.defineProperty(exports, "DEFAULT_PERPS_MODE", { enumerable: true, get: function () { return PerpsController_js_1.DEFAULT_PERPS_MODE; } });
Object.defineProperty(exports, "DEFAULT_PRO_LAYOUT_PREFERENCES", { enumerable: true, get: function () { return PerpsController_js_1.DEFAULT_PRO_LAYOUT_PREFERENCES; } });
// Provider interfaces and implementations
var HyperLiquidProvider_js_1 = require("./providers/HyperLiquidProvider.cjs");
Object.defineProperty(exports, "HyperLiquidProvider", { enumerable: true, get: function () { return HyperLiquidProvider_js_1.HyperLiquidProvider; } });
// Type definitions (explicit named exports)
var index_js_1 = require("./types/index.cjs");
Object.defineProperty(exports, "WebSocketConnectionState", { enumerable: true, get: function () { return index_js_1.WebSocketConnectionState; } });
Object.defineProperty(exports, "PerpsAnalyticsEvent", { enumerable: true, get: function () { return index_js_1.PerpsAnalyticsEvent; } });
Object.defineProperty(exports, "MARKET_CATEGORIES", { enumerable: true, get: function () { return index_js_1.MARKET_CATEGORIES; } });
Object.defineProperty(exports, "MarketCategory", { enumerable: true, get: function () { return index_js_1.MarketCategory; } });
var index_js_2 = require("./types/index.cjs");
Object.defineProperty(exports, "PerpsTraceNames", { enumerable: true, get: function () { return index_js_2.PerpsTraceNames; } });
Object.defineProperty(exports, "PerpsTraceOperations", { enumerable: true, get: function () { return index_js_2.PerpsTraceOperations; } });
Object.defineProperty(exports, "isVersionGatedFeatureFlag", { enumerable: true, get: function () { return index_js_2.isVersionGatedFeatureFlag; } });
var index_js_3 = require("./types/index.cjs");
Object.defineProperty(exports, "isTransactionRecord", { enumerable: true, get: function () { return index_js_3.isTransactionRecord; } });
Object.defineProperty(exports, "isLastTransactionResult", { enumerable: true, get: function () { return index_js_3.isLastTransactionResult; } });
// Constants (explicit named exports)
var index_js_4 = require("./constants/index.cjs");
Object.defineProperty(exports, "CandlePeriod", { enumerable: true, get: function () { return index_js_4.CandlePeriod; } });
Object.defineProperty(exports, "TimeDuration", { enumerable: true, get: function () { return index_js_4.TimeDuration; } });
Object.defineProperty(exports, "ChartInterval", { enumerable: true, get: function () { return index_js_4.ChartInterval; } });
Object.defineProperty(exports, "MAX_CANDLE_COUNT", { enumerable: true, get: function () { return index_js_4.MAX_CANDLE_COUNT; } });
Object.defineProperty(exports, "DURATION_CANDLE_PERIODS", { enumerable: true, get: function () { return index_js_4.DURATION_CANDLE_PERIODS; } });
Object.defineProperty(exports, "CANDLE_PERIODS", { enumerable: true, get: function () { return index_js_4.CANDLE_PERIODS; } });
Object.defineProperty(exports, "DEFAULT_CANDLE_PERIOD", { enumerable: true, get: function () { return index_js_4.DEFAULT_CANDLE_PERIOD; } });
Object.defineProperty(exports, "getCandlePeriodsForDuration", { enumerable: true, get: function () { return index_js_4.getCandlePeriodsForDuration; } });
Object.defineProperty(exports, "getDefaultCandlePeriodForDuration", { enumerable: true, get: function () { return index_js_4.getDefaultCandlePeriodForDuration; } });
Object.defineProperty(exports, "calculateCandleCount", { enumerable: true, get: function () { return index_js_4.calculateCandleCount; } });
var index_js_5 = require("./constants/index.cjs");
Object.defineProperty(exports, "PERPS_EVENT_PROPERTY", { enumerable: true, get: function () { return index_js_5.PERPS_EVENT_PROPERTY; } });
Object.defineProperty(exports, "PERPS_EVENT_VALUE", { enumerable: true, get: function () { return index_js_5.PERPS_EVENT_VALUE; } });
var index_js_6 = require("./constants/index.cjs");
Object.defineProperty(exports, "DETAILED_ORDER_TYPES", { enumerable: true, get: function () { return index_js_6.DETAILED_ORDER_TYPES; } });
Object.defineProperty(exports, "isTPSLOrder", { enumerable: true, get: function () { return index_js_6.isTPSLOrder; } });
var index_js_7 = require("./constants/index.cjs");
Object.defineProperty(exports, "PERPS_TRANSACTIONS_HISTORY_CONSTANTS", { enumerable: true, get: function () { return index_js_7.PERPS_TRANSACTIONS_HISTORY_CONSTANTS; } });
var index_js_8 = require("./constants/index.cjs");
Object.defineProperty(exports, "ARBITRUM_MAINNET_CHAIN_ID_HEX", { enumerable: true, get: function () { return index_js_8.ARBITRUM_MAINNET_CHAIN_ID_HEX; } });
Object.defineProperty(exports, "ARBITRUM_MAINNET_CHAIN_ID", { enumerable: true, get: function () { return index_js_8.ARBITRUM_MAINNET_CHAIN_ID; } });
Object.defineProperty(exports, "ARBITRUM_TESTNET_CHAIN_ID", { enumerable: true, get: function () { return index_js_8.ARBITRUM_TESTNET_CHAIN_ID; } });
Object.defineProperty(exports, "ARBITRUM_MAINNET_CAIP_CHAIN_ID", { enumerable: true, get: function () { return index_js_8.ARBITRUM_MAINNET_CAIP_CHAIN_ID; } });
Object.defineProperty(exports, "ARBITRUM_TESTNET_CAIP_CHAIN_ID", { enumerable: true, get: function () { return index_js_8.ARBITRUM_TESTNET_CAIP_CHAIN_ID; } });
Object.defineProperty(exports, "HYPERLIQUID_MAINNET_CHAIN_ID", { enumerable: true, get: function () { return index_js_8.HYPERLIQUID_MAINNET_CHAIN_ID; } });
Object.defineProperty(exports, "HYPERLIQUID_TESTNET_CHAIN_ID", { enumerable: true, get: function () { return index_js_8.HYPERLIQUID_TESTNET_CHAIN_ID; } });
Object.defineProperty(exports, "HYPERLIQUID_MAINNET_CAIP_CHAIN_ID", { enumerable: true, get: function () { return index_js_8.HYPERLIQUID_MAINNET_CAIP_CHAIN_ID; } });
Object.defineProperty(exports, "HYPERLIQUID_TESTNET_CAIP_CHAIN_ID", { enumerable: true, get: function () { return index_js_8.HYPERLIQUID_TESTNET_CAIP_CHAIN_ID; } });
Object.defineProperty(exports, "HYPERLIQUID_NETWORK_NAME", { enumerable: true, get: function () { return index_js_8.HYPERLIQUID_NETWORK_NAME; } });
Object.defineProperty(exports, "USDC_SYMBOL", { enumerable: true, get: function () { return index_js_8.USDC_SYMBOL; } });
Object.defineProperty(exports, "USDC_NAME", { enumerable: true, get: function () { return index_js_8.USDC_NAME; } });
Object.defineProperty(exports, "USDC_DECIMALS", { enumerable: true, get: function () { return index_js_8.USDC_DECIMALS; } });
Object.defineProperty(exports, "TOKEN_DECIMALS", { enumerable: true, get: function () { return index_js_8.TOKEN_DECIMALS; } });
Object.defineProperty(exports, "ZERO_ADDRESS", { enumerable: true, get: function () { return index_js_8.ZERO_ADDRESS; } });
Object.defineProperty(exports, "ZERO_BALANCE", { enumerable: true, get: function () { return index_js_8.ZERO_BALANCE; } });
Object.defineProperty(exports, "ARBITRUM_SEPOLIA_CHAIN_ID", { enumerable: true, get: function () { return index_js_8.ARBITRUM_SEPOLIA_CHAIN_ID; } });
Object.defineProperty(exports, "USDC_ETHEREUM_MAINNET_ADDRESS", { enumerable: true, get: function () { return index_js_8.USDC_ETHEREUM_MAINNET_ADDRESS; } });
Object.defineProperty(exports, "USDC_ARBITRUM_MAINNET_ADDRESS", { enumerable: true, get: function () { return index_js_8.USDC_ARBITRUM_MAINNET_ADDRESS; } });
Object.defineProperty(exports, "USDC_ARBITRUM_TESTNET_ADDRESS", { enumerable: true, get: function () { return index_js_8.USDC_ARBITRUM_TESTNET_ADDRESS; } });
Object.defineProperty(exports, "USDC_TOKEN_ICON_URL", { enumerable: true, get: function () { return index_js_8.USDC_TOKEN_ICON_URL; } });
Object.defineProperty(exports, "HYPERLIQUID_ENDPOINTS", { enumerable: true, get: function () { return index_js_8.HYPERLIQUID_ENDPOINTS; } });
Object.defineProperty(exports, "HYPERLIQUID_ASSET_ICONS_BASE_URL", { enumerable: true, get: function () { return index_js_8.HYPERLIQUID_ASSET_ICONS_BASE_URL; } });
Object.defineProperty(exports, "METAMASK_PERPS_ICONS_BASE_URL", { enumerable: true, get: function () { return index_js_8.METAMASK_PERPS_ICONS_BASE_URL; } });
Object.defineProperty(exports, "HYPERLIQUID_ASSET_CONFIGS", { enumerable: true, get: function () { return index_js_8.HYPERLIQUID_ASSET_CONFIGS; } });
Object.defineProperty(exports, "HYPERLIQUID_BRIDGE_CONTRACTS", { enumerable: true, get: function () { return index_js_8.HYPERLIQUID_BRIDGE_CONTRACTS; } });
Object.defineProperty(exports, "HYPERLIQUID_TRANSPORT_CONFIG", { enumerable: true, get: function () { return index_js_8.HYPERLIQUID_TRANSPORT_CONFIG; } });
Object.defineProperty(exports, "TRADING_DEFAULTS", { enumerable: true, get: function () { return index_js_8.TRADING_DEFAULTS; } });
Object.defineProperty(exports, "FEE_RATES", { enumerable: true, get: function () { return index_js_8.FEE_RATES; } });
Object.defineProperty(exports, "HIP3_FEE_CONFIG", { enumerable: true, get: function () { return index_js_8.HIP3_FEE_CONFIG; } });
Object.defineProperty(exports, "BUILDER_FEE_CONFIG", { enumerable: true, get: function () { return index_js_8.BUILDER_FEE_CONFIG; } });
Object.defineProperty(exports, "REFERRAL_CONFIG", { enumerable: true, get: function () { return index_js_8.REFERRAL_CONFIG; } });
Object.defineProperty(exports, "DEPOSIT_CONFIG", { enumerable: true, get: function () { return index_js_8.DEPOSIT_CONFIG; } });
Object.defineProperty(exports, "HYPERLIQUID_WITHDRAWAL_MINUTES", { enumerable: true, get: function () { return index_js_8.HYPERLIQUID_WITHDRAWAL_MINUTES; } });
Object.defineProperty(exports, "getWebSocketEndpoint", { enumerable: true, get: function () { return index_js_8.getWebSocketEndpoint; } });
Object.defineProperty(exports, "getChainId", { enumerable: true, get: function () { return index_js_8.getChainId; } });
Object.defineProperty(exports, "getCaipChainId", { enumerable: true, get: function () { return index_js_8.getCaipChainId; } });
Object.defineProperty(exports, "getBridgeInfo", { enumerable: true, get: function () { return index_js_8.getBridgeInfo; } });
Object.defineProperty(exports, "getSupportedAssets", { enumerable: true, get: function () { return index_js_8.getSupportedAssets; } });
Object.defineProperty(exports, "CAIP_ASSET_NAMESPACES", { enumerable: true, get: function () { return index_js_8.CAIP_ASSET_NAMESPACES; } });
Object.defineProperty(exports, "HYPERLIQUID_CONFIG", { enumerable: true, get: function () { return index_js_8.HYPERLIQUID_CONFIG; } });
Object.defineProperty(exports, "HIP3_ASSET_ID_CONFIG", { enumerable: true, get: function () { return index_js_8.HIP3_ASSET_ID_CONFIG; } });
Object.defineProperty(exports, "BASIS_POINTS_DIVISOR", { enumerable: true, get: function () { return index_js_8.BASIS_POINTS_DIVISOR; } });
Object.defineProperty(exports, "SPOT_ASSET_ID_OFFSET", { enumerable: true, get: function () { return index_js_8.SPOT_ASSET_ID_OFFSET; } });
Object.defineProperty(exports, "HIP3_ASSET_MARKET_TYPES", { enumerable: true, get: function () { return index_js_8.HIP3_ASSET_MARKET_TYPES; } });
Object.defineProperty(exports, "TESTNET_HIP3_CONFIG", { enumerable: true, get: function () { return index_js_8.TESTNET_HIP3_CONFIG; } });
Object.defineProperty(exports, "MAINNET_HIP3_CONFIG", { enumerable: true, get: function () { return index_js_8.MAINNET_HIP3_CONFIG; } });
Object.defineProperty(exports, "HIP3_MARGIN_CONFIG", { enumerable: true, get: function () { return index_js_8.HIP3_MARGIN_CONFIG; } });
Object.defineProperty(exports, "INITIAL_AMOUNT_UI_PROGRESS", { enumerable: true, get: function () { return index_js_8.INITIAL_AMOUNT_UI_PROGRESS; } });
Object.defineProperty(exports, "WITHDRAWAL_PROGRESS_STAGES", { enumerable: true, get: function () { return index_js_8.WITHDRAWAL_PROGRESS_STAGES; } });
Object.defineProperty(exports, "PROGRESS_BAR_COMPLETION_DELAY_MS", { enumerable: true, get: function () { return index_js_8.PROGRESS_BAR_COMPLETION_DELAY_MS; } });
var index_js_9 = require("./constants/index.cjs");
Object.defineProperty(exports, "PerpsMeasurementName", { enumerable: true, get: function () { return index_js_9.PerpsMeasurementName; } });
var index_js_10 = require("./constants/index.cjs");
Object.defineProperty(exports, "MYX_MAINNET_CHAIN_ID", { enumerable: true, get: function () { return index_js_10.MYX_MAINNET_CHAIN_ID; } });
Object.defineProperty(exports, "MYX_TESTNET_CHAIN_ID", { enumerable: true, get: function () { return index_js_10.MYX_TESTNET_CHAIN_ID; } });
Object.defineProperty(exports, "MYX_MAINNET_CAIP_CHAIN_ID", { enumerable: true, get: function () { return index_js_10.MYX_MAINNET_CAIP_CHAIN_ID; } });
Object.defineProperty(exports, "MYX_TESTNET_CAIP_CHAIN_ID", { enumerable: true, get: function () { return index_js_10.MYX_TESTNET_CAIP_CHAIN_ID; } });
Object.defineProperty(exports, "getMYXChainId", { enumerable: true, get: function () { return index_js_10.getMYXChainId; } });
Object.defineProperty(exports, "MYX_ENDPOINTS", { enumerable: true, get: function () { return index_js_10.MYX_ENDPOINTS; } });
Object.defineProperty(exports, "getMYXHttpEndpoint", { enumerable: true, get: function () { return index_js_10.getMYXHttpEndpoint; } });
Object.defineProperty(exports, "MYX_PRICE_DECIMALS", { enumerable: true, get: function () { return index_js_10.MYX_PRICE_DECIMALS; } });
Object.defineProperty(exports, "MYX_SIZE_DECIMALS", { enumerable: true, get: function () { return index_js_10.MYX_SIZE_DECIMALS; } });
Object.defineProperty(exports, "MYX_COLLATERAL_DECIMALS", { enumerable: true, get: function () { return index_js_10.MYX_COLLATERAL_DECIMALS; } });
Object.defineProperty(exports, "USDT_BNB_TESTNET", { enumerable: true, get: function () { return index_js_10.USDT_BNB_TESTNET; } });
Object.defineProperty(exports, "USDT_BNB_MAINNET", { enumerable: true, get: function () { return index_js_10.USDT_BNB_MAINNET; } });
Object.defineProperty(exports, "MYX_ASSET_CONFIGS", { enumerable: true, get: function () { return index_js_10.MYX_ASSET_CONFIGS; } });
Object.defineProperty(exports, "fromMYXPrice", { enumerable: true, get: function () { return index_js_10.fromMYXPrice; } });
Object.defineProperty(exports, "toMYXPrice", { enumerable: true, get: function () { return index_js_10.toMYXPrice; } });
Object.defineProperty(exports, "fromMYXSize", { enumerable: true, get: function () { return index_js_10.fromMYXSize; } });
Object.defineProperty(exports, "toMYXSize", { enumerable: true, get: function () { return index_js_10.toMYXSize; } });
Object.defineProperty(exports, "fromMYXCollateral", { enumerable: true, get: function () { return index_js_10.fromMYXCollateral; } });
Object.defineProperty(exports, "MYX_PRICE_POLLING_INTERVAL_MS", { enumerable: true, get: function () { return index_js_10.MYX_PRICE_POLLING_INTERVAL_MS; } });
Object.defineProperty(exports, "MYX_HTTP_TIMEOUT_MS", { enumerable: true, get: function () { return index_js_10.MYX_HTTP_TIMEOUT_MS; } });
Object.defineProperty(exports, "MYX_MAX_RETRIES", { enumerable: true, get: function () { return index_js_10.MYX_MAX_RETRIES; } });
Object.defineProperty(exports, "MYX_MAX_LEVERAGE", { enumerable: true, get: function () { return index_js_10.MYX_MAX_LEVERAGE; } });
Object.defineProperty(exports, "MYX_FEE_RATE", { enumerable: true, get: function () { return index_js_10.MYX_FEE_RATE; } });
Object.defineProperty(exports, "MYX_PROTOCOL_FEE_RATE", { enumerable: true, get: function () { return index_js_10.MYX_PROTOCOL_FEE_RATE; } });
Object.defineProperty(exports, "MYX_DEFAULT_SLIPPAGE_BPS", { enumerable: true, get: function () { return index_js_10.MYX_DEFAULT_SLIPPAGE_BPS; } });
Object.defineProperty(exports, "MYX_MINIMUM_ORDER_SIZE_USD", { enumerable: true, get: function () { return index_js_10.MYX_MINIMUM_ORDER_SIZE_USD; } });
Object.defineProperty(exports, "MYX_EXECUTION_FEE_TOKEN", { enumerable: true, get: function () { return index_js_10.MYX_EXECUTION_FEE_TOKEN; } });
var index_js_11 = require("./constants/index.cjs");
Object.defineProperty(exports, "LIGHTER_MAINNET_CHAIN_ID", { enumerable: true, get: function () { return index_js_11.LIGHTER_MAINNET_CHAIN_ID; } });
Object.defineProperty(exports, "LIGHTER_TESTNET_CHAIN_ID", { enumerable: true, get: function () { return index_js_11.LIGHTER_TESTNET_CHAIN_ID; } });
Object.defineProperty(exports, "getLighterChainId", { enumerable: true, get: function () { return index_js_11.getLighterChainId; } });
Object.defineProperty(exports, "LIGHTER_ENDPOINTS", { enumerable: true, get: function () { return index_js_11.LIGHTER_ENDPOINTS; } });
Object.defineProperty(exports, "getLighterHttpEndpoint", { enumerable: true, get: function () { return index_js_11.getLighterHttpEndpoint; } });
Object.defineProperty(exports, "LIGHTER_DEFAULT_API_KEY_INDEX", { enumerable: true, get: function () { return index_js_11.LIGHTER_DEFAULT_API_KEY_INDEX; } });
Object.defineProperty(exports, "LIGHTER_KEY_DERIVATION_MESSAGE_TEMPLATE", { enumerable: true, get: function () { return index_js_11.LIGHTER_KEY_DERIVATION_MESSAGE_TEMPLATE; } });
Object.defineProperty(exports, "buildLighterKeyDerivationMessage", { enumerable: true, get: function () { return index_js_11.buildLighterKeyDerivationMessage; } });
Object.defineProperty(exports, "LIGHTER_HTTP_TIMEOUT_MS", { enumerable: true, get: function () { return index_js_11.LIGHTER_HTTP_TIMEOUT_MS; } });
Object.defineProperty(exports, "LIGHTER_PRICE_POLLING_INTERVAL_MS", { enumerable: true, get: function () { return index_js_11.LIGHTER_PRICE_POLLING_INTERVAL_MS; } });
Object.defineProperty(exports, "LIGHTER_MAX_LEVERAGE", { enumerable: true, get: function () { return index_js_11.LIGHTER_MAX_LEVERAGE; } });
Object.defineProperty(exports, "toLighterInteger", { enumerable: true, get: function () { return index_js_11.toLighterInteger; } });
Object.defineProperty(exports, "fromLighterInteger", { enumerable: true, get: function () { return index_js_11.fromLighterInteger; } });
Object.defineProperty(exports, "computeLighterMinOrderSize", { enumerable: true, get: function () { return index_js_11.computeLighterMinOrderSize; } });
var index_js_12 = require("./constants/index.cjs");
Object.defineProperty(exports, "PERPS_CONSTANTS", { enumerable: true, get: function () { return index_js_12.PERPS_CONSTANTS; } });
Object.defineProperty(exports, "WITHDRAWAL_CONSTANTS", { enumerable: true, get: function () { return index_js_12.WITHDRAWAL_CONSTANTS; } });
Object.defineProperty(exports, "VALIDATION_THRESHOLDS", { enumerable: true, get: function () { return index_js_12.VALIDATION_THRESHOLDS; } });
Object.defineProperty(exports, "ORDER_SLIPPAGE_CONFIG", { enumerable: true, get: function () { return index_js_12.ORDER_SLIPPAGE_CONFIG; } });
Object.defineProperty(exports, "CHASE_ORDER_CONFIG", { enumerable: true, get: function () { return index_js_12.CHASE_ORDER_CONFIG; } });
Object.defineProperty(exports, "MAX_SLIPPAGE_BOUNDS", { enumerable: true, get: function () { return index_js_12.MAX_SLIPPAGE_BOUNDS; } });
Object.defineProperty(exports, "PERFORMANCE_CONFIG", { enumerable: true, get: function () { return index_js_12.PERFORMANCE_CONFIG; } });
Object.defineProperty(exports, "TP_SL_CONFIG", { enumerable: true, get: function () { return index_js_12.TP_SL_CONFIG; } });
Object.defineProperty(exports, "HYPERLIQUID_ORDER_LIMITS", { enumerable: true, get: function () { return index_js_12.HYPERLIQUID_ORDER_LIMITS; } });
Object.defineProperty(exports, "HYPERLIQUID_TWAP_LIMITS", { enumerable: true, get: function () { return index_js_12.HYPERLIQUID_TWAP_LIMITS; } });
Object.defineProperty(exports, "CLOSE_POSITION_CONFIG", { enumerable: true, get: function () { return index_js_12.CLOSE_POSITION_CONFIG; } });
Object.defineProperty(exports, "MARGIN_ADJUSTMENT_CONFIG", { enumerable: true, get: function () { return index_js_12.MARGIN_ADJUSTMENT_CONFIG; } });
Object.defineProperty(exports, "DATA_LAKE_API_CONFIG", { enumerable: true, get: function () { return index_js_12.DATA_LAKE_API_CONFIG; } });
Object.defineProperty(exports, "DECIMAL_PRECISION_CONFIG", { enumerable: true, get: function () { return index_js_12.DECIMAL_PRECISION_CONFIG; } });
Object.defineProperty(exports, "MARKET_SORTING_CONFIG", { enumerable: true, get: function () { return index_js_12.MARKET_SORTING_CONFIG; } });
Object.defineProperty(exports, "PROVIDER_CONFIG", { enumerable: true, get: function () { return index_js_12.PROVIDER_CONFIG; } });
Object.defineProperty(exports, "FUNDING_RATE_CONFIG", { enumerable: true, get: function () { return index_js_12.FUNDING_RATE_CONFIG; } });
// Utilities (explicit named exports)
var index_js_13 = require("./utils/index.cjs");
Object.defineProperty(exports, "findEvmAccount", { enumerable: true, get: function () { return index_js_13.findEvmAccount; } });
Object.defineProperty(exports, "getEvmAccountFromAccountGroup", { enumerable: true, get: function () { return index_js_13.getEvmAccountFromAccountGroup; } });
Object.defineProperty(exports, "getSelectedEvmAccount", { enumerable: true, get: function () { return index_js_13.getSelectedEvmAccount; } });
Object.defineProperty(exports, "calculateWeightedReturnOnEquity", { enumerable: true, get: function () { return index_js_13.calculateWeightedReturnOnEquity; } });
Object.defineProperty(exports, "aggregateAccountStates", { enumerable: true, get: function () { return index_js_13.aggregateAccountStates; } });
var index_js_14 = require("./utils/index.cjs");
Object.defineProperty(exports, "ensureError", { enumerable: true, get: function () { return index_js_14.ensureError; } });
Object.defineProperty(exports, "isAbortError", { enumerable: true, get: function () { return index_js_14.isAbortError; } });
var index_js_15 = require("./utils/index.cjs");
Object.defineProperty(exports, "processL2BookData", { enumerable: true, get: function () { return index_js_15.processL2BookData; } });
Object.defineProperty(exports, "processBboData", { enumerable: true, get: function () { return index_js_15.processBboData; } });
var index_js_16 = require("./utils/index.cjs");
Object.defineProperty(exports, "createErrorResult", { enumerable: true, get: function () { return index_js_16.createErrorResult; } });
Object.defineProperty(exports, "validateWithdrawalParams", { enumerable: true, get: function () { return index_js_16.validateWithdrawalParams; } });
Object.defineProperty(exports, "validateDepositParams", { enumerable: true, get: function () { return index_js_16.validateDepositParams; } });
Object.defineProperty(exports, "validateAssetSupport", { enumerable: true, get: function () { return index_js_16.validateAssetSupport; } });
Object.defineProperty(exports, "validateBalance", { enumerable: true, get: function () { return index_js_16.validateBalance; } });
Object.defineProperty(exports, "applyPathFilters", { enumerable: true, get: function () { return index_js_16.applyPathFilters; } });
Object.defineProperty(exports, "getSupportedPaths", { enumerable: true, get: function () { return index_js_16.getSupportedPaths; } });
Object.defineProperty(exports, "getMaxOrderValue", { enumerable: true, get: function () { return index_js_16.getMaxOrderValue; } });
Object.defineProperty(exports, "validateOrderParams", { enumerable: true, get: function () { return index_js_16.validateOrderParams; } });
Object.defineProperty(exports, "validateCoinExists", { enumerable: true, get: function () { return index_js_16.validateCoinExists; } });
var index_js_17 = require("./utils/index.cjs");
Object.defineProperty(exports, "TRIGGER_ORDER_TYPES", { enumerable: true, get: function () { return index_js_17.TRIGGER_ORDER_TYPES; } });
Object.defineProperty(exports, "STRATEGY_ORDER_TYPES", { enumerable: true, get: function () { return index_js_17.STRATEGY_ORDER_TYPES; } });
Object.defineProperty(exports, "SCALE_ORDER_COUNT", { enumerable: true, get: function () { return index_js_17.SCALE_ORDER_COUNT; } });
Object.defineProperty(exports, "isTriggerOrderType", { enumerable: true, get: function () { return index_js_17.isTriggerOrderType; } });
Object.defineProperty(exports, "isStrategyOrderType", { enumerable: true, get: function () { return index_js_17.isStrategyOrderType; } });
Object.defineProperty(exports, "isLimitExecutionOrderType", { enumerable: true, get: function () { return index_js_17.isLimitExecutionOrderType; } });
Object.defineProperty(exports, "getTriggerExecution", { enumerable: true, get: function () { return index_js_17.getTriggerExecution; } });
Object.defineProperty(exports, "getTriggerDirection", { enumerable: true, get: function () { return index_js_17.getTriggerDirection; } });
Object.defineProperty(exports, "buildTriggerOrderType", { enumerable: true, get: function () { return index_js_17.buildTriggerOrderType; } });
Object.defineProperty(exports, "buildPositionTriggerOrderFromOrder", { enumerable: true, get: function () { return index_js_17.buildPositionTriggerOrderFromOrder; } });
Object.defineProperty(exports, "computeScalePriceLadder", { enumerable: true, get: function () { return index_js_17.computeScalePriceLadder; } });
Object.defineProperty(exports, "computeChaseQuotePrice", { enumerable: true, get: function () { return index_js_17.computeChaseQuotePrice; } });
Object.defineProperty(exports, "getPriceTick", { enumerable: true, get: function () { return index_js_17.getPriceTick; } });
Object.defineProperty(exports, "splitScaleSizes", { enumerable: true, get: function () { return index_js_17.splitScaleSizes; } });
var index_js_18 = require("./utils/index.cjs");
Object.defineProperty(exports, "adaptTriggerOrderTypeFromSDK", { enumerable: true, get: function () { return index_js_18.adaptTriggerOrderTypeFromSDK; } });
Object.defineProperty(exports, "adaptPositionTriggerOrderFromSDK", { enumerable: true, get: function () { return index_js_18.adaptPositionTriggerOrderFromSDK; } });
Object.defineProperty(exports, "adaptTpslLinkageToGrouping", { enumerable: true, get: function () { return index_js_18.adaptTpslLinkageToGrouping; } });
var index_js_19 = require("./utils/index.cjs");
Object.defineProperty(exports, "generatePerpsId", { enumerable: true, get: function () { return index_js_19.generatePerpsId; } });
Object.defineProperty(exports, "generateDepositId", { enumerable: true, get: function () { return index_js_19.generateDepositId; } });
Object.defineProperty(exports, "generateWithdrawalId", { enumerable: true, get: function () { return index_js_19.generateWithdrawalId; } });
Object.defineProperty(exports, "generateOrderId", { enumerable: true, get: function () { return index_js_19.generateOrderId; } });
Object.defineProperty(exports, "generateTransactionId", { enumerable: true, get: function () { return index_js_19.generateTransactionId; } });
var index_js_20 = require("./utils/index.cjs");
Object.defineProperty(exports, "calculateOpenInterestUSD", { enumerable: true, get: function () { return index_js_20.calculateOpenInterestUSD; } });
Object.defineProperty(exports, "isMarketTradable", { enumerable: true, get: function () { return index_js_20.isMarketTradable; } });
Object.defineProperty(exports, "transformMarketData", { enumerable: true, get: function () { return index_js_20.transformMarketData; } });
Object.defineProperty(exports, "formatChange", { enumerable: true, get: function () { return index_js_20.formatChange; } });
var perpsConnectionAttemptContext_js_1 = require("./utils/perpsConnectionAttemptContext.cjs");
Object.defineProperty(exports, "getPerpsConnectionAttemptContext", { enumerable: true, get: function () { return perpsConnectionAttemptContext_js_1.getPerpsConnectionAttemptContext; } });
Object.defineProperty(exports, "withPerpsConnectionAttemptContext", { enumerable: true, get: function () { return perpsConnectionAttemptContext_js_1.withPerpsConnectionAttemptContext; } });
var index_js_21 = require("./utils/index.cjs");
Object.defineProperty(exports, "MAX_MARKET_PATTERN_LENGTH", { enumerable: true, get: function () { return index_js_21.MAX_MARKET_PATTERN_LENGTH; } });
Object.defineProperty(exports, "escapeRegex", { enumerable: true, get: function () { return index_js_21.escapeRegex; } });
Object.defineProperty(exports, "validateMarketPattern", { enumerable: true, get: function () { return index_js_21.validateMarketPattern; } });
Object.defineProperty(exports, "compileMarketPattern", { enumerable: true, get: function () { return index_js_21.compileMarketPattern; } });
Object.defineProperty(exports, "matchesMarketPattern", { enumerable: true, get: function () { return index_js_21.matchesMarketPattern; } });
Object.defineProperty(exports, "shouldIncludeMarket", { enumerable: true, get: function () { return index_js_21.shouldIncludeMarket; } });
Object.defineProperty(exports, "getPerpsDisplaySymbol", { enumerable: true, get: function () { return index_js_21.getPerpsDisplaySymbol; } });
Object.defineProperty(exports, "getPerpsDexFromSymbol", { enumerable: true, get: function () { return index_js_21.getPerpsDexFromSymbol; } });
Object.defineProperty(exports, "calculateFundingCountdown", { enumerable: true, get: function () { return index_js_21.calculateFundingCountdown; } });
Object.defineProperty(exports, "calculate24hHighLow", { enumerable: true, get: function () { return index_js_21.calculate24hHighLow; } });
Object.defineProperty(exports, "filterMarketsByQuery", { enumerable: true, get: function () { return index_js_21.filterMarketsByQuery; } });
Object.defineProperty(exports, "matchesCategory", { enumerable: true, get: function () { return index_js_21.matchesCategory; } });
Object.defineProperty(exports, "getMarketTypeFilter", { enumerable: true, get: function () { return index_js_21.getMarketTypeFilter; } });
Object.defineProperty(exports, "applyMarketFilters", { enumerable: true, get: function () { return index_js_21.applyMarketFilters; } });
Object.defineProperty(exports, "isHip3Market", { enumerable: true, get: function () { return index_js_21.isHip3Market; } });
Object.defineProperty(exports, "rankMarketsByQuery", { enumerable: true, get: function () { return index_js_21.rankMarketsByQuery; } });
Object.defineProperty(exports, "getMarketMatchRank", { enumerable: true, get: function () { return index_js_21.getMarketMatchRank; } });
var index_js_22 = require("./utils/index.cjs");
Object.defineProperty(exports, "MarketMatchRank", { enumerable: true, get: function () { return index_js_22.MarketMatchRank; } });
var index_js_23 = require("./utils/index.cjs");
Object.defineProperty(exports, "calculatePositionSize", { enumerable: true, get: function () { return index_js_23.calculatePositionSize; } });
Object.defineProperty(exports, "calculateMarginRequired", { enumerable: true, get: function () { return index_js_23.calculateMarginRequired; } });
Object.defineProperty(exports, "getMaxAllowedAmount", { enumerable: true, get: function () { return index_js_23.getMaxAllowedAmount; } });
Object.defineProperty(exports, "calculateFinalPositionSize", { enumerable: true, get: function () { return index_js_23.calculateFinalPositionSize; } });
Object.defineProperty(exports, "calculateOrderPriceAndSize", { enumerable: true, get: function () { return index_js_23.calculateOrderPriceAndSize; } });
Object.defineProperty(exports, "buildOrdersArray", { enumerable: true, get: function () { return index_js_23.buildOrdersArray; } });
var index_js_24 = require("./utils/index.cjs");
Object.defineProperty(exports, "formatAccountToCaipAccountId", { enumerable: true, get: function () { return index_js_24.formatAccountToCaipAccountId; } });
Object.defineProperty(exports, "isCaipAccountId", { enumerable: true, get: function () { return index_js_24.isCaipAccountId; } });
Object.defineProperty(exports, "handleRewardsError", { enumerable: true, get: function () { return index_js_24.handleRewardsError; } });
var index_js_25 = require("./utils/index.cjs");
Object.defineProperty(exports, "countSignificantFigures", { enumerable: true, get: function () { return index_js_25.countSignificantFigures; } });
Object.defineProperty(exports, "hasExceededSignificantFigures", { enumerable: true, get: function () { return index_js_25.hasExceededSignificantFigures; } });
Object.defineProperty(exports, "roundToSignificantFigures", { enumerable: true, get: function () { return index_js_25.roundToSignificantFigures; } });
var index_js_26 = require("./utils/index.cjs");
Object.defineProperty(exports, "parseVolume", { enumerable: true, get: function () { return index_js_26.parseVolume; } });
Object.defineProperty(exports, "sortMarkets", { enumerable: true, get: function () { return index_js_26.sortMarkets; } });
var index_js_27 = require("./utils/index.cjs");
Object.defineProperty(exports, "createStandaloneInfoClient", { enumerable: true, get: function () { return index_js_27.createStandaloneInfoClient; } });
Object.defineProperty(exports, "queryStandaloneClearinghouseStates", { enumerable: true, get: function () { return index_js_27.queryStandaloneClearinghouseStates; } });
Object.defineProperty(exports, "queryStandaloneOpenOrders", { enumerable: true, get: function () { return index_js_27.queryStandaloneOpenOrders; } });
var index_js_28 = require("./utils/index.cjs");
Object.defineProperty(exports, "stripQuotes", { enumerable: true, get: function () { return index_js_28.stripQuotes; } });
Object.defineProperty(exports, "parseCommaSeparatedString", { enumerable: true, get: function () { return index_js_28.parseCommaSeparatedString; } });
var index_js_29 = require("./utils/index.cjs");
Object.defineProperty(exports, "generateERC20TransferData", { enumerable: true, get: function () { return index_js_29.generateERC20TransferData; } });
var index_js_30 = require("./utils/index.cjs");
Object.defineProperty(exports, "wait", { enumerable: true, get: function () { return index_js_30.wait; } });
var index_js_31 = require("./utils/index.cjs");
Object.defineProperty(exports, "adaptOrderToSDK", { enumerable: true, get: function () { return index_js_31.adaptOrderToSDK; } });
Object.defineProperty(exports, "adaptPositionFromSDK", { enumerable: true, get: function () { return index_js_31.adaptPositionFromSDK; } });
Object.defineProperty(exports, "adaptOrderFromSDK", { enumerable: true, get: function () { return index_js_31.adaptOrderFromSDK; } });
Object.defineProperty(exports, "adaptMarketFromSDK", { enumerable: true, get: function () { return index_js_31.adaptMarketFromSDK; } });
Object.defineProperty(exports, "adaptAccountStateFromSDK", { enumerable: true, get: function () { return index_js_31.adaptAccountStateFromSDK; } });
Object.defineProperty(exports, "buildAssetMapping", { enumerable: true, get: function () { return index_js_31.buildAssetMapping; } });
Object.defineProperty(exports, "formatHyperLiquidPrice", { enumerable: true, get: function () { return index_js_31.formatHyperLiquidPrice; } });
Object.defineProperty(exports, "formatHyperLiquidSize", { enumerable: true, get: function () { return index_js_31.formatHyperLiquidSize; } });
Object.defineProperty(exports, "calculateHip3AssetId", { enumerable: true, get: function () { return index_js_31.calculateHip3AssetId; } });
Object.defineProperty(exports, "parseAssetName", { enumerable: true, get: function () { return index_js_31.parseAssetName; } });
Object.defineProperty(exports, "adaptHyperLiquidLedgerUpdateToUserHistoryItem", { enumerable: true, get: function () { return index_js_31.adaptHyperLiquidLedgerUpdateToUserHistoryItem; } });
var index_js_32 = require("./utils/index.cjs");
Object.defineProperty(exports, "getEnvironment", { enumerable: true, get: function () { return index_js_32.getEnvironment; } });
var index_js_33 = require("./utils/index.cjs");
Object.defineProperty(exports, "PRICE_THRESHOLD", { enumerable: true, get: function () { return index_js_33.PRICE_THRESHOLD; } });
Object.defineProperty(exports, "formatWithSignificantDigits", { enumerable: true, get: function () { return index_js_33.formatWithSignificantDigits; } });
Object.defineProperty(exports, "PRICE_RANGES_MINIMAL_VIEW", { enumerable: true, get: function () { return index_js_33.PRICE_RANGES_MINIMAL_VIEW; } });
Object.defineProperty(exports, "PRICE_RANGES_UNIVERSAL", { enumerable: true, get: function () { return index_js_33.PRICE_RANGES_UNIVERSAL; } });
Object.defineProperty(exports, "formatPerpsFiat", { enumerable: true, get: function () { return index_js_33.formatPerpsFiat; } });
Object.defineProperty(exports, "formatPositionSize", { enumerable: true, get: function () { return index_js_33.formatPositionSize; } });
Object.defineProperty(exports, "formatPnl", { enumerable: true, get: function () { return index_js_33.formatPnl; } });
Object.defineProperty(exports, "formatPercentage", { enumerable: true, get: function () { return index_js_33.formatPercentage; } });
Object.defineProperty(exports, "formatFundingRate", { enumerable: true, get: function () { return index_js_33.formatFundingRate; } });
// Error codes (explicit named exports)
var perpsErrorCodes_js_1 = require("./perpsErrorCodes.cjs");
Object.defineProperty(exports, "PERPS_ERROR_CODES", { enumerable: true, get: function () { return perpsErrorCodes_js_1.PERPS_ERROR_CODES; } });
// Selectors (explicit named exports)
var selectors_js_1 = require("./selectors.cjs");
Object.defineProperty(exports, "selectIsFirstTimeUser", { enumerable: true, get: function () { return selectors_js_1.selectIsFirstTimeUser; } });
Object.defineProperty(exports, "selectHasPlacedFirstOrder", { enumerable: true, get: function () { return selectors_js_1.selectHasPlacedFirstOrder; } });
Object.defineProperty(exports, "selectWatchlistMarkets", { enumerable: true, get: function () { return selectors_js_1.selectWatchlistMarkets; } });
Object.defineProperty(exports, "selectIsWatchlistMarket", { enumerable: true, get: function () { return selectors_js_1.selectIsWatchlistMarket; } });
Object.defineProperty(exports, "selectRecentlyViewedMarkets", { enumerable: true, get: function () { return selectors_js_1.selectRecentlyViewedMarkets; } });
Object.defineProperty(exports, "selectTradeConfiguration", { enumerable: true, get: function () { return selectors_js_1.selectTradeConfiguration; } });
Object.defineProperty(exports, "selectPendingTradeConfiguration", { enumerable: true, get: function () { return selectors_js_1.selectPendingTradeConfiguration; } });
Object.defineProperty(exports, "selectMarketFilterPreferences", { enumerable: true, get: function () { return selectors_js_1.selectMarketFilterPreferences; } });
Object.defineProperty(exports, "selectOrderBookGrouping", { enumerable: true, get: function () { return selectors_js_1.selectOrderBookGrouping; } });
Object.defineProperty(exports, "selectProLayoutPreferences", { enumerable: true, get: function () { return selectors_js_1.selectProLayoutPreferences; } });
Object.defineProperty(exports, "selectPerpsMode", { enumerable: true, get: function () { return selectors_js_1.selectPerpsMode; } });
// Services (only externally consumed items)
var TradingReadinessCache_js_1 = require("./services/TradingReadinessCache.cjs");
Object.defineProperty(exports, "TradingReadinessCache", { enumerable: true, get: function () { return TradingReadinessCache_js_1.TradingReadinessCache; } });
var AggregatedOrderBookConnection_js_1 = require("./services/AggregatedOrderBookConnection.cjs");
Object.defineProperty(exports, "AggregatedOrderBookConnection", { enumerable: true, get: function () { return AggregatedOrderBookConnection_js_1.AggregatedOrderBookConnection; } });
Object.defineProperty(exports, "processAggregatedOrderBook", { enumerable: true, get: function () { return AggregatedOrderBookConnection_js_1.processAggregatedOrderBook; } });
// Removed with Live Market Prices component:
// - usePerpsPrices
//# sourceMappingURL=index.cjs.map