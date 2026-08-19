/**
 * Perps feature constants - Controller layer (portable)
 *
 * This file contains only controller-portable configuration:
 * - Constants used by controller logic, providers, and services
 * - Calculation thresholds, API configs, and protocol constants
 *
 * UI-only constants (layout, display, navigation) live in:
 * app/components/UI/Perps/constants/perpsConfig.ts
 */
export declare const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export declare const ZERO_BALANCE = "0x0";
export declare const PERPS_CONSTANTS: {
    readonly FeatureFlagKey: "perpsEnabled";
    readonly FeatureName: "perps";
    /** Token description used to identify the synthetic "Perps balance" option in pay-with token lists */
    readonly PerpsBalanceTokenDescription: "perps-balance";
    /** Symbol displayed for the synthetic "Perps balance" token in pay-with token lists */
    readonly PerpsBalanceTokenSymbol: "USD";
    readonly WebsocketTimeout: 5000;
    readonly WebsocketCleanupDelay: 1000;
    readonly BackgroundDisconnectDelay: 20000;
    readonly ConnectionTimeoutMs: 10000;
    readonly DefaultMonitoringTimeoutMs: 10000;
    readonly ConnectionGracePeriodMs: 20000;
    readonly ConnectionAttemptTimeoutMs: 30000;
    readonly WebsocketPingTimeoutMs: 5000;
    readonly ConnectRetryDelayMs: 200;
    readonly ForegroundPingRetryDelayMs: 500;
    readonly ReconnectionCleanupDelayMs: 500;
    readonly ReconnectionDelayAndroidMs: 300;
    readonly ReconnectionDelayIosMs: 100;
    readonly ReconnectionRetryDelayMs: 5000;
    readonly NetworkRestoreMaxRetries: 8;
    readonly NetworkRestoreRetryBaseMs: 1500;
    readonly BalanceUpdateThrottleMs: 15000;
    readonly InitialDataDelayMs: 100;
    readonly PlaceOrderTimeoutMs: 60000;
    readonly DepositTakingLongerToastDelayMs: 30000;
    readonly DefaultAssetPreviewLimit: 5;
    readonly DefaultMaxLeverage: number;
    readonly FallbackPriceDisplay: "$---";
    readonly FallbackPercentageDisplay: "--%";
    readonly FallbackDataDisplay: "--";
    readonly ZeroAmountDisplay: "$0";
    readonly ZeroAmountDetailedDisplay: "$0.00";
    readonly RecentActivityLimit: 3;
    readonly FillsLookbackMs: number;
    readonly RecentlyViewedMarketsTtlMs: number;
    readonly RecentlyViewedMarketsLimit: 10;
};
/**
 * Withdrawal-specific constants (protocol-agnostic)
 * Note: Protocol-specific values like estimated time should be defined in each protocol's config
 */
export declare const WITHDRAWAL_CONSTANTS: {
    readonly DefaultMinAmount: "1.01";
    readonly DefaultFeeAmount: 1;
    readonly DefaultFeeToken: "USDC";
};
/**
 * Validation thresholds for UI warnings and checks
 * These values control when warnings are shown to users
 */
export declare const VALIDATION_THRESHOLDS: {
    readonly HighLeverageWarning: 20;
    readonly LimitPriceDifferenceWarning: 0.1;
    readonly PriceDeviation: 0.1;
};
/**
 * Order slippage configuration
 * Controls default slippage tolerance for different order types
 * Conservative defaults based on HyperLiquid platform interface
 * See: docs/perps/hyperliquid/ORDER-MATCHING-ERRORS.md
 */
export declare const ORDER_SLIPPAGE_CONFIG: {
    readonly DefaultMarketSlippageBps: 300;
    readonly DefaultTpslSlippageBps: 1000;
    readonly DefaultLimitSlippageBps: 100;
};
/**
 * Defaults and bounds for the emulated `chase` placement.
 *
 * No supported venue exposes a chase as an API action — HyperLiquid documents it
 * as running client-side — so the strategy is run here: a post-only order rests
 * one tick inside the spread and is cancelled and re-placed as the touch moves.
 * The poll floor and the repricing cap exist to keep a chase from turning into a
 * cancel/replace loop against a venue's rate limits. Protocol-agnostic — a
 * provider that gains a native chase ignores these entirely.
 */
