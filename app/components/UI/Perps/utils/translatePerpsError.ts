import { strings } from '../../../../../locales/i18n';
import { hasProperty } from '@metamask/utils';
import {
  isPerpsErrorCode as isPerpsErrorCodeValue,
  PERPS_ERROR_CODES,
  type OrderResult,
  type PriceMovedErrorDetails,
  type PerpsErrorCode,
  type PerpsDebugLogger,
} from '@metamask/perps-controller';

/**
 * Optional debug logger for error handling functions.
 * When provided, enables detailed logging for debugging.
 */
export type ErrorHandlerDebugLogger = PerpsDebugLogger | undefined;

export interface PerpsErrorInput
  extends Pick<OrderResult, 'errorCode' | 'errorDetails'> {
  error: string;
  maxSlippageBps?: number;
  providerId?: string;
}

// Only the interpolation guard interprets details. Future controller variants
// must not prevent an otherwise valid code or message from being translated.
type NormalizedPerpsErrorInput = Omit<PerpsErrorInput, 'errorDetails'> & {
  errorDetails?: unknown;
};

const formatBpsAsPercent = (bps: number): number => Math.round(bps) / 100;

function isPriceMovedErrorDetails(
  value: unknown,
): value is PriceMovedErrorDetails {
  return (
    typeof value === 'object' &&
    value !== null &&
    hasProperty(value, 'code') &&
    value.code === PERPS_ERROR_CODES.PRICE_MOVED &&
    hasProperty(value, 'priceDeltaBps') &&
    typeof value.priceDeltaBps === 'number' &&
    hasProperty(value, 'maxSlippageBps') &&
    typeof value.maxSlippageBps === 'number' &&
    hasProperty(value, 'expectedPrice') &&
    typeof value.expectedPrice === 'number' &&
    hasProperty(value, 'currentPrice') &&
    typeof value.currentPrice === 'number'
  );
}

function isPerpsErrorInput(value: unknown): value is NormalizedPerpsErrorInput {
  if (
    typeof value !== 'object' ||
    value === null ||
    !hasProperty(value, 'error') ||
    typeof value.error !== 'string'
  ) {
    return false;
  }

  const hasValidCode =
    !hasProperty(value, 'errorCode') ||
    value.errorCode === undefined ||
    isPerpsErrorCodeValue(value.errorCode);
  const hasValidSlippage =
    !hasProperty(value, 'maxSlippageBps') ||
    value.maxSlippageBps === undefined ||
    typeof value.maxSlippageBps === 'number';
  const hasValidProviderId =
    !hasProperty(value, 'providerId') ||
    value.providerId === undefined ||
    typeof value.providerId === 'string';

  return hasValidCode && hasValidSlippage && hasValidProviderId;
}

const normalizePerpsError = (
  error: unknown,
): NormalizedPerpsErrorInput | null => {
  if (isPerpsErrorInput(error)) {
    return error;
  }
  if (error instanceof Error) {
    return { error: error.message };
  }
  if (typeof error === 'string') {
    return { error };
  }
  return null;
};

