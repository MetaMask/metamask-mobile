/**
 * Perps feature constants
 */
export const PERPS_CONSTANTS = {
  FEATURE_FLAG_KEY: 'perpsEnabled',
  WEBSOCKET_TIMEOUT: 5000, // 5 seconds
  WEBSOCKET_CLEANUP_DELAY: 1000, // 1 second
  BACKGROUND_DISCONNECT_DELAY: 20_000, // 20 seconds delay before disconnecting when app is backgrounded
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
  // Trading fees (as decimal, e.g., 0.01 = 1%)
  TRADING_FEE_RATE: 0, // 0% currently, will be fetched from API later

  // Deposit/withdrawal fees
  DEPOSIT_FEE: 0, // $0 currently
  WITHDRAWAL_FEE: 0, // $0 currently

  // Future: These will be fetched from API based on:
  // - User tier/volume
  // - Promotional campaigns
  // - Protocol-specific agreements
  // - MetaMask points/rewards integration
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

  // Navigation params delay (milliseconds)
  // Required for React Navigation to complete state transitions before setting params
  // This ensures navigation context is available when programmatically selecting tabs
  NAVIGATION_PARAMS_DELAY_MS: 100,

  // Market data cache duration (milliseconds)
  // How long to cache market list data before fetching fresh data
  MARKET_DATA_CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes

  // Asset metadata cache duration (milliseconds)
  // How long to cache asset icon validation results
  ASSET_METADATA_CACHE_DURATION_MS: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Perps notifications feature flag (temporary hard-coded flag)
 * This flag controls whether the perps notifications feature logic is enabled
 */
export const PERPS_NOTIFICATIONS_FEATURE_ENABLED = false;
