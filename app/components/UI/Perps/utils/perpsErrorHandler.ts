import { strings } from '../../../../../locales/i18n';
import {
  PERPS_ERROR_CODES,
  type PerpsErrorCode,
} from '../controllers/PerpsController';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

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
  [PERPS_ERROR_CODES.ORDER_LEVERAGE_REDUCTION_FAILED]:
    'perps.errors.orderLeverageReductionFailed',
};

/**
 * Parameters for translating Perps errors
 */
export interface TranslatePerpsErrorParams {
  error: string | Error;
  data?: Record<string, unknown>;
  fallbackMessage?: string;
}

/**
 * Translates an error code to a localized message
 * @param params - Object containing error and optional data for interpolation
 * @returns Localized error message
 */
export function translatePerpsError(params: TranslatePerpsErrorParams): string {
  const { error, data, fallbackMessage } = params;

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
    return fallbackMessage || error.message;
  }

  // Handle string errors that might be error codes
  if (typeof error === 'string') {
    return fallbackMessage || error;
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

/**
 * Parameters for handling Perps errors
 */
export interface HandlePerpsErrorParams {
  error: unknown;
  context?: {
    providerId?: string;
    token?: string;
    amount?: string;
    symbol?: string;
    address?: string;
    available?: string;
    requested?: string;
    assetId?: string;
    supportedAssets?: string;
    method?: string;
  };
  fallbackMessage?: string;
}

/**
 * Centralized handler for PerpsController errors with context-aware parameter mapping
 * @param params - Object containing error, optional context, and optional fallback message
 * @returns Localized error message with proper interpolation
 *
 * @example
 * const errorMessage = handlePerpsError({
 *   error: depositResult.error,
 *   context: { token: 'USDT' },
 *   fallbackMessage: 'Deposit failed'
 * });
 */
export function handlePerpsError(params: HandlePerpsErrorParams): string {
  const { error, context, fallbackMessage } = params;

  // Handle null/undefined errors with fallback
  if (!error) {
    return fallbackMessage || strings('perps.errors.unknownError');
  }

  // Extract error string from Error objects or use as-is
  let errorString: string | null = null;

  if (error instanceof Error) {
    errorString = error.message;
  } else if (typeof error === 'string') {
    errorString = error;
  }

  // Log error for debugging (without event tracking)
  DevLogger.log('PerpsErrorHandler: Error encountered', {
    errorMessage: errorString,
    context,
    stack: error instanceof Error ? error.stack : undefined,
  });

  // Check if it's a PerpsController error code
  if (
    errorString &&
    Object.values(PERPS_ERROR_CODES).includes(errorString as PerpsErrorCode)
  ) {
    // Map error codes to their required parameters
    const errorParams: Record<string, unknown> = {};

    switch (errorString) {
      case PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED:
        errorParams.token = context?.token || 'Unknown';
        break;
      case PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE:
        errorParams.providerId = context?.providerId || 'Unknown';
        break;
      // Add other error codes that need parameters as they arise
      default:
        // Pass through any provided context as-is for other errors
        Object.assign(errorParams, context || {});
        break;
    }

    return translatePerpsError({
      error: errorString,
      data: errorParams,
      fallbackMessage,
    });
  }

  // For non-PerpsController errors, return as-is or use fallback
  if (errorString) {
    return errorString;
  }

  return fallbackMessage || strings('perps.errors.unknownError');
}