const getErrorInterpolationData = (
  errorInput: NormalizedPerpsErrorInput,
  context?: Record<string, unknown>,
): Record<string, unknown> => {
  const interpolationData: Record<string, unknown> = {};
  const { errorCode, errorDetails } = errorInput;

  if (
    isPriceMovedErrorDetails(errorDetails) &&
    Number.isFinite(errorDetails.priceDeltaBps) &&
    Number.isFinite(errorDetails.maxSlippageBps)
  ) {
    interpolationData.priceDelta = formatBpsAsPercent(
      errorDetails.priceDeltaBps,
    );
    interpolationData.maxSlippage = formatBpsAsPercent(
      errorDetails.maxSlippageBps,
    );
  } else if (
    typeof errorCode === 'string' &&
    (errorCode === PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE ||
      errorCode === PERPS_ERROR_CODES.PROVIDER_NOT_FOUND)
  ) {
    const providerId =
      context?.providerId ??
      (typeof errorInput.providerId === 'string' && errorInput.providerId
        ? errorInput.providerId
        : undefined);
    interpolationData.providerId =
      typeof providerId === 'string' && providerId.length > 0
        ? providerId
        : 'Unknown';
  } else if (errorCode === PERPS_ERROR_CODES.IOC_CANCEL) {
    const maxSlippageBps =
      errorInput.maxSlippageBps ??
      (typeof context?.maxSlippageBps === 'number'
        ? context.maxSlippageBps
        : undefined);
    if (maxSlippageBps !== undefined) {
      interpolationData.maxSlippage = formatBpsAsPercent(maxSlippageBps);
    }
  }

  return interpolationData;
};

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
  [PERPS_ERROR_CODES.PROVIDER_NOT_FOUND]: 'perps.errors.providerNotAvailable',
  [PERPS_ERROR_CODES.PROVIDER_ROUTE_REQUIRED]:
    'perps.errors.providerRouteRequired',
  [PERPS_ERROR_CODES.PROVIDER_LIFECYCLE_STALE]:
    'perps.errors.clientReinitializing',
  [PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED]: 'perps.errors.tokenNotSupported',
  [PERPS_ERROR_CODES.BRIDGE_CONTRACT_NOT_FOUND]:
    'perps.errors.bridgeContractNotFound',
  [PERPS_ERROR_CODES.WITHDRAW_FAILED]: 'perps.errors.withdrawFailed',
  [PERPS_ERROR_CODES.POSITIONS_FAILED]: 'perps.errors.positionsFailed',
  [PERPS_ERROR_CODES.POSITION_NOT_FOUND]: 'perps.errors.position_not_found',
  [PERPS_ERROR_CODES.ACCOUNT_STATE_FAILED]: 'perps.errors.accountStateFailed',
  [PERPS_ERROR_CODES.MARKETS_FAILED]: 'perps.errors.marketsFailed',
  [PERPS_ERROR_CODES.UNKNOWN_ERROR]: 'perps.errors.unknownError',
  [PERPS_ERROR_CODES.BATCH_INCOMPLETE]: 'perps.errors.batchIncomplete',
  [PERPS_ERROR_CODES.ORDERS_FAILED]: 'perps.errors.ordersFailed',
  [PERPS_ERROR_CODES.ORDER_NO_LONGER_OPEN]: 'perps.errors.orderNoLongerOpen',
  [PERPS_ERROR_CODES.LIQUIDATION_PRICE_UNAVAILABLE]:
    'perps.errors.liquidationPriceUnavailable',
  [PERPS_ERROR_CODES.ORDER_LEVERAGE_REDUCTION_FAILED]:
    'perps.errors.orderLeverageReductionFailed',
  [PERPS_ERROR_CODES.IOC_CANCEL]: 'perps.errors.iocCancel',
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
  [PERPS_ERROR_CODES.ORDER_MARGIN_MODE_INVALID]:
    'perps.errors.orderValidation.marginModeInvalid',
  [PERPS_ERROR_CODES.ORDER_MARGIN_MODE_UNSUPPORTED]:
    'perps.errors.orderValidation.marginModeUnsupported',
  [PERPS_ERROR_CODES.ORDER_MARGIN_MODE_POSITION_OPEN]:
    'perps.errors.orderValidation.marginModePositionOpen',
  [PERPS_ERROR_CODES.ORDER_MARGIN_MODE_ORDER_OPEN]:
    'perps.errors.orderValidation.marginModeOrderOpen',
  [PERPS_ERROR_CODES.ORDER_LEVERAGE_BELOW_POSITION]:
    'perps.order.validation.leverage_below_position',
  [PERPS_ERROR_CODES.ORDER_MAX_VALUE_EXCEEDED]:
    'perps.order.validation.max_order_value',
  // Trigger placement validation errors (stop / take profit order types)
  [PERPS_ERROR_CODES.ORDER_TRIGGER_PRICE_REQUIRED]:
    'perps.errors.orderValidation.triggerPriceRequired',
  [PERPS_ERROR_CODES.ORDER_TRIGGER_PRICE_POSITIVE]:
    'perps.errors.orderValidation.triggerPricePositive',
  [PERPS_ERROR_CODES.ORDER_TRIGGER_PRICE_NOT_SUPPORTED]:
    'perps.errors.orderValidation.triggerPriceNotSupported',
  [PERPS_ERROR_CODES.ORDER_TRIGGER_TPSL_UNSUPPORTED]:
    'perps.errors.orderValidation.triggerTpslUnsupported',
  [PERPS_ERROR_CODES.ORDER_TIME_IN_FORCE_NOT_SUPPORTED]:
    'perps.errors.orderValidation.timeInForceNotSupported',
  // Attached TP/SL validation errors
  [PERPS_ERROR_CODES.ORDER_TPSL_SIZE_INVALID]:
    'perps.errors.orderValidation.tpslSizeInvalid',
  [PERPS_ERROR_CODES.ORDER_TPSL_LINKAGE_CONFLICT]:
    'perps.errors.orderValidation.tpslLinkageConflict',
  [PERPS_ERROR_CODES.ORDER_TPSL_LINKAGE_REQUIRED]:
    'perps.errors.orderValidation.tpslLinkageRequired',
  [PERPS_ERROR_CODES.ORDER_TPSL_POSITION_LINKAGE_UNSUPPORTED]:
    'perps.errors.orderValidation.tpslPositionLinkageUnsupported',
  // Order edit errors
  [PERPS_ERROR_CODES.ORDER_EDIT_TRIGGER_UNSUPPORTED]:
    'perps.errors.orderValidation.editTriggerUnsupported',
  [PERPS_ERROR_CODES.ORDER_EDIT_ORDER_UNVERIFIABLE]:
    'perps.errors.orderValidation.editOrderUnverifiable',
  // Strategy placement validation errors (TWAP / scale / chase)
  [PERPS_ERROR_CODES.ORDER_STRATEGY_PARAMS_NOT_SUPPORTED]:
    'perps.errors.orderValidation.strategyParamsNotSupported',
  [PERPS_ERROR_CODES.ORDER_STRATEGY_FIELD_UNSUPPORTED]:
    'perps.errors.orderValidation.strategyFieldUnsupported',
  [PERPS_ERROR_CODES.ORDER_STRATEGY_MARKET_UNSUPPORTED]:
    'perps.errors.orderValidation.strategyMarketUnsupported',
  [PERPS_ERROR_CODES.ORDER_STRATEGY_ROUTE_UNAVAILABLE]:
    'perps.errors.orderValidation.strategyMarketUnsupported',
  [PERPS_ERROR_CODES.ORDER_STRATEGY_HANDLE_UNKNOWN]:
    'perps.errors.orderValidation.strategyHandleUnknown',
  [PERPS_ERROR_CODES.ORDER_STRATEGY_CANCEL_INCOMPLETE]:
    'perps.errors.orderValidation.strategyCancelIncomplete',
  [PERPS_ERROR_CODES.ORDER_EDIT_STRATEGY_UNSUPPORTED]:
    'perps.errors.orderValidation.strategyEditUnsupported',
  [PERPS_ERROR_CODES.ORDER_TWAP_DURATION_REQUIRED]:
    'perps.errors.orderValidation.twapDurationRequired',
  [PERPS_ERROR_CODES.ORDER_TWAP_DURATION_INVALID]:
    'perps.errors.orderValidation.twapDurationInvalid',
  [PERPS_ERROR_CODES.ORDER_TWAP_NOTIONAL_TOO_SMALL]:
    'perps.errors.orderValidation.twapNotionalTooSmall',
  [PERPS_ERROR_CODES.ORDER_SCALE_RANGE_REQUIRED]:
    'perps.errors.orderValidation.scaleRangeRequired',
  [PERPS_ERROR_CODES.ORDER_SCALE_RANGE_INVALID]:
    'perps.errors.orderValidation.scaleRangeInvalid',
  [PERPS_ERROR_CODES.ORDER_SCALE_COUNT_INVALID]:
    'perps.errors.orderValidation.scaleCountInvalid',
  [PERPS_ERROR_CODES.ORDER_SCALE_SIZE_TOO_SMALL]:
    'perps.errors.orderValidation.scaleSizeTooSmall',
  [PERPS_ERROR_CODES.ORDER_SCALE_NOTIONAL_TOO_SMALL]:
    'perps.errors.orderValidation.scaleNotionalTooSmall',
  [PERPS_ERROR_CODES.ORDER_SCALE_PREVIEW_STALE]:
    'perps.errors.orderValidation.scalePreviewStale',
  // Internal scale-order failures; not caused by user input
  [PERPS_ERROR_CODES.ORDER_SCALE_SIZE_CONSERVATION_FAILED]:
    'perps.errors.orderValidation.scaleSizeConservationFailed',
  [PERPS_ERROR_CODES.ORDER_SCALE_EXPOSURE_EXCEEDS_INTENT]:
    'perps.errors.orderValidation.scaleExposureExceedsIntent',
  [PERPS_ERROR_CODES.ORDER_CHASE_INTERVAL_INVALID]:
    'perps.errors.orderValidation.chaseIntervalInvalid',
  [PERPS_ERROR_CODES.ORDER_CHASE_DURATION_INVALID]:
    'perps.errors.orderValidation.chaseDurationInvalid',
  [PERPS_ERROR_CODES.ORDER_CHASE_LIMIT_REACHED]:
    'perps.errors.orderValidation.chaseLimitReached',
  [PERPS_ERROR_CODES.ORDER_CHASE_ABANDONED]:
    'perps.errors.orderValidation.chaseAbandoned',
  [PERPS_ERROR_CODES.ORDER_CHASE_TOUCH_UNAVAILABLE]:
    'perps.errors.orderValidation.chaseTouchUnavailable',
  [PERPS_ERROR_CODES.ORDER_CHASE_MAX_DISTANCE_INVALID]:
    'perps.errors.orderValidation.chaseMaxDistanceInvalid',
  // HyperLiquid client/service errors
  [PERPS_ERROR_CODES.EXCHANGE_CLIENT_NOT_AVAILABLE]:
    'perps.errors.exchangeClientNotAvailable',
  [PERPS_ERROR_CODES.EXCHANGE_ACCOUNT_NOT_FOUND]:
    'perps.errors.exchangeAccountNotFound',
  [PERPS_ERROR_CODES.EXCHANGE_MULTI_SIG_REQUIRED]:
    'perps.errors.exchangeMultiSigRequired',
  [PERPS_ERROR_CODES.EXCHANGE_INVALID_NONCE]:
    'perps.errors.exchangeInvalidNonce',
  [PERPS_ERROR_CODES.INFO_CLIENT_NOT_AVAILABLE]:
    'perps.errors.infoClientNotAvailable',
  [PERPS_ERROR_CODES.SUBSCRIPTION_CLIENT_NOT_AVAILABLE]:
    'perps.errors.subscriptionClientNotAvailable',
  // Wallet/account errors
  [PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED]: 'perps.errors.noAccountSelected',
  // Keyring locked errors are handled silently in ensure* methods; never shown to users
  [PERPS_ERROR_CODES.KEYRING_LOCKED]: 'perps.errors.unknownError',
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
  // Position/margin errors
  [PERPS_ERROR_CODES.INSUFFICIENT_MARGIN]: 'perps.errors.insufficientMargin',
  [PERPS_ERROR_CODES.INSUFFICIENT_BALANCE]: 'perps.errors.insufficientBalance',
  [PERPS_ERROR_CODES.REDUCE_ONLY_VIOLATION]: 'perps.errors.reduceOnlyViolation',
  [PERPS_ERROR_CODES.POSITION_WOULD_FLIP]: 'perps.errors.positionWouldFlip',
  [PERPS_ERROR_CODES.MARGIN_ADJUSTMENT_FAILED]:
    'perps.errors.marginAdjustmentFailed',
  [PERPS_ERROR_CODES.TPSL_UPDATE_FAILED]: 'perps.errors.tpslUpdateFailed',
  [PERPS_ERROR_CODES.TPSL_PROTECTION_LOST]: 'perps.errors.tpslUpdateFailed',
  [PERPS_ERROR_CODES.TPSL_LEG_REPLACE_UNSUPPORTED]:
    'perps.errors.tpslLegReplaceUnsupported',
  // Post-only rejections
  [PERPS_ERROR_CODES.ORDER_POST_ONLY_WOULD_CROSS]:
    'perps.errors.postOnlyWouldCross',
  [PERPS_ERROR_CODES.ORDER_POST_ONLY_WINDOW]: 'perps.errors.postOnlyWindow',
  // Order execution errors
  [PERPS_ERROR_CODES.ORDER_REJECTED]: 'perps.errors.orderRejected',
  [PERPS_ERROR_CODES.SLIPPAGE_EXCEEDED]: 'perps.errors.slippageExceeded',
  [PERPS_ERROR_CODES.PRICE_MOVED]: 'perps.errors.priceMoved',
  [PERPS_ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'perps.errors.rateLimitExceeded',
  // Network/service errors
  [PERPS_ERROR_CODES.SERVICE_UNAVAILABLE]: 'perps.errors.serviceUnavailable',
  [PERPS_ERROR_CODES.NETWORK_ERROR]: 'perps.errors.networkErrorSimple',
  [PERPS_ERROR_CODES.UNSUPPORTED_COLLATERAL]:
    'perps.errors.unsupportedCollateral',
};

