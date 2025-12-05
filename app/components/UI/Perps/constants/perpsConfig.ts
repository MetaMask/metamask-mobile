/**
 * Perps feature constants
 */
export const PERPS_CONSTANTS = {
  FEATURE_FLAG_KEY: 'perpsEnabled',
  FEATURE_NAME: 'perps', // Constant for Sentry error filtering - enables "feature:perps" dashboard queries
  WEBSOCKET_TIMEOUT: 5000, // 5 seconds
  WEBSOCKET_CLEANUP_DELAY: 1000, // 1 second
  BACKGROUND_DISCONNECT_DELAY: 20_000, // 20 seconds delay before disconnecting when app is backgrounded or when user exits perps UX
  CONNECTION_TIMEOUT_MS: 10_000, // 10 seconds timeout for connection and position loading states
  DEFAULT_MONITORING_TIMEOUT_MS: 10_000, // 10 seconds default timeout for data monitoring operations

  // Connection timing constants
  CONNECTION_GRACE_PERIOD_MS: 20_000, // 20 seconds grace period before actual disconnection (same as BACKGROUND_DISCONNECT_DELAY for semantic clarity)
  CONNECTION_ATTEMPT_TIMEOUT_MS: 30_000, // 30 seconds timeout for connection attempts to prevent indefinite hanging
  WEBSOCKET_PING_TIMEOUT_MS: 5_000, // 5 seconds timeout for WebSocket health check ping
  RECONNECTION_CLEANUP_DELAY_MS: 500, // Platform-agnostic delay to ensure WebSocket is ready
  RECONNECTION_DELAY_ANDROID_MS: 300, // Android-specific reconnection delay for better reliability on slower devices
  RECONNECTION_DELAY_IOS_MS: 100, // iOS-specific reconnection delay for optimal performance

  // Connection manager timing constants
  BALANCE_UPDATE_THROTTLE_MS: 15000, // Update at most every 15 seconds to reduce state updates in PerpsConnectionManager
  INITIAL_DATA_DELAY_MS: 100, // Delay to allow initial data to load after connection establishment

  DEFAULT_ASSET_PREVIEW_LIMIT: 5,
  DEFAULT_MAX_LEVERAGE: 3 as number, // Default fallback max leverage when market data is unavailable - conservative default
  FALLBACK_PRICE_DISPLAY: '$---', // Display when price data is unavailable
  FALLBACK_PERCENTAGE_DISPLAY: '--%', // Display when change data is unavailable
  FALLBACK_DATA_DISPLAY: '--', // Display when non-price data is unavailable
  ZERO_AMOUNT_DISPLAY: '$0', // Display for zero dollar amounts (e.g., no volume)
  ZERO_AMOUNT_DETAILED_DISPLAY: '$0.00', // Display for zero dollar amounts with decimals

  RECENT_ACTIVITY_LIMIT: 3,
} as const;

/**
 * Withdrawal-specific constants (protocol-agnostic)
 * Note: Protocol-specific values like estimated time should be defined in each protocol's config
 */
export const WITHDRAWAL_CONSTANTS = {
  DEFAULT_MIN_AMOUNT: '1.01', // Default minimum withdrawal amount in USDC
  DEFAULT_FEE_AMOUNT: 1, // Default withdrawal fee in USDC
  DEFAULT_FEE_TOKEN: 'USDC', // Default fee token
} as const;

/**
 * MetaMask fee configuration for Perps trading
 * These fees are protocol-agnostic and apply on top of protocol fees
 */
export const METAMASK_FEE_CONFIG = {
  // Deposit/withdrawal fees
  DEPOSIT_FEE: 0, // $0 currently
  WITHDRAWAL_FEE: 0, // $0 currently

  // Future: Fee configuration will be fetched from API based on:
  // - User tier/volume (for MetaMask fee discounts)
  // - Promotional campaigns
  // - Protocol-specific agreements
  // - MetaMask points/rewards integration
  // Note: Trading fees are now handled by each provider's calculateFees()
  // which returns complete fee breakdown including MetaMask fees
} as const;