export declare const CHASE_ORDER_CONFIG: {
    /** How often the touch is re-read when the caller does not say. */
    readonly DefaultIntervalMs: 3000;
    /** Floor on the poll interval, whatever the caller asks for. */
    readonly MinIntervalMs: 1000;
    /** How long a chase runs before it stops re-pricing and rests. */
    readonly DefaultMaxDurationMs: 60000;
    /** How many cancel/replace cycles a single chase may perform. */
    readonly DefaultMaxRepricings: 20;
    /**
     * How many chases may run at once.
     *
     * HyperLiquid documents a cap of five simultaneously active chase orders. It
     * is a venue rule rather than controller policy, but it is spelled here
     * alongside the rest of the chase configuration because an emulated chase is
     * the only thing that can enforce it.
     */
    readonly MaxActiveSessions: 5;
};
/**
 * Bounds and step for the user-configurable max slippage preference (basis points).
 * Shared by the controller (`setMaxSlippage`) and UI (`slippageConfig.ts`).
 */
export declare const MAX_SLIPPAGE_BOUNDS: {
    readonly MinBps: 10;
    readonly MaxBps: 1000;
    readonly StepBps: 10;
};
/**
 * Max order amount buffer to reduce "Insufficient margin" rejections from the exchange.
 * When the user selects 100% (slider or Max), we cap the order at (1 - this) of the
 * theoretical max so that fees, rounding, and exchange-side margin checks are covered.
 * Value as decimal (e.g. 0.005 = 0.5%).
 */
export declare const MAX_ORDER_MARGIN_BUFFER = 0.005;
/**
 * Performance optimization constants
 * These values control debouncing and throttling for better performance
 */
export declare const PERFORMANCE_CONFIG: {
    readonly PriceUpdateDebounceMs: 1000;
    readonly ValidationDebounceMs: 300;
    readonly LiquidationPriceDebounceMs: 500;
    readonly CandleConnectDebounceMs: 500;
    readonly SlippageEstimateThrottleMs: 250;
    readonly SlippageEstimateBookLevels: 10;
    readonly CandleTeardownDelayMs: 150;
    readonly PerpsRestCoalesceTtlMs: 60000;
    readonly PerpsCandleCoalesceTtlMs: 30000;
    readonly NavigationParamsDelayMs: 200;
    readonly TabControlResetDelayMs: 500;
    readonly MarketDataCacheDurationMs: number;
    readonly AssetMetadataCacheDurationMs: number;
    readonly MaxLeverageCacheDurationMs: number;
    readonly FeeDiscountCacheDurationMs: number;
    readonly PointsCalculationCacheDurationMs: number;
    /**
     * Performance logging markers for filtering logs during development and debugging
     * These markers help isolate performance-related logs from general application logs
     * Usage: Use in DevLogger calls to easily filter specific performance areas
     * Impact: Development only (uses DevLogger) - zero production performance cost
     *
     * Examples:
     * - Filter Sentry performance logs: `adb logcat | grep PERPSMARK_SENTRY`
     * - Filter MetaMetrics events: `adb logcat | grep PERPSMARK_METRICS`
     * - Filter WebSocket performance: `adb logcat | grep PERPSMARK_WS`
     * - Filter all Perps performance: `adb logcat | grep PERPSMARK_`
     */
    readonly LoggingMarkers: {
        readonly SentryPerformance: "PERPSMARK_SENTRY";
        readonly MetametricsEvents: "PERPSMARK_METRICS";
        readonly WebsocketPerformance: "PERPSMARK_SENTRY_WS";
    };
};
export declare const TP_SL_CONFIG: {
    readonly UsePositionBoundTpsl: true;
};
/**
 * Bounds applied to a HyperLiquid TWAP placement.
 *
 * The pinned HyperLiquid SDK (0.33.1) validates the TWAP duration as a safe
 * integer in `[5, 1440]` before signing, although the venue currently documents
 * a maximum of seven days (`10080` minutes). The controller exposes the SDK's
 * narrower cap until that dependency supports the venue limit, avoiding an
 * opaque SDK error. `MinNotionalUsd` is the venue's documented minimum *total*
 * order size for a TWAP, which it enforces instead of the per-order minimum —
 * its suborders are its own business.
 *
 * Carries the venue prefix, like `HYPERLIQUID_ORDER_LIMITS`, because these are
 * venue/SDK constraints rather than controller policy.
 *
 * From: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/order-types
 */
export declare const HYPERLIQUID_TWAP_LIMITS: {
    readonly MinDurationMinutes: 5;
    readonly MaxDurationMinutes: 1440;
    readonly MinNotionalUsd: 100;
};
/**
 * HyperLiquid order limits based on leverage
 * From: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/contract-specifications
 */
export declare const HYPERLIQUID_ORDER_LIMITS: {
    readonly MarketOrderLimits: {
        readonly HighLeverage: 15000000;
        readonly MediumHighLeverage: 5000000;
        readonly MediumLeverage: 2000000;
        readonly LowLeverage: 500000;
    };
    readonly LimitOrderMultiplier: 10;
};
/**
 * Close position configuration
 * Controls behavior and constants specific to position closing
 */
