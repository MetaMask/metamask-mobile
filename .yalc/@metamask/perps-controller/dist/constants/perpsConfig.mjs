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
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const ZERO_BALANCE = '0x0';
export const PERPS_CONSTANTS = {
    FeatureFlagKey: 'perpsEnabled',
    FeatureName: 'perps', // Constant for Sentry error filtering - enables "feature:perps" dashboard queries
    /** Token description used to identify the synthetic "Perps balance" option in pay-with token lists */
    PerpsBalanceTokenDescription: 'perps-balance',
    /** Symbol displayed for the synthetic "Perps balance" token in pay-with token lists */
    PerpsBalanceTokenSymbol: 'USD',
    WebsocketTimeout: 5000, // 5 seconds
    WebsocketCleanupDelay: 1000, // 1 second
    BackgroundDisconnectDelay: 20000, // 20 seconds delay before disconnecting when app is backgrounded or when user exits perps UX
    ConnectionTimeoutMs: 10000, // 10 seconds timeout for connection and position loading states
    DefaultMonitoringTimeoutMs: 10000, // 10 seconds default timeout for data monitoring operations
    // Connection timing constants
    ConnectionGracePeriodMs: 20000, // 20 seconds grace period before actual disconnection (same as BackgroundDisconnectDelay for semantic clarity)
    ConnectionAttemptTimeoutMs: 30000, // 30 seconds timeout for connection attempts to prevent indefinite hanging
    WebsocketPingTimeoutMs: 5000, // 5 seconds timeout for WebSocket health check ping
    ConnectRetryDelayMs: 200, // Delay before retrying connect() when connection isn't ready yet
    ForegroundPingRetryDelayMs: 500, // Delay before retrying ping in resumeFromForeground — JS thread may be sluggish right after foregrounding
    ReconnectionCleanupDelayMs: 500, // Platform-agnostic delay to ensure WebSocket is ready
    ReconnectionDelayAndroidMs: 300, // Android-specific reconnection delay for better reliability on slower devices
    ReconnectionDelayIosMs: 100, // iOS-specific reconnection delay for optimal performance
    ReconnectionRetryDelayMs: 5000, // 5 seconds delay between reconnection attempts
    NetworkRestoreMaxRetries: 8, // Max retry attempts when reconnecting after WiFi/network restore
    NetworkRestoreRetryBaseMs: 1500, // Base delay (ms) between network restore retries (multiplied by attempt number)
    // Connection manager timing constants
    BalanceUpdateThrottleMs: 15000, // Update at most every 15 seconds to reduce state updates in PerpsConnectionManager
    InitialDataDelayMs: 100, // Delay to allow initial data to load after connection establishment
    // Order submission timing
    PlaceOrderTimeoutMs: 60000, // Hard timeout for provider round-trip in TradingService.placeOrder
    // Deposit toast timing
    DepositTakingLongerToastDelayMs: 30000, // Delay before showing "Deposit taking longer than usual" toast
    DefaultAssetPreviewLimit: 5,
    DefaultMaxLeverage: 3, // Default fallback max leverage when market data is unavailable - conservative default
    FallbackPriceDisplay: '$---', // Display when price data is unavailable
    FallbackPercentageDisplay: '--%', // Display when change data is unavailable
    FallbackDataDisplay: '--', // Display when non-price data is unavailable
    ZeroAmountDisplay: '$0', // Display for zero dollar amounts (e.g., no volume)
    ZeroAmountDetailedDisplay: '$0.00', // Display for zero dollar amounts with decimals
    RecentActivityLimit: 3,
    // Historical data fetching constants
    FillsLookbackMs: 90 * 24 * 60 * 60 * 1000, // 3 months in milliseconds - limits REST API fills fetch
    // Recently viewed markets
    RecentlyViewedMarketsTtlMs: 24 * 60 * 60 * 1000, // 24 hours TTL for recently viewed market entries
    RecentlyViewedMarketsLimit: 10, // Maximum number of recently viewed markets to track
};
/**
 * Withdrawal-specific constants (protocol-agnostic)
 * Note: Protocol-specific values like estimated time should be defined in each protocol's config
 */