/**
 * Validation thresholds for UI warnings and checks
 * These values control when warnings are shown to users
 */
export const VALIDATION_THRESHOLDS = {
  // Leverage threshold for warning users about high leverage
  HIGH_LEVERAGE_WARNING: 20, // Show warning when leverage > 20x

  // Limit price difference threshold (as decimal, 0.1 = 10%)
  LIMIT_PRICE_DIFFERENCE_WARNING: 0.1, // Warn if limit price differs by >10% from current price

  // Price deviation threshold (as decimal, 0.1 = 10%)
  PRICE_DEVIATION: 0.1, // Warn if perps price deviates by >10% from spot price
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
  DEFAULT_MARKET_SLIPPAGE_BPS: 300,

  // TP/SL order slippage (basis points)
  // 1000 basis points = 10% = 0.10 decimal
  // Aligns with HyperLiquid platform default for triggered orders
  DEFAULT_TPSL_SLIPPAGE_BPS: 1000,

  // Limit order slippage (basis points)
  // 100 basis points = 1% = 0.01 decimal
  // Kept conservative as limit orders rest on book (not IOC/immediate execution)
  DEFAULT_LIMIT_SLIPPAGE_BPS: 100,
} as const;

/**
 * Performance optimization constants
 * These values control debouncing and throttling for better performance
 */
export const PERFORMANCE_CONFIG = {
  // Price updates debounce delay (milliseconds)
  // Batches rapid WebSocket price updates to reduce re-renders
  PRICE_UPDATE_DEBOUNCE_MS: 1000,

  // Order validation debounce delay (milliseconds)
  // Prevents excessive validation calls during rapid form input changes
  VALIDATION_DEBOUNCE_MS: 300,

  // Liquidation price debounce delay (milliseconds)
  // Prevents excessive liquidation price calls during rapid form input changes
  LIQUIDATION_PRICE_DEBOUNCE_MS: 500,

  // Navigation params delay (milliseconds)
  // Required for React Navigation to complete state transitions before setting params
  // This ensures navigation context is available when programmatically selecting tabs
  NAVIGATION_PARAMS_DELAY_MS: 200,

  // Tab control reset delay (milliseconds)
  // Delay to reset programmatic tab control after tab switching to prevent render loops
  TAB_CONTROL_RESET_DELAY_MS: 500,

  // Market data cache duration (milliseconds)
  // How long to cache market list data before fetching fresh data
  MARKET_DATA_CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes

  // Asset metadata cache duration (milliseconds)
  // How long to cache asset icon validation results
  ASSET_METADATA_CACHE_DURATION_MS: 60 * 60 * 1000, // 1 hour

  // Max leverage cache duration (milliseconds)
  // How long to cache max leverage values per asset (leverage rarely changes)
  MAX_LEVERAGE_CACHE_DURATION_MS: 60 * 60 * 1000, // 1 hour

  // Rewards cache durations (milliseconds)
  // How long to cache fee discount data from rewards API
  FEE_DISCOUNT_CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes
  // How long to cache points calculation parameters from rewards API
  POINTS_CALCULATION_CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes

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
  LOGGING_MARKERS: {
    // Sentry performance measurement logs (screen loads, bottom sheets, API timing)
    SENTRY_PERFORMANCE: 'PERPSMARK_SENTRY',

    // MetaMetrics event tracking logs (user interactions, business analytics)
    METAMETRICS_EVENTS: 'PERPSMARK_METRICS',

    // WebSocket performance logs (connection timing, data flow, reconnections)
    WEBSOCKET_PERFORMANCE: 'PERPSMARK_SENTRY_WS',
  } as const,
} as const;

/**
 * Leverage slider UI configuration
 * Controls the visual and interactive aspects of the leverage slider
 */
export const LEVERAGE_SLIDER_CONFIG = {
  // Step sizes for tick marks based on max leverage
  TICK_STEP_LOW: 5, // Step size when max leverage <= 20
  TICK_STEP_MEDIUM: 10, // Step size when max leverage <= 50
  TICK_STEP_HIGH: 20, // Step size when max leverage > 50

  // Thresholds for determining tick step size
  MAX_LEVERAGE_LOW_THRESHOLD: 20,
  MAX_LEVERAGE_MEDIUM_THRESHOLD: 50,
} as const;

