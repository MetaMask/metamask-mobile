/**
 * Perps feature constants
 */
export const PERPS_CONSTANTS = {
  FEATURE_FLAG_KEY: 'perpsEnabled',
  WEBSOCKET_TIMEOUT: 5000, // 5 seconds
  WEBSOCKET_CLEANUP_DELAY: 1000, // 1 second
  DEFAULT_ASSET_PREVIEW_LIMIT: 5,
  DEFAULT_MAX_LEVERAGE: 3 as number, // Default fallback max leverage when market data is unavailable - conservative default
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

  // Minimum percentage for partial position close warning
  SMALL_CLOSE_PERCENTAGE_WARNING: 10, // Warn if closing <10% of position
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
} as const;