const getErrorI18nKey = (
  errorCode: PerpsErrorCode,
  interpolationData: Record<string, unknown>,
): string =>
  errorCode === PERPS_ERROR_CODES.IOC_CANCEL &&
  interpolationData.maxSlippage === undefined
    ? 'perps.errors.iocCancelUnknownTolerance'
    : ERROR_CODE_TO_I18N_KEY[errorCode];

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

  const errorInput = normalizePerpsError(error);
  if (!errorInput) {
    return strings('perps.errors.unknownError');
  }
  const errorCode =
    errorInput.errorCode ??
    (isPerpsErrorCodeValue(errorInput.error) ? errorInput.error : undefined);
  const interpolationData = {
    ...getErrorInterpolationData(
      errorCode ? { ...errorInput, errorCode } : errorInput,
    ),
    ...data,
  };

  if (errorCode) {
    return strings(
      getErrorI18nKey(errorCode, interpolationData),
      interpolationData,
    );
  }

  // Unrecognized text is never shown. It can be a venue diagnostic that Core
  // has not classified yet, so the user gets the same retryable fallback as
  // UNKNOWN_ERROR.
  return strings('perps.errors.unknownError');
}

/**
 * Checks if an error is a specific PerpsError code
 */
export function isPerpsErrorCode(
  error: unknown,
  code: PerpsErrorCode,
): boolean {
  const errorInput = normalizePerpsError(error);
  return (errorInput?.errorCode ?? errorInput?.error) === code;
}