export const TP_SL_CONFIG = {
  USE_POSITION_BOUND_TPSL: true,
} as const;

/**
 * TP/SL View UI configuration
 * Controls the Take Profit / Stop Loss screen behavior and display options
 */
export const TP_SL_VIEW_CONFIG = {
  // Quick percentage button presets for Take Profit (positive RoE percentages)
  TAKE_PROFIT_ROE_PRESETS: [10, 25, 50, 100], // +10%, +25%, +50%, +100% RoE

  // Quick percentage button presets for Stop Loss (negative RoE percentages)
  STOP_LOSS_ROE_PRESETS: [-5, -10, -25, -50], // -5%, -10%, -25%, -50% RoE

  // WebSocket price update throttle delay (milliseconds)
  // Reduces re-renders by batching price updates in the TP/SL screen
  PRICE_THROTTLE_MS: 1000,

  // Maximum number of digits allowed in price/percentage input fields
  // Prevents overflow and maintains reasonable input constraints
  MAX_INPUT_DIGITS: 9,

  // Keypad configuration for price inputs
  // USD_PERPS is not a real currency - it's a custom configuration
  // that allows 5 decimal places for crypto prices, overriding the
  // default USD configuration which only allows 2 decimal places
  KEYPAD_CURRENCY_CODE: 'USD_PERPS' as const,
  KEYPAD_DECIMALS: 5,
} as const;

/**
 * Limit price configuration
 * Controls preset percentages and behavior for limit orders
 */
export const LIMIT_PRICE_CONFIG = {
  // Preset percentage options for quick selection
  PRESET_PERCENTAGES: [1, 2, 5, 10], // Available as both positive and negative

  // Modal opening delay when switching to limit order (milliseconds)
  // Allows order type modal to close smoothly before opening limit price modal
  MODAL_OPEN_DELAY: 300,

  // Direction-specific preset configurations
  LONG_PRESETS: [-1, -2, -5, -10], // Buy below market for long orders
  SHORT_PRESETS: [1, 2, 5, 10], // Sell above market for short orders
} as const;

/**
 * HyperLiquid order limits based on leverage
 * From: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/contract-specifications
 */
export const HYPERLIQUID_ORDER_LIMITS = {
  // Market orders
  MARKET_ORDER_LIMITS: {
    // $15,000,000 for max leverage >= 25
    HIGH_LEVERAGE: 15_000_000,
    // $5,000,000 for max leverage in [20, 25)
    MEDIUM_HIGH_LEVERAGE: 5_000_000,
    // $2,000,000 for max leverage in [10, 20)
    MEDIUM_LEVERAGE: 2_000_000,
    // $500,000 for max leverage < 10
    LOW_LEVERAGE: 500_000,
  },
  // Limit orders are 10x market order limits
  LIMIT_ORDER_MULTIPLIER: 10,
} as const;

/**
 * Close position configuration
 * Controls behavior and constants specific to position closing
 */
export const CLOSE_POSITION_CONFIG = {
  // Decimal places for USD amount input display
  USD_DECIMAL_PLACES: 2,

  // Default close percentage when opening the close position view
  DEFAULT_CLOSE_PERCENTAGE: 100,

  // Precision for position size calculations to prevent rounding errors
  AMOUNT_CALCULATION_PRECISION: 6,

  // Throttle delay for real-time price updates during position closing
  PRICE_THROTTLE_MS: 3000,

  // Fallback decimal places for tokens without metadata
  FALLBACK_TOKEN_DECIMALS: 18,
} as const;

/**
 * Margin adjustment configuration
 * Controls behavior for adding/removing margin from positions
 */
