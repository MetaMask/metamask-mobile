import { strings } from '../../../../../locales/i18n';
import { hasProperty } from '@metamask/utils';
import {
  getPerpsErrorCopy,
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

// Core maps these internal scale failures to the generic unknown error; Mobile
// has its own copy for them.
const MOBILE_ERROR_COPY: Partial<Record<PerpsErrorCode, string>> = {
  [PERPS_ERROR_CODES.ORDER_SCALE_SIZE_CONSERVATION_FAILED]:
    'perps.errors.orderValidation.scaleSizeConservationFailed',
  [PERPS_ERROR_CODES.ORDER_SCALE_EXPOSURE_EXCEEDS_INTENT]:
    'perps.errors.orderValidation.scaleExposureExceedsIntent',
};

const getErrorI18nKey = (
  errorCode: PerpsErrorCode,
  interpolationData: Record<string, unknown>,
): string =>
  errorCode === PERPS_ERROR_CODES.IOC_CANCEL &&
  interpolationData.maxSlippage === undefined
    ? 'perps.errors.iocCancelUnknownTolerance'
    : (MOBILE_ERROR_COPY[errorCode] ?? getPerpsErrorCopy(errorCode).key);

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
  if (isPerpsErrorCodeValue(errorCode)) {
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