export declare const CLOSE_POSITION_CONFIG: {
    readonly UsdDecimalPlaces: 2;
    readonly DefaultClosePercentage: 100;
    readonly AmountCalculationPrecision: 6;
    readonly PriceThrottleMs: 3000;
    readonly FallbackTokenDecimals: 18;
};
/**
 * Margin adjustment configuration
 * Controls behavior for adding/removing margin from positions
 */
export declare const MARGIN_ADJUSTMENT_CONFIG: {
    readonly LiquidationRiskThreshold: 1.2;
    readonly LiquidationWarningThreshold: 1.5;
    readonly MinAdjustmentAmount: 1;
    readonly CalculationPrecision: 6;
    readonly MarginRemovalSafetyBuffer: 0.1;
    readonly FallbackMaxLeverage: 50;
};
/**
 * Data Lake API configuration
 * Endpoints for reporting perps trading activity for notifications
 */
export declare const DATA_LAKE_API_CONFIG: {
    readonly OrdersEndpoint: "https://perps.api.cx.metamask.io/api/v1/orders";
};
/**
 * Subscription benefits cache (stale-while-revalidate).
 *
 * The unified fee resolver never awaits the benefits read, so these bounds are
 * what decide whether the cached snapshot may grant the perps fee waiver:
 * - within `FreshMs` the snapshot is served as-is,
 * - past `FreshMs` it is still served while a background refresh runs,
 * - past `MaxStaleMs` it is no longer trusted to grant the waiver, and the
 *   resolver falls back to the next-lowest fee source.
 */
export declare const SUBSCRIPTION_BENEFITS_CACHE: {
    readonly FreshMs: 60000;
    readonly MaxStaleMs: number;
};
/**
 * Terminal API configuration.
 * The full endpoint URL is injected at runtime via
 * `PerpsPlatformDependencies.terminalApi.marketDataUrl` from each client build
 * (dev/uat/prd); only cache settings live here.
 */
export declare const TERMINAL_API_CONFIG: {
    readonly CacheTtlMs: number;
    readonly FetchTimeoutMs: 10000;
};
/**
 * Decimal precision configuration
 * Controls maximum decimal places for price and input validation
 */
export declare const DECIMAL_PRECISION_CONFIG: {
    readonly MaxPriceDecimals: 6;
    readonly MaxSignificantFigures: 5;
    readonly FallbackSizeDecimals: 6;
};
/**
 * Market sorting configuration
 * Controls sorting behavior and presets for the trending markets view
 */
export declare const MARKET_SORTING_CONFIG: {
    readonly DefaultSortOptionId: "volume";
    readonly DefaultDirection: "desc";
    readonly SortFields: {
        readonly Volume: "volume";
        readonly PriceChange: "priceChange";
        readonly OpenInterest: "openInterest";
        readonly FundingRate: "fundingRate";
    };
    readonly SortButtonPresets: readonly [{
        readonly field: "volume";
        readonly labelKey: "perps.sort.volume";
    }, {
        readonly field: "priceChange";
        readonly labelKey: "perps.sort.price_change";
    }, {
        readonly field: "fundingRate";
        readonly labelKey: "perps.sort.funding_rate";
    }];
    readonly SortOptions: readonly [{
        readonly id: "volume";
        readonly labelKey: "perps.sort.volume";
        readonly field: "volume";
        readonly direction: "desc";
    }, {
        readonly id: "priceChange";
        readonly labelKey: "perps.sort.price_change";
        readonly field: "priceChange";
        readonly direction: "desc";
    }, {
        readonly id: "openInterest";
        readonly labelKey: "perps.sort.open_interest";
        readonly field: "openInterest";
        readonly direction: "desc";
    }, {
        readonly id: "fundingRate";
        readonly labelKey: "perps.sort.funding_rate";
        readonly field: "fundingRate";
        readonly direction: "desc";
    }];
};
/**
 * Type for valid sort option IDs
 * Derived from SORT_OPTIONS to ensure type safety
 * Valid values: 'volume' | 'priceChange' | 'openInterest' | 'fundingRate'
 */
export type SortOptionId = (typeof MARKET_SORTING_CONFIG.SortOptions)[number]['id'];
/**
 * Perps interface mode.
 *
 * `Lite` is the simplified default experience; `Pro` exposes the advanced
 * trading layout (chart, order book, inline order form).
 */
export declare enum PerpsMode {
    Lite = "lite",
    Pro = "pro"
}
/**
 * Side filter for the Pro Positions list (long/short/all).
 *
 * Independent of `ordersSideFilter`. Shared across markets via
 * `proLayoutPreferences.positionsSideFilter`.
 */
export type ProPositionsSideFilter = 'all' | 'long' | 'short';
/**
 * Sort fields available on the Pro Positions list.
 */