export const MARGIN_ADJUSTMENT_CONFIG = {
  // Risk thresholds for margin removal warnings
  // Threshold values represent ratio of (price distance to liquidation) / (liquidation price)
  // Values < 1.0 mean price is dangerously close to liquidation
  LIQUIDATION_RISK_THRESHOLD: 1.2, // 20% buffer before liquidation - triggers danger state
  LIQUIDATION_WARNING_THRESHOLD: 1.5, // 50% buffer before liquidation - triggers warning state

  // Minimum margin adjustment amount (USD)
  // Prevents dust adjustments and ensures meaningful position changes
  MIN_ADJUSTMENT_AMOUNT: 1,

  // Precision for margin calculations
  // Ensures accurate decimal handling in margin/leverage calculations
  CALCULATION_PRECISION: 6,

  // Safety buffer for margin removal to account for HyperLiquid's transfer margin requirement
  // HyperLiquid enforces: transfer_margin_required = max(initial_margin_required, 0.1 * total_position_value)
  // See: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/margin-and-pnl
  MARGIN_REMOVAL_SAFETY_BUFFER: 0.1,

  // Fallback max leverage when market data is unavailable
  // Conservative value to prevent over-removal of margin
  // Most HyperLiquid assets support at least 50x leverage
  FALLBACK_MAX_LEVERAGE: 50,
} as const;

/**
 * Data Lake API configuration
 * Endpoints for reporting perps trading activity for notifications
 */
export const DATA_LAKE_API_CONFIG = {
  // Order reporting endpoint - only used for mainnet perps trading
  ORDERS_ENDPOINT: 'https://perps.api.cx.metamask.io/api/v1/orders',
} as const;

/**
 * Funding rate display configuration
 * Controls how funding rates are formatted and displayed across the app
 */
export const FUNDING_RATE_CONFIG = {
  // Number of decimal places to display for funding rates
  DECIMALS: 4,
  // Default display value when funding rate is zero or unavailable
  ZERO_DISPLAY: '0.0000%',
  // Multiplier to convert decimal funding rate to percentage
  PERCENTAGE_MULTIPLIER: 100,
} as const;

/**
 * Decimal precision configuration
 * Controls maximum decimal places for price and input validation
 */
export const DECIMAL_PRECISION_CONFIG = {
  // Maximum decimal places for price input (matches Hyperliquid limit)
  // Used in TP/SL forms, limit price inputs, and price validation
  MAX_PRICE_DECIMALS: 6,
  // Defensive fallback for size decimals when market data fails to load
  // Real szDecimals should always come from market data API (varies by asset)
  // Using 6 as safe maximum to prevent crashes (covers most assets)
  // NOTE: This is NOT semantically correct - just a defensive measure
  FALLBACK_SIZE_DECIMALS: 6,
} as const;

export const PERPS_GTM_WHATS_NEW_MODAL = 'perps-gtm-whats-new-modal';
export const PERPS_GTM_MODAL_ENGAGE = 'engage';
export const PERPS_GTM_MODAL_DECLINE = 'decline';

/**
 * Development-only configuration for testing and debugging
 * These constants are only active when __DEV__ is true
 */
export const DEVELOPMENT_CONFIG = {
  // Magic number to simulate fee discount state (20% discount)
  SIMULATE_FEE_DISCOUNT_AMOUNT: 41,

  // Magic number to simulate rewards error state (set order amount to this value)
  SIMULATE_REWARDS_ERROR_AMOUNT: 42,

  // Magic number to simulate rewards loading state
  SIMULATE_REWARDS_LOADING_AMOUNT: 43,

  // Future: Add other development helpers as needed
} as const;

/**
 * Home screen configuration
 * Controls carousel limits and display settings for the main Perps home screen
 */
export const HOME_SCREEN_CONFIG = {
  // Maximum number of items to show in each carousel
  POSITIONS_CAROUSEL_LIMIT: 10,
  ORDERS_CAROUSEL_LIMIT: 10,
  TRENDING_MARKETS_LIMIT: 5,
  RECENT_ACTIVITY_LIMIT: 3,

  // Carousel display behavior
  CAROUSEL_SNAP_ALIGNMENT: 'start' as const,
  CAROUSEL_VISIBLE_ITEMS: 1.2, // Show 1 full item + 20% of next

  // Icon sizes for consistent display across sections
  DEFAULT_ICON_SIZE: 40, // Default token icon size for cards and rows
} as const;

