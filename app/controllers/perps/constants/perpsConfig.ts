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
export const PERPS_CONSTANTS = {
  FeatureFlagKey: 'perpsEnabled',
  FeatureName: 'perps', // Constant for Sentry error filtering - enables "feature:perps" dashboard queries
  /** Token description used to identify the synthetic "Perps balance" option in pay-with token lists */
  PerpsBalanceTokenDescription: 'perps-balance',
  /** Symbol displayed for the synthetic "Perps balance" token in pay-with token lists */
  PerpsBalanceTokenSymbol: 'USD',
  WebsocketTimeout: 5000, // 5 seconds
  WebsocketCleanupDelay: 1000, // 1 second
  BackgroundDisconnectDelay: 20_000, // 20 seconds delay before disconnecting when app is backgrounded or when user exits perps UX
  ConnectionTimeoutMs: 10_000, // 10 seconds timeout for connection and position loading states
  DefaultMonitoringTimeoutMs: 10_000, // 10 seconds default timeout for data monitoring operations

  // Connection timing constants
  ConnectionGracePeriodMs: 20_000, // 20 seconds grace period before actual disconnection (same as BackgroundDisconnectDelay for semantic clarity)
  ConnectionAttemptTimeoutMs: 30_000, // 30 seconds timeout for connection attempts to prevent indefinite hanging
  WebsocketPingTimeoutMs: 5_000, // 5 seconds timeout for WebSocket health check ping
  ConnectRetryDelayMs: 200, // Delay before retrying connect() when connection isn't ready yet
  ReconnectionCleanupDelayMs: 500, // Platform-agnostic delay to ensure WebSocket is ready
  ReconnectionDelayAndroidMs: 300, // Android-specific reconnection delay for better reliability on slower devices
  ReconnectionDelayIosMs: 100, // iOS-specific reconnection delay for optimal performance
  ReconnectionRetryDelayMs: 5_000, // 5 seconds delay between reconnection attempts

  // Connection manager timing constants
  BalanceUpdateThrottleMs: 15000, // Update at most every 15 seconds to reduce state updates in PerpsConnectionManager
  InitialDataDelayMs: 100, // Delay to allow initial data to load after connection establishment

  // Deposit toast timing
  DepositTakingLongerToastDelayMs: 30_000, // Delay before showing "Deposit taking longer than usual" toast

  DefaultAssetPreviewLimit: 5,
  DefaultMaxLeverage: 3 as number, // Default fallback max leverage when market data is unavailable - conservative default
  FallbackPriceDisplay: '$---', // Display when price data is unavailable
  FallbackPercentageDisplay: '--%', // Display when change data is unavailable
  FallbackDataDisplay: '--', // Display when non-price data is unavailable
  ZeroAmountDisplay: '$0', // Display for zero dollar amounts (e.g., no volume)
  ZeroAmountDetailedDisplay: '$0.00', // Display for zero dollar amounts with decimals

  RecentActivityLimit: 3,

  // Historical data fetching constants
  FillsLookbackMs: 90 * 24 * 60 * 60 * 1000, // 3 months in milliseconds - limits REST API fills fetch
} as const;

/**
 * Withdrawal-specific constants (protocol-agnostic)
 * Note: Protocol-specific values like estimated time should be defined in each protocol's config
 */
export const WITHDRAWAL_CONSTANTS = {
  DefaultMinAmount: '1.01', // Default minimum withdrawal amount in USDC
  DefaultFeeAmount: 1, // Default withdrawal fee in USDC
  DefaultFeeToken: 'USDC', // Default fee token
} as const;

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
} as const;

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
} as const;

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
  } as const,
} as const;

export const TP_SL_CONFIG = {
  UsePositionBoundTpsl: true,
} as const;

/**
 * HyperLiquid order limits based on leverage
 * From: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/contract-specifications
 */
export const HYPERLIQUID_ORDER_LIMITS = {
  // Market orders
  MarketOrderLimits: {
    // $15,000,000 for max leverage >= 25
    HighLeverage: 15_000_000,
    // $5,000,000 for max leverage in [20, 25)
    MediumHighLeverage: 5_000_000,
    // $2,000,000 for max leverage in [10, 20)
    MediumLeverage: 2_000_000,
    // $500,000 for max leverage < 10
    LowLeverage: 500_000,
  },
  // Limit orders are 10x market order limits
  LimitOrderMultiplier: 10,
} as const;

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
} as const;

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
} as const;

/**
 * Data Lake API configuration
 * Endpoints for reporting perps trading activity for notifications
 */
export const DATA_LAKE_API_CONFIG = {
  // Order reporting endpoint - only used for mainnet perps trading
  OrdersEndpoint: 'https://perps.api.cx.metamask.io/api/v1/orders',
} as const;

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
} as const;

/**
 * Market sorting configuration
 * Controls sorting behavior and presets for the trending markets view
 */
export const MARKET_SORTING_CONFIG = {
  // Default sort settings
  DefaultSortOptionId: 'volume' as const,
  DefaultDirection: 'desc' as const,

  // Available sort fields (only includes fields supported by PerpsMarketData)
  SortFields: {
    Volume: 'volume',
    PriceChange: 'priceChange',
    OpenInterest: 'openInterest',
    FundingRate: 'fundingRate',
  } as const,

  // Sort button presets for filter chips (simplified buttons without direction)
  SortButtonPresets: [
    { field: 'volume', labelKey: 'perps.sort.volume' },
    { field: 'priceChange', labelKey: 'perps.sort.price_change' },
    { field: 'fundingRate', labelKey: 'perps.sort.funding_rate' },
  ] as const,

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
  ] as const,
} as const;

/**
 * Type for valid sort option IDs
 * Derived from SORT_OPTIONS to ensure type safety
 * Valid values: 'volume' | 'priceChange' | 'openInterest' | 'fundingRate'
 */
export type SortOptionId =
  (typeof MARKET_SORTING_CONFIG.SortOptions)[number]['id'];

/**
 * Provider configuration for multi-provider support
 */
export const PROVIDER_CONFIG = {
  /** Default perpetual DEX provider when no explicit selection exists */
  DefaultProvider: 'hyperliquid' as const,
  /** Force MYX to testnet only (mainnet credentials not yet available) */
  MYX_TESTNET_ONLY: true,
} as const;
