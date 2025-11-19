/**
 * Error codes for PerpsController
 * These codes are returned to the UI layer for translation
 * Extracted to separate file to avoid circular dependencies with perpsErrorHandler
 */
export const PERPS_ERROR_CODES = {
  CLIENT_NOT_INITIALIZED: 'CLIENT_NOT_INITIALIZED',
  CLIENT_REINITIALIZING: 'CLIENT_REINITIALIZING',
  PROVIDER_NOT_AVAILABLE: 'PROVIDER_NOT_AVAILABLE',
  TOKEN_NOT_SUPPORTED: 'TOKEN_NOT_SUPPORTED',
  BRIDGE_CONTRACT_NOT_FOUND: 'BRIDGE_CONTRACT_NOT_FOUND',
  WITHDRAW_FAILED: 'WITHDRAW_FAILED',
  POSITIONS_FAILED: 'POSITIONS_FAILED',
  ACCOUNT_STATE_FAILED: 'ACCOUNT_STATE_FAILED',
  MARKETS_FAILED: 'MARKETS_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  // Provider-agnostic order errors
  ORDER_LEVERAGE_REDUCTION_FAILED: 'ORDER_LEVERAGE_REDUCTION_FAILED',
  // HyperLiquid-specific order errors
  IOC_CANCEL: 'IOC_CANCEL', // Order could not immediately match (insufficient liquidity)
  // Connection errors
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
} as const;

export type PerpsErrorCode =
  (typeof PERPS_ERROR_CODES)[keyof typeof PERPS_ERROR_CODES];
