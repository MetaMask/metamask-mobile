"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isVersionGatedFeatureFlag = exports.PerpsTraceOperations = exports.PerpsTraceNames = exports.PerpsAnalyticsEvent = exports.MARKET_CATEGORIES = exports.MarketCategory = exports.WebSocketConnectionState = void 0;
const utils_1 = require("@metamask/utils");
/**
 * Connection states for WebSocket management.
 * Defined inline to avoid importing from Mobile-only services.
 * Must stay in sync with HyperLiquidClientService.WebSocketConnectionState.
 */
var WebSocketConnectionState;
(function (WebSocketConnectionState) {
    WebSocketConnectionState["Disconnected"] = "disconnected";
    WebSocketConnectionState["Connecting"] = "connecting";
    WebSocketConnectionState["Connected"] = "connected";
    WebSocketConnectionState["Disconnecting"] = "disconnecting";
})(WebSocketConnectionState || (exports.WebSocketConnectionState = WebSocketConnectionState = {}));
// Market asset type classification (reusable across components)
var MarketCategory;
(function (MarketCategory) {
    MarketCategory["CryptoCurrency"] = "crypto";
    MarketCategory["Stock"] = "stock";
    MarketCategory["PreIpo"] = "pre-ipo";
    MarketCategory["Index"] = "index";
    MarketCategory["Etf"] = "etf";
    MarketCategory["Commodity"] = "commodity";
    MarketCategory["Forex"] = "forex";
})(MarketCategory || (exports.MarketCategory = MarketCategory = {}));
/**
 * Ordered list of the 7 data-model market categories for UI pills.
 * Does not include the 'all' or 'new' sentinel values — those are applied
 * via dedicated UI controls, not the category pills.
 * Kept in sync with {@link MarketTypeFilter} via `satisfies`.
 */
exports.MARKET_CATEGORIES = [
    'crypto',
    'stock',
    'pre-ipo',
    'index',
    'etf',
    'commodity',
    'forex',
];
/**
 * Analytics events specific to Perps feature.
 * These are the actual event names sent to analytics backend.
 * Values must match the corresponding MetaMetricsEvents values in mobile for compatibility.
 *
 * When migrating to core monorepo, this enum travels with PerpsController.
 */
var PerpsAnalyticsEvent;
(function (PerpsAnalyticsEvent) {
    PerpsAnalyticsEvent["WithdrawalTransaction"] = "Perp Withdrawal Transaction";
    PerpsAnalyticsEvent["TradeTransaction"] = "Perp Trade Transaction";
    PerpsAnalyticsEvent["PositionCloseTransaction"] = "Perp Position Close Transaction";
    PerpsAnalyticsEvent["OrderCancelTransaction"] = "Perp Order Cancel Transaction";
    PerpsAnalyticsEvent["ScreenViewed"] = "Perp Screen Viewed";
    PerpsAnalyticsEvent["UiInteraction"] = "Perp UI Interaction";
    PerpsAnalyticsEvent["RiskManagement"] = "Perp Risk Management";
    PerpsAnalyticsEvent["PerpsError"] = "Perp Error";
    PerpsAnalyticsEvent["AccountSetup"] = "Perp Account Setup";
    // New funnel + search events.
    // Names must match MetaMetrics/Mixpanel exactly; no other event names may be added.
    PerpsAnalyticsEvent["TransactionConsidered"] = "Perp Transaction Considered";
    PerpsAnalyticsEvent["TradeQuoteReceived"] = "Perp Trade Quote Received";
    PerpsAnalyticsEvent["SearchQuery"] = "Perp Search Query";
    PerpsAnalyticsEvent["SearchResultTapped"] = "Perp Search Result Tapped";
    PerpsAnalyticsEvent["SearchAbandoned"] = "Perp Search Abandoned";
})(PerpsAnalyticsEvent || (exports.PerpsAnalyticsEvent = PerpsAnalyticsEvent = {}));
/**
 * Perps trace name constants. Values match TraceName enum in mobile.
 * When in core, these ARE the source of truth - mobile will re-export from core.
 */
exports.PerpsTraceNames = {
    // Trading operations
    PlaceOrder: 'Perps Place Order',
    EditOrder: 'Perps Edit Order',
    CancelOrder: 'Perps Cancel Order',
    ClosePosition: 'Perps Close Position',
    UpdateTpsl: 'Perps Update TP/SL',
    UpdateMargin: 'Perps Update Margin',
    FlipPosition: 'Perps Flip Position',
    // Account operations
    Withdraw: 'Perps Withdraw',
    Deposit: 'Perps Deposit',
    // Market data
    GetPositions: 'Perps Get Positions',
    GetAccountState: 'Perps Get Account State',
    GetMarkets: 'Perps Get Markets',
    GetMarketDataWithPrices: 'Perps Get Market Data With Prices',
    OrderFillsFetch: 'Perps Order Fills Fetch',
    OrdersFetch: 'Perps Orders Fetch',
    FundingFetch: 'Perps Funding Fetch',
    GetHistoricalPortfolio: 'Perps Get Historical Portfolio',
    FetchHistoricalCandles: 'Perps Fetch Historical Candles',
    // Data lake
    DataLakeReport: 'Perps Data Lake Report',
    // WebSocket
    WebsocketConnected: 'Perps WebSocket Connected',
    WebsocketDisconnected: 'Perps WebSocket Disconnected',
    WebsocketFirstPositions: 'Perps WebSocket First Positions',
    WebsocketFirstOrders: 'Perps WebSocket First Orders',
    WebsocketFirstAccount: 'Perps WebSocket First Account',
    // Other
    RewardsApiCall: 'Perps Rewards API Call',
    ConnectionEstablishment: 'Perps Connection Establishment',
    AccountSwitchReconnection: 'Perps Account Switch Reconnection',
    MarketDataPreload: 'Perps Market Data Preload',
    UserDataPreload: 'Perps User Data Preload',
};
/**
 * Perps trace operation constants. Values match TraceOperation enum in mobile.
 * These categorize traces by type of operation for Sentry/observability filtering.
 */
exports.PerpsTraceOperations = {
    Operation: 'perps.operation',
    OrderSubmission: 'perps.order_submission',
    PositionManagement: 'perps.position_management',
    MarketData: 'perps.market_data',
};
/**
 * Type guard for VersionGatedFeatureFlag.
 * Pure logic, no platform dependencies.
 *
 * @param value - The value to check.
 * @returns True if the value is a VersionGatedFeatureFlag.
 */
function isVersionGatedFeatureFlag(value) {
    return (typeof value === 'object' &&
        value !== null &&
        (0, utils_1.hasProperty)(value, 'enabled') &&
        (0, utils_1.hasProperty)(value, 'minimumVersion') &&
        typeof value.enabled === 'boolean' &&
        typeof value.minimumVersion === 'string');
}
exports.isVersionGatedFeatureFlag = isVersionGatedFeatureFlag;
__exportStar(require("./transactionTypes.cjs"), exports);
//# sourceMappingURL=index.cjs.map