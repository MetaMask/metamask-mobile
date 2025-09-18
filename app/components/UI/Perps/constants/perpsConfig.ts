/**
 * Perps feature constants
 */
export const PERPS_CONSTANTS = {
  FEATURE_FLAG_KEY: 'perpsEnabled',
  WEBSOCKET_TIMEOUT: 5000, // 5 seconds
  WEBSOCKET_CLEANUP_DELAY: 1000, // 1 second
  BACKGROUND_DISCONNECT_DELAY: 20_000, // 20 seconds delay before disconnecting when app is backgrounded or when user exits perps UX
  CONNECTION_TIMEOUT_MS: 10_000, // 10 seconds timeout for connection and position loading states

  // Connection timing constants
  CONNECTION_GRACE_PERIOD_MS: 20_000, // 20 seconds grace period before actual disconnection (same as BACKGROUND_DISCONNECT_DELAY for semantic clarity)
  RECONNECTION_CLEANUP_DELAY_MS: 200, // Platform-agnostic delay to ensure cleanup is complete
  RECONNECTION_DELAY_ANDROID_MS: 300, // Android-specific reconnection delay for better reliability on slower devices
  RECONNECTION_DELAY_IOS_MS: 100, // iOS-specific reconnection delay for optimal performance

  // Connection manager timing constants
  BALANCE_UPDATE_THROTTLE_MS: 15000, // Update at most every 15 seconds to reduce state updates in PerpsConnectionManager
  INITIAL_DATA_DELAY_MS: 100, // Delay to allow initial data to load after connection establishment

  DEFAULT_ASSET_PREVIEW_LIMIT: 5,
  DEFAULT_MAX_LEVERAGE: 3 as number, // Default fallback max leverage when market data is unavailable - conservative default
  FALLBACK_PRICE_DISPLAY: '$---', // Display when price data is unavailable
  FALLBACK_DATA_DISPLAY: '--', // Display when non-price data is unavailable
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
  VALIDATION_DEBOUNCE_MS: 1000,

  // Liquidation price debounce delay (milliseconds)
  // Prevents excessive liquidation price calls during rapid form input changes
  LIQUIDATION_PRICE_DEBOUNCE_MS: 500,

  // Navigation params delay (milliseconds)
  // Required for React Navigation to complete state transitions before setting params
  // This ensures navigation context is available when programmatically selecting tabs
  NAVIGATION_PARAMS_DELAY_MS: 200,

  // Market data cache duration (milliseconds)
  // How long to cache market list data before fetching fresh data
  MARKET_DATA_CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes

  // Asset metadata cache duration (milliseconds)
  // How long to cache asset icon validation results
  ASSET_METADATA_CACHE_DURATION_MS: 60 * 60 * 1000, // 1 hour

  // Max leverage cache duration (milliseconds)
  // How long to cache max leverage values per asset (leverage rarely changes)
  MAX_LEVERAGE_CACHE_DURATION_MS: 60 * 60 * 1000, // 1 hour
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