/**
 * Market sorting configuration
 * Controls sorting behavior and presets for the trending markets view
 */
export const MARKET_SORTING_CONFIG = {
  // Default sort settings
  DEFAULT_SORT_OPTION_ID: 'volume' as const,
  DEFAULT_DIRECTION: 'desc' as const,

  // Available sort fields (only includes fields supported by PerpsMarketData)
  SORT_FIELDS: {
    VOLUME: 'volume',
    PRICE_CHANGE: 'priceChange',
    OPEN_INTEREST: 'openInterest',
    FUNDING_RATE: 'fundingRate',
  } as const,

  // Sort button presets for filter chips (simplified buttons without direction)
  SORT_BUTTON_PRESETS: [
    { field: 'volume', labelKey: 'perps.sort.volume' },
    { field: 'priceChange', labelKey: 'perps.sort.price_change' },
    { field: 'fundingRate', labelKey: 'perps.sort.funding_rate' },
  ] as const,

  // Sort options for the bottom sheet
  // Each option combines field + direction into a single selectable item
  // Only Price Change has both directions as separate options
  SORT_OPTIONS: [
    {
      id: 'volume',
      labelKey: 'perps.sort.volume',
      field: 'volume',
      direction: 'desc',
    },
    {
      id: 'priceChange-desc',
      labelKey: 'perps.sort.price_change_high_to_low',
      field: 'priceChange',
      direction: 'desc',
    },
    {
      id: 'priceChange-asc',
      labelKey: 'perps.sort.price_change_low_to_high',
      field: 'priceChange',
      direction: 'asc',
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
 * Valid values: 'volume' | 'priceChange-desc' | 'priceChange-asc' | 'openInterest' | 'fundingRate'
 */
export type SortOptionId =
  (typeof MARKET_SORTING_CONFIG.SORT_OPTIONS)[number]['id'];

/**
 * Type for sort button presets (filter chips)
 * Derived from SORT_BUTTON_PRESETS to ensure type safety
 */
export type SortButtonPreset =
  (typeof MARKET_SORTING_CONFIG.SORT_BUTTON_PRESETS)[number];

/**
 * Learn more card configuration
 * External resources and content for Perps education
 */
export const LEARN_MORE_CONFIG = {
  EXTERNAL_URL: 'https://metamask.io/perps',
  TITLE_KEY: 'perps.tutorial.card.title',
  DESCRIPTION_KEY: 'perps.learn_more.description',
  CTA_KEY: 'perps.learn_more.cta',
} as const;

/**
 * Support configuration
 * Contact support button configuration (matches Settings behavior)
 */
export const SUPPORT_CONFIG = {
  URL: 'https://support.metamask.io',
  TITLE_KEY: 'perps.support.title',
  DESCRIPTION_KEY: 'perps.support.description',
} as const;

/**
 * Support article URLs
 * Links to specific MetaMask support articles for Perps features
 */
export const PERPS_SUPPORT_ARTICLES_URLS = {
  ADL_URL:
    'https://support.metamask.io/manage-crypto/trade/perps/leverage-and-liquidation/#what-is-auto-deleveraging-adl',
} as const;

/**
 * Stop loss prompt banner configuration
 * Controls when and how the stop loss prompt banner is displayed
 * Based on TAT-1693 specifications
 */
export const STOP_LOSS_PROMPT_CONFIG = {
  // Distance to liquidation threshold (percentage)
  // Shows "Add margin" banner when position is within this % of liquidation
  LIQUIDATION_DISTANCE_THRESHOLD: 3,

  // ROE (Return on Equity) threshold (percentage)
  // Shows "Set stop loss" banner when ROE drops below this value
  ROE_THRESHOLD: -20,

  // Debounce duration for ROE threshold (milliseconds)
  // User must have ROE below threshold for this duration before showing banner
  // Prevents banner from appearing during temporary price fluctuations
  ROE_DEBOUNCE_MS: 60_000, // 60 seconds

  // Suggested stop loss ROE percentage
  // When suggesting a stop loss, calculate price at this ROE from entry
  SUGGESTED_STOP_LOSS_ROE: -50,
} as const;