/**
 * True when the venue rejected the request because the position was already
 * filled, closed, or liquidated — a stale-state race, not a user-side failure.
 */
export function isNoPositionFoundError(error: unknown): boolean {
  return isPerpsErrorCode(error, PERPS_ERROR_CODES.POSITION_NOT_FOUND);
}

/** True when Core reports a post-only window rejection. */
export function isPostOnlyWindowError(error: unknown): boolean {
  return isPerpsErrorCode(error, PERPS_ERROR_CODES.ORDER_POST_ONLY_WINDOW);
}

/** True when Core reports a post-only order that would cross the spread. */
export function isPostOnlyWouldCrossError(error: unknown): boolean {
  return isPerpsErrorCode(error, PERPS_ERROR_CODES.ORDER_POST_ONLY_WOULD_CROSS);
}

/** Why an order edit was refused, and what happened to the order it replaced. */
export interface OrderEditRejection {
  reason: 'post_only_would_cross' | 'other';
  originalOrder: 'cancelled' | 'retained';
  error?: string;
}

/**
 * Normalizes a refused order edit for the UI. HyperLiquid cancels the original
 * order when its post-only replacement is rejected, so that outcome reports a
 * cancelled original.
 *
 * Core classifies the venue rejection as `ORDER_POST_ONLY_WOULD_CROSS` before
 * returning it to the client.
 *
 * @param error - The failed edit result, error code, or Error object.
 */
