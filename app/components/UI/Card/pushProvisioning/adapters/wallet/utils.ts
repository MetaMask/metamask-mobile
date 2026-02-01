/**
 * Wallet Adapter Utilities
 *
 * Shared utility functions for wallet adapters.
 */

import {
  CardTokenStatus,
  ProvisioningResult,
  ProvisioningError,
  ProvisioningErrorCode,
} from '../../types';
import Logger from '../../../../../../util/Logger';

// ============================================================================
// Types from react-native-wallet library
// ============================================================================

/**
 * Card status values from react-native-wallet library
 */
export type RNWalletCardStatus =
  | 'not found'
  | 'active'
  | 'pending'
  | 'suspended'
  | 'deactivated'
  | 'requireActivation';

/**
 * Tokenization status values from react-native-wallet library
 */
export type TokenizationStatus = 'success' | 'canceled' | 'error';

/**
 * Token info from react-native-wallet listTokens
 */
export interface TokenInfo {
  identifier: string;
  lastDigits: string;
  tokenState: number;
}

// ============================================================================
// Status Mapping Functions
// ============================================================================

const VALID_CARD_STATUSES: RNWalletCardStatus[] = [
  'not found',
  'active',
  'pending',
  'suspended',
  'deactivated',
  'requireActivation',
];

const VALID_TOKENIZATION_STATUSES: TokenizationStatus[] = [
  'success',
  'canceled',
  'error',
];

/**
 * Validate that a value is a valid RNWalletCardStatus
 */
export function isValidCardStatus(
  status: unknown,
): status is RNWalletCardStatus {
  return (
    typeof status === 'string' &&
    VALID_CARD_STATUSES.includes(status as RNWalletCardStatus)
  );
}

/**
 * Validate that a value is a valid TokenizationStatus
 */
export function isValidTokenizationStatus(
  status: unknown,
): status is TokenizationStatus {
  return (
    typeof status === 'string' &&
    VALID_TOKENIZATION_STATUSES.includes(status as TokenizationStatus)
  );
}

/**
 * Map react-native-wallet card status to our CardTokenStatus type
 * Includes runtime validation
 */
export function mapCardStatus(status: unknown): CardTokenStatus {
  if (!isValidCardStatus(status)) {
    Logger.log('mapCardStatus: Invalid status received', { status });
    return 'not_found';
  }

  switch (status) {
    case 'not found':
      return 'not_found';
    case 'active':
      return 'active';
    case 'pending':
      return 'pending';
    case 'suspended':
      return 'suspended';
    case 'deactivated':
      return 'deactivated';
    case 'requireActivation':
      return 'requires_activation';
    default:
      return 'not_found';
  }
}

/**
 * Map tokenization status to our ProvisioningResult status
 * Includes runtime validation
 */
export function mapTokenizationStatus(
  status: unknown,
): ProvisioningResult['status'] {
  if (!isValidTokenizationStatus(status)) {
    Logger.log('mapTokenizationStatus: Invalid status received', { status });
    return 'error';
  }

  switch (status) {
    case 'success':
      return 'success';
    case 'canceled':
      return 'canceled';
    case 'error':
      return 'error';
    default:
      return 'error';
  }
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Create a standardized ProvisioningError from an unknown error
 */
export function createProvisioningError(
  error: unknown,
  defaultCode: ProvisioningErrorCode = ProvisioningErrorCode.UNKNOWN_ERROR,
  defaultMessage?: string,
): ProvisioningError {
  if (error instanceof ProvisioningError) {
    return error;
  }

  const message =
    error instanceof Error
      ? error.message
      : (defaultMessage ?? 'An unknown error occurred');

  const originalError = error instanceof Error ? error : undefined;

  return new ProvisioningError(defaultCode, message, originalError);
}

/**
 * Create a standardized error result for wallet adapter methods
 */
export function createErrorResult(
  error: unknown,
  defaultCode: ProvisioningErrorCode = ProvisioningErrorCode.UNKNOWN_ERROR,
  defaultMessage?: string,
): ProvisioningResult {
  return {
    status: 'error',
    error: createProvisioningError(error, defaultCode, defaultMessage),
  };
}

/**
 * Log an error with standardized format
 */
export function logAdapterError(
  adapterName: string,
  methodName: string,
  error: unknown,
): void {
  Logger.log(`${adapterName}.${methodName} error`, {
    message: error instanceof Error ? error.message : String(error),
    code: error instanceof ProvisioningError ? error.code : undefined,
  });
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate TokenInfo from listTokens
 */
export function isValidTokenInfo(token: unknown): token is TokenInfo {
  if (!token || typeof token !== 'object') {
    return false;
  }

  const t = token as Record<string, unknown>;
  return (
    typeof t.identifier === 'string' &&
    typeof t.lastDigits === 'string' &&
    typeof t.tokenState === 'number'
  );
}

/**
 * Validate and filter token array from listTokens
 */
export function validateTokenArray(tokens: unknown): TokenInfo[] {
  if (!Array.isArray(tokens)) {
    Logger.log('validateTokenArray: Expected array, got', {
      type: typeof tokens,
    });
    return [];
  }

  return tokens.filter(isValidTokenInfo);
}
