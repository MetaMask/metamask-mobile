import { strings } from '../../../../../locales/i18n';
import {
  PERPS_ERROR_CODES,
  type PerpsErrorCode,
} from '../controllers/PerpsController';

/**
 * Maps error codes to i18n keys
 */
const ERROR_CODE_TO_I18N_KEY: Record<PerpsErrorCode, string> = {
  [PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED]:
    'perps.errors.clientNotInitialized',
  [PERPS_ERROR_CODES.CLIENT_REINITIALIZING]:
    'perps.errors.clientReinitializing',
  [PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE]:
    'perps.errors.providerNotAvailable',
  [PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED]: 'perps.errors.tokenNotSupported',
  [PERPS_ERROR_CODES.BRIDGE_CONTRACT_NOT_FOUND]:
    'perps.errors.bridgeContractNotFound',
  [PERPS_ERROR_CODES.WITHDRAW_FAILED]: 'perps.errors.withdrawFailed',
  [PERPS_ERROR_CODES.POSITIONS_FAILED]: 'perps.errors.positionsFailed',
  [PERPS_ERROR_CODES.ACCOUNT_STATE_FAILED]: 'perps.errors.accountStateFailed',
  [PERPS_ERROR_CODES.MARKETS_FAILED]: 'perps.errors.marketsFailed',
  [PERPS_ERROR_CODES.UNKNOWN_ERROR]: 'perps.errors.unknownError',
};

/**
 * Translates an error code to a localized message
 * @param error - Error code string, Error object, or any error
 * @param data - Optional data for interpolation in error messages
 * @returns Localized error message
 */
export function translatePerpsError(
  error: string | Error | unknown,
  data?: Record<string, unknown>,
): string {
  // Handle error code strings
  if (typeof error === 'string' && error in ERROR_CODE_TO_I18N_KEY) {
    const i18nKey = ERROR_CODE_TO_I18N_KEY[error as PerpsErrorCode];
    return strings(i18nKey, data || {});
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Check if error message is an error code
    if (error.message in ERROR_CODE_TO_I18N_KEY) {
      const i18nKey = ERROR_CODE_TO_I18N_KEY[error.message as PerpsErrorCode];
      return strings(i18nKey, data || {});
    }
    return error.message;
  }

  // Handle string errors that might be error codes
  if (typeof error === 'string') {
    return error;
  }

  // Default fallback
  return strings('perps.errors.unknownError');
}

/**
 * Checks if an error is a specific PerpsError code
 */
export function isPerpsErrorCode(
  error: unknown,
  code: PerpsErrorCode,
): boolean {
  if (error instanceof Error && error.message === code) {
    return true;
  }

  return error === code;
}
