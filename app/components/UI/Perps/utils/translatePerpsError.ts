import { strings } from '../../../../../locales/i18n';
import {
  PERPS_ERROR_CODES,
  type PerpsErrorCode,
} from '../controllers/perpsErrorCodes';
import type { IPerpsDebugLogger } from '../controllers/types';

/**
 * Optional debug logger for error handling functions.
 * When provided, enables detailed logging for debugging.
 */
export type ErrorHandlerDebugLogger = IPerpsDebugLogger | undefined;

/**
 * Maps error codes to i18n keys
 */
export const ERROR_CODE_TO_I18N_KEY: Record<PerpsErrorCode, string> = {
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
  [PERPS_ERROR_CODES.IOC_CANCEL]: 'perps.errors.insufficientLiquidity',
  [PERPS_ERROR_CODES.CONNECTION_TIMEOUT]: 'perps.errors.connectionTimeout',
  // Withdraw validation errors
  [PERPS_ERROR_CODES.WITHDRAW_ASSET_ID_REQUIRED]:
    'perps.errors.withdrawValidation.assetIdRequired',
  [PERPS_ERROR_CODES.WITHDRAW_AMOUNT_REQUIRED]:
    'perps.errors.withdrawValidation.amountRequired',
  [PERPS_ERROR_CODES.WITHDRAW_AMOUNT_POSITIVE]:
    'perps.errors.withdrawValidation.amountPositive',
  [PERPS_ERROR_CODES.WITHDRAW_INVALID_DESTINATION]:
    'perps.errors.withdrawValidation.invalidDestination',
  [PERPS_ERROR_CODES.WITHDRAW_ASSET_NOT_SUPPORTED]:
    'perps.errors.withdrawValidation.assetNotSupported',
  [PERPS_ERROR_CODES.WITHDRAW_INSUFFICIENT_BALANCE]:
    'perps.errors.withdrawValidation.insufficientBalance',
  // Deposit validation errors
  [PERPS_ERROR_CODES.DEPOSIT_ASSET_ID_REQUIRED]:
    'perps.errors.depositValidation.assetIdRequired',
  [PERPS_ERROR_CODES.DEPOSIT_AMOUNT_REQUIRED]:
    'perps.errors.depositValidation.amountRequired',
  [PERPS_ERROR_CODES.DEPOSIT_AMOUNT_POSITIVE]:
    'perps.errors.depositValidation.amountPositive',
  [PERPS_ERROR_CODES.DEPOSIT_MINIMUM_AMOUNT]: 'perps.errors.minimumDeposit',
  // Order validation errors
  [PERPS_ERROR_CODES.ORDER_COIN_REQUIRED]:
    'perps.errors.orderValidation.coinRequired',
  [PERPS_ERROR_CODES.ORDER_LIMIT_PRICE_REQUIRED]:
    'perps.errors.orderValidation.limitPriceRequired',
  [PERPS_ERROR_CODES.ORDER_PRICE_POSITIVE]:
    'perps.errors.orderValidation.pricePositive',
  [PERPS_ERROR_CODES.ORDER_UNKNOWN_COIN]:
    'perps.errors.orderValidation.unknownCoin',
  [PERPS_ERROR_CODES.ORDER_SIZE_POSITIVE]:
    'perps.errors.orderValidation.sizePositive',
  [PERPS_ERROR_CODES.ORDER_PRICE_REQUIRED]:
    'perps.order.validation.price_required',
  [PERPS_ERROR_CODES.ORDER_SIZE_MIN]: 'perps.order.validation.minimum_amount',
  [PERPS_ERROR_CODES.ORDER_LEVERAGE_INVALID]:
    'perps.order.validation.invalid_leverage',
  [PERPS_ERROR_CODES.ORDER_LEVERAGE_BELOW_POSITION]:
    'perps.order.validation.leverage_below_position',
  [PERPS_ERROR_CODES.ORDER_MAX_VALUE_EXCEEDED]:
    'perps.order.validation.max_order_value',
  // HyperLiquid client/service errors
  [PERPS_ERROR_CODES.EXCHANGE_CLIENT_NOT_AVAILABLE]:
    'perps.errors.exchangeClientNotAvailable',
  [PERPS_ERROR_CODES.INFO_CLIENT_NOT_AVAILABLE]:
    'perps.errors.infoClientNotAvailable',
  [PERPS_ERROR_CODES.SUBSCRIPTION_CLIENT_NOT_AVAILABLE]:
    'perps.errors.subscriptionClientNotAvailable',
  // Wallet/account errors
  [PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED]: 'perps.errors.noAccountSelected',
  [PERPS_ERROR_CODES.INVALID_ADDRESS_FORMAT]:
    'perps.errors.invalidAddressFormat',
  // Transfer/swap errors
  [PERPS_ERROR_CODES.TRANSFER_FAILED]: 'perps.errors.transferFailed',
  [PERPS_ERROR_CODES.SWAP_FAILED]: 'perps.errors.swapFailed',
  [PERPS_ERROR_CODES.SPOT_PAIR_NOT_FOUND]: 'perps.errors.spotPairNotFound',
  [PERPS_ERROR_CODES.PRICE_UNAVAILABLE]: 'perps.errors.priceUnavailable',
  // Batch operation errors
  [PERPS_ERROR_CODES.BATCH_CANCEL_FAILED]: 'perps.errors.batchCancelFailed',
  [PERPS_ERROR_CODES.BATCH_CLOSE_FAILED]: 'perps.errors.batchCloseFailed',
};

/**
 * Translates an error code to a localized message
 * @param error - Error code string, Error object, or any other value
 * @param data - Optional data for interpolation in error messages
 * @returns Localized error message
 */
export function translatePerpsError(
  error: unknown,
  data?: Record<string, unknown>,
): string {
  // Handle null or undefined
  if (error === null || error === undefined) {
    return strings('perps.errors.unknownError');
  }

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

  // Handle objects, numbers, and other types
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
  debugLogger?: ErrorHandlerDebugLogger;
}

/**
 * Centralized handler for PerpsController errors with context-aware parameter mapping
 * @param params - Object containing error, optional context, optional fallback message, and optional debug logger
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
  const { error, context, fallbackMessage, debugLogger } = params;

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
  debugLogger?.log('PerpsErrorHandler: Error encountered', {
    errorMessage: errorString,
    context,
    stack: error instanceof Error ? error.stack : undefined,
  });

  // Check if it's a Core PerpsController or Perps Provider error code
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

    const i18nKey = ERROR_CODE_TO_I18N_KEY[errorString as PerpsErrorCode];
    return strings(i18nKey, errorParams);
  }

  // For any other error/error string that was not matched, use fallback if provided
  if (errorString) {
    return fallbackMessage || errorString;
  }

  // if we ever get here, return fallback or unknown error
  return fallbackMessage || strings('perps.errors.unknownError');
}
