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