export const WITHDRAWAL_CONSTANTS = {
    DefaultMinAmount: '1.01', // Default minimum withdrawal amount in USDC
    DefaultFeeAmount: 1, // Default withdrawal fee in USDC
    DefaultFeeToken: 'USDC', // Default fee token
};
/**
 * Validation thresholds for UI warnings and checks
 * These values control when warnings are shown to users
 */
export const VALIDATION_THRESHOLDS = {
    // Leverage threshold for warning users about high leverage
    HighLeverageWarning: 20, // Show warning when leverage > 20x
    // Limit price difference threshold (as decimal, 0.1 = 10%)
    LimitPriceDifferenceWarning: 0.1, // Warn if limit price differs by >10% from current price
    // Price deviation threshold (as decimal, 0.1 = 10%)
    PriceDeviation: 0.1, // Warn if perps price deviates by >10% from spot price
};
/**
 * Order slippage configuration
 * Controls default slippage tolerance for different order types
 * Conservative defaults based on HyperLiquid platform interface
 * See: docs/perps/hyperliquid/ORDER-MATCHING-ERRORS.md
 */
export const ORDER_SLIPPAGE_CONFIG = {
    // Market order slippage (basis points)
    // 300 basis points = 3% = 0.03 decimal
    // Conservative default for measured rollout, prevents most IOC failures
    DefaultMarketSlippageBps: 300,
    // TP/SL order slippage (basis points)
    // 1000 basis points = 10% = 0.10 decimal
    // Aligns with HyperLiquid platform default for triggered orders
    DefaultTpslSlippageBps: 1000,
    // Limit order slippage (basis points)
    // 100 basis points = 1% = 0.01 decimal
    // Kept conservative as limit orders rest on book (not IOC/immediate execution)
    DefaultLimitSlippageBps: 100,
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
export const CHASE_ORDER_CONFIG = {
    /** How often the touch is re-read when the caller does not say. */
    DefaultIntervalMs: 3000,
    /** Floor on the poll interval, whatever the caller asks for. */
    MinIntervalMs: 1000,
    /** How long a chase runs before it stops re-pricing and rests. */
    DefaultMaxDurationMs: 60000,
    /** How many cancel/replace cycles a single chase may perform. */
    DefaultMaxRepricings: 20,
    /**
     * How many chases may run at once.
     *
     * HyperLiquid documents a cap of five simultaneously active chase orders. It
     * is a venue rule rather than controller policy, but it is spelled here
     * alongside the rest of the chase configuration because an emulated chase is
     * the only thing that can enforce it.
     */
    MaxActiveSessions: 5,
};
/**
 * Bounds and step for the user-configurable max slippage preference (basis points).
 * Shared by the controller (`setMaxSlippage`) and UI (`slippageConfig.ts`).
 */
export const MAX_SLIPPAGE_BOUNDS = {
    MinBps: 10,
    MaxBps: 1000,
    StepBps: 10,
};
/**
 * Max order amount buffer to reduce "Insufficient margin" rejections from the exchange.
 * When the user selects 100% (slider or Max), we cap the order at (1 - this) of the
 * theoretical max so that fees, rounding, and exchange-side margin checks are covered.
 * Value as decimal (e.g. 0.005 = 0.5%).
 */
export const MAX_ORDER_MARGIN_BUFFER = 0.005; // 0.5%
/**
 * Performance optimization constants
 * These values control debouncing and throttling for better performance
 */
export const PERFORMANCE_CONFIG = {
    // Price updates debounce delay (milliseconds)
    // Batches rapid WebSocket price updates to reduce re-renders
    PriceUpdateDebounceMs: 1000,
    // Order validation debounce delay (milliseconds)
    // Prevents excessive validation calls during rapid form input changes
    ValidationDebounceMs: 300,
    // Liquidation price debounce delay (milliseconds)
    // Prevents excessive liquidation price calls during rapid form input changes
    LiquidationPriceDebounceMs: 500,
    // Candle subscription debounce delay (milliseconds)
    // Prevents WS subscription churn during rapid market switching (#28141)
    CandleConnectDebounceMs: 500,
    // Order-form slippage estimate throttle (milliseconds)
    // Updates the estimated-slippage value derived from the live L2 order book
    // no more than once per window. Aggressive enough to keep the row reactive
    // while the user edits the amount, conservative enough to avoid re-render
    // pressure on every book tick.
    SlippageEstimateThrottleMs: 250,
    // Order-book levels sampled when estimating slippage
    // Number of price levels (per side) walked by `calculateEstimatedSlippageBps`
    // to fill the requested USD notional. Matches the L2 sample size used by the
    // order-book panel and is enough depth for the typical order sizes we
    // surface in the order form.
    SlippageEstimateBookLevels: 10,
    // Candle WS teardown delay (milliseconds)
    // When the last subscriber for a cacheKey unsubscribes, wait this long before
    // tearing down the WS. A subsequent subscribe inside the window cancels the
    // teardown so rapid back-and-forth switches do not churn the connection.
    CandleTeardownDelayMs: 150,
    // Perps REST coalesce TTL (milliseconds)
    //
    // Window in which identical GET-style REST calls (getOrderFills, getOrders,
    // getFunding, historicalOrders) share a single in-flight promise / cached
    // result. `forceRefresh` still bypasses the cache end-to-end (hooks →
    // controller → MarketDataService → provider → HyperLiquidClientService), so
    // pull-to-refresh always hits the network.
    //
    // Why 60 s: HyperLiquid's documented rate limit is 1200 weight / IP /
    // rolling 60 s window. Sizing TTL = window length caps each endpoint-per-
    // account at ≤1 REST hit per window under any UI activity pattern — rapid
    // market switching, re-mounts (usePerpsMarketFills, usePerpsTransactionHistory),
    // and multi-tab scans all share a single request. Live fills/orders/prices
    // still flow via WS subscriptions, so REST is seed/backfill only — cache
    // staleness inside the 60 s window is never user-visible.
    PerpsRestCoalesceTtlMs: 60000,
    // Candle snapshot REST coalesce TTL (milliseconds).
    // Longer than PerpsRestCoalesceTtlMs because WS stream keeps live candles
    // fresh — the REST snapshot only seeds the chart on initial subscribe. A
    // 30 s window lets rapid market switching (pass 1 → pass 2 of a stress
    // loop) share the same snapshot per (symbol, interval), cutting
    // candleSnapshot REST weight roughly in half.
    PerpsCandleCoalesceTtlMs: 30000,
    // Navigation params delay (milliseconds)
    // Required for React Navigation to complete state transitions before setting params
    // This ensures navigation context is available when programmatically selecting tabs
    NavigationParamsDelayMs: 200,
    // Tab control reset delay (milliseconds)
    // Delay to reset programmatic tab control after tab switching to prevent render loops
    TabControlResetDelayMs: 500,
    // Market data cache duration (milliseconds)
    // How long to cache market list data before fetching fresh data
    MarketDataCacheDurationMs: 5 * 60 * 1000, // 5 minutes
    // Asset metadata cache duration (milliseconds)
    // How long to cache asset icon validation results
    AssetMetadataCacheDurationMs: 60 * 60 * 1000, // 1 hour
    // Max leverage cache duration (milliseconds)
    // How long to cache max leverage values per asset (leverage rarely changes)
    MaxLeverageCacheDurationMs: 60 * 60 * 1000, // 1 hour
    // Rewards cache durations (milliseconds)
    // How long to cache fee discount data from rewards API
    FeeDiscountCacheDurationMs: 5 * 60 * 1000, // 5 minutes
    // How long to cache points calculation parameters from rewards API
    PointsCalculationCacheDurationMs: 5 * 60 * 1000, // 5 minutes
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
    LoggingMarkers: {
        // Sentry performance measurement logs (screen loads, bottom sheets, API timing)
        SentryPerformance: 'PERPSMARK_SENTRY',
        // MetaMetrics event tracking logs (user interactions, business analytics)
        MetametricsEvents: 'PERPSMARK_METRICS',
        // WebSocket performance logs (connection timing, data flow, reconnections)
        WebsocketPerformance: 'PERPSMARK_SENTRY_WS',
    },
};
export const TP_SL_CONFIG = {
    UsePositionBoundTpsl: true,
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
export const HYPERLIQUID_TWAP_LIMITS = {
    MinDurationMinutes: 5,
    MaxDurationMinutes: 1440,
    MinNotionalUsd: 100,
};
/**
 * HyperLiquid order limits based on leverage
 * From: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/contract-specifications
 */
export const HYPERLIQUID_ORDER_LIMITS = {
    // Market orders
    MarketOrderLimits: {
        // $15,000,000 for max leverage >= 25
        HighLeverage: 15000000,
        // $5,000,000 for max leverage in [20, 25)
        MediumHighLeverage: 5000000,
        // $2,000,000 for max leverage in [10, 20)
        MediumLeverage: 2000000,
        // $500,000 for max leverage < 10
        LowLeverage: 500000,
    },
    // Limit orders are 10x market order limits
    LimitOrderMultiplier: 10,
};
/**
 * Close position configuration
 * Controls behavior and constants specific to position closing
 */
export const CLOSE_POSITION_CONFIG = {
    // Decimal places for USD amount input display
    UsdDecimalPlaces: 2,
    // Default close percentage when opening the close position view
    DefaultClosePercentage: 100,
    // Precision for position size calculations to prevent rounding errors
    AmountCalculationPrecision: 6,
    // Throttle delay for real-time price updates during position closing
    PriceThrottleMs: 3000,
    // Fallback decimal places for tokens without metadata
    FallbackTokenDecimals: 18,
};
/**
 * Margin adjustment configuration
 * Controls behavior for adding/removing margin from positions
 */
export const MARGIN_ADJUSTMENT_CONFIG = {
    // Risk thresholds for margin removal warnings
    // Threshold values represent ratio of (price distance to liquidation) / (liquidation price)
    // Values < 1.0 mean price is dangerously close to liquidation
    LiquidationRiskThreshold: 1.2, // 20% buffer before liquidation - triggers danger state
    LiquidationWarningThreshold: 1.5, // 50% buffer before liquidation - triggers warning state
    // Minimum margin adjustment amount (USD)
    // Prevents dust adjustments and ensures meaningful position changes
    MinAdjustmentAmount: 1,
    // Precision for margin calculations
    // Ensures accurate decimal handling in margin/leverage calculations
    CalculationPrecision: 6,
    // Safety buffer for margin removal to account for HyperLiquid's transfer margin requirement
    // HyperLiquid enforces: transfer_margin_required = max(initial_margin_required, 0.1 * total_position_value)
    // See: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/margin-and-pnl
    MarginRemovalSafetyBuffer: 0.1,
    // Fallback max leverage when market data is unavailable
    // Conservative value to prevent over-removal of margin
    // Most HyperLiquid assets support at least 50x leverage
    FallbackMaxLeverage: 50,
};
/**
 * Data Lake API configuration
 * Endpoints for reporting perps trading activity for notifications
 */
export const DATA_LAKE_API_CONFIG = {
    // Order reporting endpoint - only used for mainnet perps trading
    OrdersEndpoint: 'https://perps.api.cx.metamask.io/api/v1/orders',
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
export const SUBSCRIPTION_BENEFITS_CACHE = {
    FreshMs: 60000, // 1 minute – no refresh triggered
    MaxStaleMs: 10 * 60 * 1000, // 10 minutes – ceiling for granting the waiver
};
/**
 * Terminal API configuration.
 * The full endpoint URL is injected at runtime via
 * `PerpsPlatformDependencies.terminalApi.marketDataUrl` from each client build
 * (dev/uat/prd); only cache settings live here.
 */
export const TERMINAL_API_CONFIG = {
    CacheTtlMs: 5 * 60 * 1000, // 5 minutes
    FetchTimeoutMs: 10000, // 10 seconds – degrade to provider on slow Terminal
};
/**
 * Decimal precision configuration
 * Controls maximum decimal places for price and input validation
 */
export const DECIMAL_PRECISION_CONFIG = {
    // Maximum decimal places for price input (matches Hyperliquid limit)
    // Used in TP/SL forms, limit price inputs, and price validation
    MaxPriceDecimals: 6,
    // Maximum significant figures allowed by HyperLiquid API
    // Orders with more than 5 significant figures will be rejected
    MaxSignificantFigures: 5,
    // Defensive fallback for size decimals when market data fails to load
    // Real szDecimals should always come from market data API (varies by asset)
    // Using 6 as safe maximum to prevent crashes (covers most assets)
    // NOTE: This is NOT semantically correct - just a defensive measure
    FallbackSizeDecimals: 6,
};
/**
 * Market sorting configuration
 * Controls sorting behavior and presets for the trending markets view
 */
export const MARKET_SORTING_CONFIG = {
    // Default sort settings
    DefaultSortOptionId: 'volume',
    DefaultDirection: 'desc',
    // Available sort fields (only includes fields supported by PerpsMarketData)
    SortFields: {
        Volume: 'volume',
        PriceChange: 'priceChange',
        OpenInterest: 'openInterest',
        FundingRate: 'fundingRate',
    },
    // Sort button presets for filter chips (simplified buttons without direction)
    SortButtonPresets: [
        { field: 'volume', labelKey: 'perps.sort.volume' },
        { field: 'priceChange', labelKey: 'perps.sort.price_change' },
        { field: 'fundingRate', labelKey: 'perps.sort.funding_rate' },
    ],
    // Sort options for the bottom sheet
    // All options support direction toggle (high-to-low / low-to-high)
    SortOptions: [
        {
            id: 'volume',
            labelKey: 'perps.sort.volume',
            field: 'volume',
            direction: 'desc',
        },
        {
            id: 'priceChange',
            labelKey: 'perps.sort.price_change',
            field: 'priceChange',
            direction: 'desc',
        },
        {
            id: 'openInterest',
            labelKey: 'perps.sort.open_interest',
            field: 'openInterest',
            direction: 'desc',
        },
        {
            id: 'fundingRate',
            labelKey: 'perps.sort.funding_rate',
            field: 'fundingRate',
            direction: 'desc',
        },
    ],
};
/**
 * Perps interface mode.
 *
 * `Lite` is the simplified default experience; `Pro` exposes the advanced
 * trading layout (chart, order book, inline order form).
 */
export var PerpsMode;
(function (PerpsMode) {
    PerpsMode["Lite"] = "lite";
    PerpsMode["Pro"] = "pro";
})(PerpsMode || (PerpsMode = {}));
/**
 * Default pro-mode layout preferences.
 *
 * Shared by `getDefaultPerpsControllerState()`, the controller getter, and the
 * selector so callers always receive a fully-populated object even when the
 * persisted state predates this field.
 */
export const DEFAULT_PRO_LAYOUT_PREFERENCES = {
    orderBookExpanded: false,
    chartExpanded: false,
    orderBookPosition: 'left',
    orderFormPosition: 'right',
    positionsSideFilter: 'all',
    positionsSortField: 'positionValue',
    positionsSortDirection: 'desc',
    ordersSideFilter: 'all',
    ordersSortField: 'time',
    ordersSortDirection: 'desc',
};
/**
 * Default Perps interface mode.
 */
export const DEFAULT_PERPS_MODE = PerpsMode.Lite;
/**
 * Funding rate display configuration
 * Controls how funding rates are formatted and displayed
 */
export const FUNDING_RATE_CONFIG = {
    // Number of decimal places to display for funding rates
    Decimals: 4,
    // Default display value when funding rate is zero or unavailable
    ZeroDisplay: '0.0000%',
    // Multiplier to convert decimal funding rate to percentage
    PercentageMultiplier: 100,
};
/**
 * Provider configuration for multi-provider support
 */
export const PROVIDER_CONFIG = {
    /** Default perpetual DEX provider when no explicit selection exists */
    DefaultProvider: 'hyperliquid',
    /** Force MYX to testnet only (mainnet credentials not yet available) */
    MYX_TESTNET_ONLY: false,
    /**
     * Force Lighter to testnet only. Off: Lighter follows the global network
     * toggle so mainnet reads (full market catalog, prices, candles) work;
     * every nonce-consuming write is refused on mainnet by the gate at the
     * top of LighterProvider's venue write lock until mainnet trading is
     * validated end-to-end.
     */
    LIGHTER_TESTNET_ONLY: false,
};
// Disk-backed cold-start cache keys and throttle interval.
// The user-data key ends in _V2 because the AccountState balance contract
// changed (TAT-3047) and has no in-payload version field. Bumping the key
// forces a one-time empty cache on upgrade — consumers fall through to
// skeleton/fallback until the first WS tick, avoiding stale legacy-shape
// reads that would surface as $0 balances.
export const PERPS_DISK_CACHE_MARKETS = 'PERPS_DISK_CACHE_MARKETS';
export const PERPS_DISK_CACHE_USER_DATA = 'PERPS_DISK_CACHE_USER_DATA_V2';
export const PERPS_DISK_CACHE_THROTTLE_MS = 30000;
/**
 * Minimum interval between WebSocket-triggered HL `userAbstraction`
 * refreshes. Balances picking up HL-web mode flips (Unified ↔ Standard)
 * promptly against burning REST quota on every spot tick. Covers the
 * observed user pattern of flipping mode once per session at most.
 */
export const ABSTRACTION_MODE_REFRESH_THROTTLE_MS = 60000;
/**
 * Build the standard provider:network cache key from controller state.
 *
 * @param state - Controller state containing provider and network info.
 * @param state.activeProvider - Active perps provider name.
 * @param state.isTestnet - Whether testnet mode is active.
 * @returns Cache key in the format "provider:mainnet" or "provider:testnet".
 */
export function getProviderNetworkKey(state) {
    return `${state.activeProvider ?? PROVIDER_CONFIG.DefaultProvider}:${state.isTestnet ? 'testnet' : 'mainnet'}`;
}
/**
 * Build a provider:network cache key for a specific provider id.
 * Accounts for MYX_TESTNET_ONLY: MYX is always on testnet regardless of the
 * global network flag.
 *
 * @param providerId - The provider identifier (e.g. "hyperliquid", "myx").
 * @param isTestnet - Global testnet flag from controller state.
 * @returns Cache key in the format "provider:mainnet" or "provider:testnet".
 */
export function buildProviderCacheKey(providerId, isTestnet) {
    let effectiveTestnet = isTestnet;
    if (providerId === 'myx') {
        effectiveTestnet = PROVIDER_CONFIG.MYX_TESTNET_ONLY || isTestnet;
    }
    else if (providerId === 'lighter') {
        effectiveTestnet = PROVIDER_CONFIG.LIGHTER_TESTNET_ONLY || isTestnet;
    }
    return `${providerId}:${effectiveTestnet ? 'testnet' : 'mainnet'}`;
}
//# sourceMappingURL=perpsConfig.mjs.map