export type ProPositionsSortField = 'positionValue' | 'unrealizedPnl' | 'fundingRate';
/**
 * Sort direction for the Pro Positions list.
 */
export type ProPositionsSortDirection = 'asc' | 'desc';
/**
 * Side filter for the Pro Orders list (long/short/all).
 *
 * Independent of `positionsSideFilter`. Shared across markets via
 * `proLayoutPreferences.ordersSideFilter`.
 */
export type ProOrdersSideFilter = 'all' | 'long' | 'short';
/**
 * Sort fields available on the Pro Orders list.
 */
export type ProOrdersSortField = 'orderValue' | 'size' | 'price' | 'time';
/**
 * Sort direction for the Pro Orders list.
 */
export type ProOrdersSortDirection = 'asc' | 'desc';
/**
 * Pro-mode layout preferences (network-independent).
 *
 * Flat object that persists across markets (unlike the per-market
 * `tradeConfigurations`). `chartExpanded` and the `*Position` fields are
 * reserved for future container-position UI. Positions and Orders each have
 * their own side filter and sort so they survive market navigation and app
 * restarts independently.
 */
export type ProLayoutPreferences = {
    orderBookExpanded: boolean;
    chartExpanded: boolean;
    orderBookPosition: 'left' | 'right';
    orderFormPosition: 'left' | 'right';
    positionsSideFilter: ProPositionsSideFilter;
    positionsSortField: ProPositionsSortField;
    positionsSortDirection: ProPositionsSortDirection;
    ordersSideFilter: ProOrdersSideFilter;
    ordersSortField: ProOrdersSortField;
    ordersSortDirection: ProOrdersSortDirection;
};
/**
 * Default pro-mode layout preferences.
 *
 * Shared by `getDefaultPerpsControllerState()`, the controller getter, and the
 * selector so callers always receive a fully-populated object even when the
 * persisted state predates this field.
 */
export declare const DEFAULT_PRO_LAYOUT_PREFERENCES: ProLayoutPreferences;
/**
 * Default Perps interface mode.
 */
export declare const DEFAULT_PERPS_MODE: PerpsMode;
/**
 * Funding rate display configuration
 * Controls how funding rates are formatted and displayed
 */
export declare const FUNDING_RATE_CONFIG: {
    readonly Decimals: 4;
    readonly ZeroDisplay: "0.0000%";
    readonly PercentageMultiplier: 100;
};
/**
 * Provider configuration for multi-provider support
 */
export declare const PROVIDER_CONFIG: {
    /** Default perpetual DEX provider when no explicit selection exists */
    readonly DefaultProvider: "hyperliquid";
    /** Force MYX to testnet only (mainnet credentials not yet available) */
    readonly MYX_TESTNET_ONLY: false;
    /**
     * Force Lighter to testnet only. Off: Lighter follows the global network
     * toggle so mainnet reads (full market catalog, prices, candles) work;
     * every nonce-consuming write is refused on mainnet by the gate at the
     * top of LighterProvider's venue write lock until mainnet trading is
     * validated end-to-end.
     */
    readonly LIGHTER_TESTNET_ONLY: false;
};
export declare const PERPS_DISK_CACHE_MARKETS = "PERPS_DISK_CACHE_MARKETS";
export declare const PERPS_DISK_CACHE_USER_DATA = "PERPS_DISK_CACHE_USER_DATA_V2";
export declare const PERPS_DISK_CACHE_THROTTLE_MS = 30000;
/**
 * Minimum interval between WebSocket-triggered HL `userAbstraction`
 * refreshes. Balances picking up HL-web mode flips (Unified ↔ Standard)
 * promptly against burning REST quota on every spot tick. Covers the
 * observed user pattern of flipping mode once per session at most.
 */
export declare const ABSTRACTION_MODE_REFRESH_THROTTLE_MS = 60000;
/**
 * Build the standard provider:network cache key from controller state.
 *
 * @param state - Controller state containing provider and network info.
 * @param state.activeProvider - Active perps provider name.
 * @param state.isTestnet - Whether testnet mode is active.
 * @returns Cache key in the format "provider:mainnet" or "provider:testnet".
 */
export declare function getProviderNetworkKey(state: {
    activeProvider?: string;
    isTestnet?: boolean;
}): string;
/**
 * Build a provider:network cache key for a specific provider id.
 * Accounts for MYX_TESTNET_ONLY: MYX is always on testnet regardless of the
 * global network flag.
 *
 * @param providerId - The provider identifier (e.g. "hyperliquid", "myx").
 * @param isTestnet - Global testnet flag from controller state.
 * @returns Cache key in the format "provider:mainnet" or "provider:testnet".
 */
export declare function buildProviderCacheKey(providerId: string, isTestnet: boolean): string;
//# sourceMappingURL=perpsConfig.d.cts.map