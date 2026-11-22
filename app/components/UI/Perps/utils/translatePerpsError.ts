import { strings } from '../../../../../locales/i18n';
import { hasProperty } from '@metamask/utils';
import {
  getPerpsErrorCopy,
  isPerpsErrorCode as isPerpsErrorCodeValue,
  PERPS_ERROR_CODES,
  type PerpsErrorDetails,
  type PerpsErrorCode,
  type PerpsDebugLogger,
} from '@metamask/perps-controller';

/**
 * Optional debug logger for error handling functions.
 * When provided, enables detailed logging for debugging.
 */
export type ErrorHandlerDebugLogger = PerpsDebugLogger | undefined;

export interface PerpsErrorInput {
  error: string;
  errorCode?: PerpsErrorCode;
  errorDetails?: PerpsErrorDetails;
  maxSlippageBps?: number;
}

const formatBpsAsPercent = (bps: number): number => Math.round(bps) / 100;

function isPerpsErrorDetails(value: unknown): value is PerpsErrorDetails {
  if (
    typeof value !== 'object' ||
    value === null ||
    !hasProperty(value, 'code')
  ) {
    return false;
  }
  if (value.code !== PERPS_ERROR_CODES.PRICE_MOVED) {
    return (
      isPerpsErrorCodeValue(value.code) &&
      hasProperty(value, 'provider') &&
      value.provider === 'hyperliquid'
    );
  }
  return (
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

function isPerpsErrorInput(value: unknown): value is PerpsErrorInput {
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
  const hasValidDetails =
    !hasProperty(value, 'errorDetails') ||
    value.errorDetails === undefined ||
    isPerpsErrorDetails(value.errorDetails);
  const hasValidSlippage =
    !hasProperty(value, 'maxSlippageBps') ||
    value.maxSlippageBps === undefined ||
    typeof value.maxSlippageBps === 'number';

  return hasValidCode && hasValidDetails && hasValidSlippage;
}

const normalizePerpsError = (error: unknown): PerpsErrorInput | null => {
  if (isPerpsErrorInput(error)) {
    return error;
  }
  if (error instanceof Error) {
    return {
      error: error.message,
      errorCode:
        hasProperty(error, 'errorCode') &&
        isPerpsErrorCodeValue(error.errorCode)
          ? error.errorCode
          : undefined,
      errorDetails:
        hasProperty(error, 'errorDetails') &&
        isPerpsErrorDetails(error.errorDetails)
          ? error.errorDetails
          : undefined,
    };
  }
  if (typeof error === 'string') {
    return { error };
  }
  return null;
};

const getErrorInterpolationData = (
  errorInput: PerpsErrorInput,
  context?: Record<string, unknown>,
): Record<string, unknown> => {
  const interpolationData: Record<string, unknown> = {};
  const { errorCode, errorDetails } = errorInput;

  if (
    errorDetails?.code === PERPS_ERROR_CODES.PRICE_MOVED &&
    Number.isFinite(errorDetails.priceDeltaBps) &&
    Number.isFinite(errorDetails.maxSlippageBps)
  ) {
    interpolationData.priceDelta = formatBpsAsPercent(
      errorDetails.priceDeltaBps,
    );
    interpolationData.maxSlippage = formatBpsAsPercent(
      errorDetails.maxSlippageBps,
    );
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

const getErrorI18nKey = (
  errorCode: PerpsErrorCode,
  interpolationData: Record<string, unknown>,
): string =>
  errorCode === PERPS_ERROR_CODES.IOC_CANCEL &&
  interpolationData.maxSlippage === undefined
    ? 'perps.errors.iocCancelUnknownTolerance'
    : getPerpsErrorCopy(errorCode).key;

/**
 * Prose fallback for failures that reach the client without an error code.
 * Venue rejections (margin, balance, slippage, IOC, rate limit, network,
 * post-only, no position, ...) are not listed: providers classify them into
 * `errorCode` (Core `normalizeHyperLiquidError`). These messages have no Core
 * classifier yet.
 *
 * IMPORTANT: Order matters - more specific patterns MUST come before general ones.
 */
const API_ERROR_PATTERNS: {
  pattern: RegExp;
  errorCode: PerpsErrorCode;
}[] = [
  // Data errors
  {
    pattern:
      /spot pair not found|trading pair not found|USDH.*USDC.*not found/i,
    errorCode: PERPS_ERROR_CODES.SPOT_PAIR_NOT_FOUND,
  },
  {
    pattern: /no price available|price unavailable|price data unavailable/i,
    errorCode: PERPS_ERROR_CODES.PRICE_UNAVAILABLE,
  },

  // Batch operation errors - use specific patterns to avoid matching single-order errors
  // e.g., "Order cancellation failed" should NOT match batch cancel
  {
    pattern: /batch cancel|cancel all|bulk cancel|multiple.*cancel/i,
    errorCode: PERPS_ERROR_CODES.BATCH_CANCEL_FAILED,
  },
  {
    pattern: /batch close|close all|bulk close|multiple.*close/i,
    errorCode: PERPS_ERROR_CODES.BATCH_CLOSE_FAILED,
  },

  // === GENERIC PATTERNS LAST ===
  {
    pattern: /transfer failed/i,
    errorCode: PERPS_ERROR_CODES.TRANSFER_FAILED,
  },
  {
    pattern: /swap failed/i,
    errorCode: PERPS_ERROR_CODES.SWAP_FAILED,
  },
];

/**
 * Attempts to match an error string against known API error patterns.
 * @param errorString - The error message to match
 * @returns The matched error code or null if no match found
 */
function matchApiErrorPattern(errorString: string): PerpsErrorCode | null {
  for (const { pattern, errorCode } of API_ERROR_PATTERNS) {
    if (pattern.test(errorString)) {
      return errorCode;
    }
  }
  return null;
}

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

  const matchedErrorCode = matchApiErrorPattern(errorInput.error);
  if (matchedErrorCode) {
    return strings(
      getErrorI18nKey(matchedErrorCode, interpolationData),
      interpolationData,
    );
  }

  return errorInput.error;
}

/**
 * Checks if an error is a specific PerpsError code
 */
export function isPerpsErrorCode(
  error: unknown,
  code: PerpsErrorCode,
): boolean {
  const errorInput = normalizePerpsError(error);
  return Boolean(
    errorInput &&
      code &&
      (errorInput.errorCode === code || errorInput.error === code),
  );
}

/**
 * True when the venue rejected the request because the position was already
 * filled, closed, or liquidated — a stale-state race, not a user-side failure.
 */
export function isNoPositionFoundError(error: unknown): boolean {
  return isPerpsErrorCode(error, PERPS_ERROR_CODES.POSITION_NOT_FOUND);
}

/** True when the venue refused the order because of its post-only window. */
export function isPostOnlyWindowError(error: unknown): boolean {
  return isPerpsErrorCode(error, PERPS_ERROR_CODES.ORDER_POST_ONLY_WINDOW);
}

/** True when the venue refused a post-only order that would cross the spread. */
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
 */
export function normalizeOrderEditRejection(
  failure: unknown,
): OrderEditRejection {
  const error = normalizePerpsError(failure)?.error;
  return isPostOnlyWouldCrossError(failure)
    ? { reason: 'post_only_would_cross', originalOrder: 'cancelled', error }
    : { reason: 'other', originalOrder: 'retained', error };
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
  if (errorCode) {
    // Map error codes to their required parameters
    switch (errorCode) {
      case PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED:
        errorParams.token = context?.token || 'Unknown';
        break;
      case PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE:
      case PERPS_ERROR_CODES.PROVIDER_NOT_FOUND:
        errorParams.providerId = context?.providerId || 'Unknown';
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

  // Try pattern matching for API error messages
  if (errorString) {
    const matchedErrorCode = matchApiErrorPattern(errorString);
    if (matchedErrorCode) {
      debugLogger?.log('PerpsErrorHandler: Matched error pattern', {
        originalError: errorString,
        matchedCode: matchedErrorCode,
      });

      const i18nKey = getErrorI18nKey(matchedErrorCode, errorParams);
      // Pass through any provided context for interpolation
      return strings(i18nKey, context || {});
    }
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
