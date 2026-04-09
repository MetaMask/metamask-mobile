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

/** Card status values from react-native-wallet library */
export type RNWalletCardStatus =
  | 'not found'
  | 'active'
  | 'pending'
  | 'suspended'
  | 'deactivated'
  | 'requireActivation';

/** Tokenization status values from react-native-wallet library */
export type TokenizationStatus = 'success' | 'canceled' | 'error';

/** Token info from react-native-wallet listTokens */
export interface TokenInfo {
  identifier: string;
  lastDigits: string;
  tokenState: number;
}

/** Map react-native-wallet card status to our CardTokenStatus type */
export function mapCardStatus(status: unknown): CardTokenStatus {
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
      Logger.log('mapCardStatus: Invalid status received', { status });
      return 'not_found';
  }
}

/** Map tokenization status to our ProvisioningResult status */
export function mapTokenizationStatus(
  status: unknown,
): ProvisioningResult['status'] {
  switch (status) {
    case 'success':
      return 'success';
    case 'canceled':
      return 'canceled';
    case 'error':
      return 'error';
    default:
      Logger.log('mapTokenizationStatus: Invalid status received', { status });
      return 'error';
  }
}

/** Create a standardized error result for wallet adapter methods */
export function createErrorResult(
  error: unknown,
  defaultCode: ProvisioningErrorCode = ProvisioningErrorCode.UNKNOWN_ERROR,
  defaultMessage?: string,
): ProvisioningResult {
  if (error instanceof ProvisioningError) {
    return { status: 'error', error };
  }

  const message =
    defaultMessage ??
    (error instanceof Error ? error.message : 'An unknown error occurred');
  const originalError = error instanceof Error ? error : undefined;

  return {
    status: 'error',
    error: new ProvisioningError(defaultCode, message, originalError),
  };
}

/**
 * Log an error with standardized format and send to Sentry
 *
 * Logs native SDK errors (like PKPassKitErrorDomain) to Sentry for debugging
 * while keeping them out of user-facing error messages.
 */
export function logAdapterError(
  adapterName: string,
  methodName: string,
  error: unknown,
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode =
    error instanceof ProvisioningError ? error.code : 'NATIVE_SDK_ERROR';

  const errorForSentry =
    error instanceof Error
      ? error
      : new Error(`${adapterName}.${methodName}: ${errorMessage}`);

  Logger.error(errorForSentry, {
    tags: {
      feature: 'push_provisioning',
      adapter: adapterName,
      method: methodName,
      error_code: String(errorCode),
    },
    context: {
      name: 'push_provisioning_error',
      data: {
        adapter: adapterName,
        method: methodName,
        errorMessage,
        errorCode,
      },
    },
  });
}

/** Validate TokenInfo from listTokens */
function isValidTokenInfo(token: unknown): token is TokenInfo {
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

/** Validate and filter token array from listTokens */
export function validateTokenArray(tokens: unknown): TokenInfo[] {
  if (!Array.isArray(tokens)) {
    Logger.log('validateTokenArray: Expected array, got', {
      type: typeof tokens,
    });
    return [];
  }

  return tokens.filter(isValidTokenInfo);
}