export function normalizeOrderEditRejection(
  error?: unknown,
): OrderEditRejection {
  const message = normalizePerpsError(error)?.error;
  return isPostOnlyWouldCrossError(error)
    ? {
        reason: 'post_only_would_cross',
        originalOrder: 'cancelled',
        error: message,
      }
    : { reason: 'other', originalOrder: 'retained', error: message };
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
    maxSlippageBps?: number;
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

  const parsedError = normalizePerpsError(error);
  if (!parsedError) {
    return fallbackMessage || strings('perps.errors.unknownError');
  }
  const errorString = parsedError.error;
  const errorCode =
    parsedError.errorCode ??
    (isPerpsErrorCodeValue(errorString) ? errorString : undefined);
  const normalizedError = errorCode
    ? { ...parsedError, errorCode }
    : parsedError;
  const errorParams = getErrorInterpolationData(normalizedError, context);

  // Log error for debugging (without event tracking)
  debugLogger?.log('PerpsErrorHandler: Error encountered', {
    errorMessage: errorString,
    context,
    stack: error instanceof Error ? error.stack : undefined,
  });

  // Check if it's a Core PerpsController or Perps Provider error code
  if (errorCode && errorCode in ERROR_CODE_TO_I18N_KEY) {
    // Map error codes to their required parameters
    switch (errorCode) {
      case PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED:
        errorParams.token = context?.token || 'Unknown';
        break;
      case PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE:
      case PERPS_ERROR_CODES.PROVIDER_NOT_FOUND:
        // getErrorInterpolationData already resolved providerId.
        break;
      // Add other error codes that need parameters as they arise
      default:
        // Pass through any provided context as-is for other errors
        Object.assign(errorParams, context || {});
        break;
    }

    const i18nKey = getErrorI18nKey(errorCode, errorParams);
    return strings(i18nKey, errorParams);
  }

  // For any other error/error string that was not matched, use fallback
  // Important: Always prefer fallback over raw error strings for better UX
  if (fallbackMessage) {
    debugLogger?.log('PerpsErrorHandler: Using fallback message', {
      originalError: errorString,
      fallbackMessage,
    });
    return fallbackMessage;
  }

  // Last resort: return the generic unknown error message
  // Avoid showing raw technical error strings to users
  debugLogger?.log('PerpsErrorHandler: No match found, using generic error', {
    originalError: errorString,
  });
  return strings('perps.errors.unknownError');
}
