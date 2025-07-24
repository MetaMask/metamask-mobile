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
 * Withdrawal-specific constants
 */
export const WITHDRAWAL_CONSTANTS = {
  DEFAULT_MIN_AMOUNT: '1.01', // Default minimum withdrawal amount in USDC
  DEFAULT_FEE_AMOUNT: 1, // Default withdrawal fee in USDC
  DEFAULT_FEE_TOKEN: 'USDC', // Default fee token
  DEFAULT_ESTIMATED_TIME: '5 minutes', // Default estimated withdrawal time
  COMPLETED_RETENTION_DAYS: 7, // Keep completed withdrawals for 7 days
  ESTIMATED_TIME_MS: 5 * 60 * 1000, // 5 minutes in milliseconds
  MAX_WAIT_TIME_MS: 15 * 60 * 1000, // 15 minutes max wait time in milliseconds
  TOLERANCE_TIME_MS: 10 * 60 * 1000, // 10 minutes additional tolerance
  AMOUNT_MATCH_TOLERANCE: 0.1, // 10% tolerance for amount matching (to account for fees)
  VALIDATOR_SIGNING_TIME_MIN: 3, // 0-3 minutes: validators signing phase
  BRIDGE_FINALIZING_TIME_MIN: 5, // 3-5 minutes: bridge finalizing phase
} as const;
