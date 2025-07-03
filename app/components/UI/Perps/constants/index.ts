/**
 * Perps feature constants
 */
export const PERPS_CONSTANTS = {
  FEATURE_FLAG_KEY: 'perpsEnabled',
  WEBSOCKET_TIMEOUT: 5000, // 5 seconds
  WEBSOCKET_CLEANUP_DELAY: 1000, // 1 second
  DEFAULT_ASSET_PREVIEW_LIMIT: 5,
} as const;

/**
 * Perps configuration
 */
export const PERPS_CONFIG = {
  ACTIVE: true,
  URL: '${PORTFOLIO_URL}/perps', // Will be replaced at runtime
} as const;
