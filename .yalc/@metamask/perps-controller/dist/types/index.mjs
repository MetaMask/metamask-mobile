import { hasProperty } from "@metamask/utils";
/**
 * Connection states for WebSocket management.
 * Defined inline to avoid importing from Mobile-only services.
 * Must stay in sync with HyperLiquidClientService.WebSocketConnectionState.
 */
export var WebSocketConnectionState;
(function (WebSocketConnectionState) {
    WebSocketConnectionState["Disconnected"] = "disconnected";
    WebSocketConnectionState["Connecting"] = "connecting";
    WebSocketConnectionState["Connected"] = "connected";
    WebSocketConnectionState["Disconnecting"] = "disconnecting";
})(WebSocketConnectionState || (WebSocketConnectionState = {}));
// Market asset type classification (reusable across components)
export var MarketCategory;
(function (MarketCategory) {
    MarketCategory["CryptoCurrency"] = "crypto";
    MarketCategory["Stock"] = "stock";
    MarketCategory["PreIpo"] = "pre-ipo";
    MarketCategory["Index"] = "index";
    MarketCategory["Etf"] = "etf";
    MarketCategory["Commodity"] = "commodity";
    MarketCategory["Forex"] = "forex";
})(MarketCategory || (MarketCategory = {}));
/**
 * Ordered list of the 7 data-model market categories for UI pills.
 * Does not include the 'all' or 'new' sentinel values — those are applied
 * via dedicated UI controls, not the category pills.
 * Kept in sync with {@link MarketTypeFilter} via `satisfies`.
 */
export const MARKET_CATEGORIES = [
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
export var PerpsAnalyticsEvent;
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
})(PerpsAnalyticsEvent || (PerpsAnalyticsEvent = {}));
/**
 * Perps trace name constants. Values match TraceName enum in mobile.
 * When in core, these ARE the source of truth - mobile will re-export from core.
 */
export const PerpsTraceNames = {
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
export const PerpsTraceOperations = {
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
export function isVersionGatedFeatureFlag(value) {
    return (typeof value === 'object' &&
        value !== null &&
        hasProperty(value, 'enabled') &&
        hasProperty(value, 'minimumVersion') &&
        typeof value.enabled === 'boolean' &&
        typeof value.minimumVersion === 'string');
}
export * from "./transactionTypes.mjs";
//# sourceMappingURL=index.mjs.map