import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { addBreadcrumb } from '@sentry/react-native';
import { strings } from '../../../../../locales/i18n';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Logger, { type LoggerErrorOptions } from '../../../../util/Logger';
import {
  getPredictErrorMessages,
  PREDICT_CONSTANTS,
  PREDICT_ERROR_CODES,
} from '../constants/errors';
import { PlaceOrderOutcome } from '../hooks/usePredictPlaceOrder';
import { PlaceOrderParams } from '../types';

/**
 * Ensures we have a proper Error object for logging
 * Converts unknown/string errors to proper Error instances
 * @param error - The caught error (could be Error, string, or unknown)
 * @returns A proper Error instance
 */
export function ensureError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

/**
 * iOS URLSession connectivity codes. Numeric NSURLErrorDomain codes survive
 * localization, unlike English connectivity phrases.
 *
 * Left as errors on purpose: -999 cancelled, -1011 bad server response,
 * -1013 auth required, -1018 roaming off, -1020 data not allowed, -1022 ATS,
 * -1200 secure connection failed, -1202 to -1206 certificate. Android
 * net::ERR_CERT_* and net::ERR_SSL_* are the same failure class and also
 * stay errors.
 */
const IOS_CONNECTIVITY_ERROR_CODES = {
  timedOut: -1001,
  cannotFindHost: -1003,
  cannotConnectToHost: -1004,
  networkConnectionLost: -1005,
  notConnectedToInternet: -1009,
} as const;

const IOS_CONNECTIVITY_ERROR_PATTERN = new RegExp(
  String.raw`NSURLErrorDomain Code=(${Object.values(IOS_CONNECTIVITY_ERROR_CODES).join('|')})\b`,
  'u',
);

/**
 * Patterns that identify transient connectivity failures rather than
 * application bugs. These surface differently across transports
 * (Android Cronet via nitro-fetch, RN default fetch, iOS URLSession) so we
 * match on the substrings each of them emits.
 *
 * Reported as breadcrumbs/warnings instead of Sentry errors, since they are
 * driven by the user's network conditions (DNS failures, timeouts, offline)
 * and are not actionable as crashes.
 */
const NETWORK_ERROR_PATTERNS: RegExp[] = [
  // Chromium/Cronet (Android nitro-fetch) net::ERR_* codes
  /net::ERR_/iu,
  /Cronet failed/iu,
  // React Native default fetch (OkHttp / iOS). Note: we intentionally do NOT
  // match the browser-only "Failed to fetch" phrasing here, because the Predict
  // providers throw many app-level errors like "Failed to fetch related tags"
  // for non-OK HTTP responses, which are actionable and must reach Sentry.
  /Network request failed/iu,
  // Common cross-platform connectivity phrases
  /connection (was |)(timed out|refused|reset|closed)/iu,
  // Request timeouts only. A bare "timeout" also matches response bodies.
  /request tim(ed |e)?out/iu,
  /network is unreachable/iu,
  /(the )?internet connection appears to be offline/iu,
  /name (not resolved|resolution failed)/iu,
  /could not (connect|resolve host)/iu,
  IOS_CONNECTIVITY_ERROR_PATTERN,
];

// shortcut: status is read from "failed: <code>" text, upgrade when errors carry status.
const HTTP_FAILURE_STATUS = /failed: (\d{3})\b/u;

// Checked first: /net::ERR_/ and /Cronet failed/ would otherwise match it.
const ANDROID_TLS_ERROR_PATTERN = /net::ERR_(?:CERT|SSL)_/iu;

/**
 * Determines whether an error represents a transient network/connectivity
 * failure (as opposed to an application bug). Used to avoid reporting
 * unactionable connectivity noise to Sentry.
 *
 * @param error - The caught error (Error, string, or unknown)
 * @returns true when the error looks like a connectivity failure
 */
export function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (!message) {
    return false;
  }

  if (ANDROID_TLS_ERROR_PATTERN.test(message)) {
    return false;
  }

  const httpFailure = HTTP_FAILURE_STATUS.exec(message);
  if (httpFailure) {
    const status = Number(httpFailure[1]);
    return status === 408 || status === 504;
  }

  return NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

const PREDICT_NETWORK_BREADCRUMB_CATEGORY = 'predict.network';
const NETWORK_FAILURE_CODE =
  /NSURLErrorDomain Code=(-\d+)|net::(ERR_[A-Z_]+)|failed: (\d{3})\b/u;

// Short, fixed breadcrumb: the raw NSError text is ~1 KB and polling repeats it.
function addPredictNetworkBreadcrumb(
  error: unknown,
  errorContext: LoggerErrorOptions,
): void {
  const code = NETWORK_FAILURE_CODE.exec(ensureError(error).message)
    ?.slice(1)
    .find(Boolean);
  const methodValue = errorContext.context?.data.method;
  const method = typeof methodValue === 'string' ? methodValue : 'unknown';

  addBreadcrumb({
    category: PREDICT_NETWORK_BREADCRUMB_CATEGORY,
    level: 'warning',
    message: [method, 'network failure', code].filter(Boolean).join(' '),
    data: {
      source: errorContext.context?.name,
      method,
      ...(code !== undefined && { code }),
    },
  });
}

/**
 * Reports a Predict failure. Connectivity errors are breadcrumbs so they do
 * not open Sentry issues; every other error is still reported.
 *
 * @param error - The caught error (Error, string, or unknown)
 * @param errorContext - Searchable Logger context for the call site
 */
export function reportPredictError(
  error: unknown,
  errorContext: LoggerErrorOptions,
): void {
  if (isNetworkError(error)) {
    addPredictNetworkBreadcrumb(error, errorContext);
    return;
  }

  Logger.error(ensureError(error), errorContext);
}

/**
 * Error messages that mean the order book cannot match the order at all:
 * an empty/missing book, or depth too thin to fill the order size. The
 * retry flow must never submit into one of these — it shows a no-match
 * outcome instead. Covers the provider's typed codes plus the raw messages
 * the sell matcher throws when bids exist but depth is insufficient.
 *
 * Built at call time: some suites partially mock the errors constants, so
 * dereferencing PREDICT_ERROR_CODES at module load would break them.
 */
function getNoMatchErrorMessages(): string[] {
  return [
    PREDICT_ERROR_CODES.PREVIEW_NO_ORDER_BOOK,
    PREDICT_ERROR_CODES.PREVIEW_NO_ORDER_MATCH_BUY,
    PREDICT_ERROR_CODES.PREVIEW_NO_ORDER_MATCH_SELL,
    'no order match',
    'not enough bids to match user share amount',
  ];
}

/**
 * Determines whether a preview/order error means the book cannot match the
 * order at all (empty book or insufficient depth), as opposed to a transient
 * failure where a retry could still succeed.
 *
 * @param error - The caught error (Error, string, or unknown)
 * @returns true when the error means there is no executable match
 */
export function isPredictNoMatchError(error: unknown): boolean {
  if (!error) {
    return false;
  }
  // Exact-match classification: only Error messages and plain strings can
  // match. Any other payload (structured objects, numbers) has no meaning
  // here and must not be stringified into '[object Object]'.
  let message: string;
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    return false;
  }
  return getNoMatchErrorMessages().includes(message);
}

export function showDepositErrorToast(onRetry?: () => void): void {
  const content = {
    title: strings('predict.deposit.error_title'),
    description: strings('predict.deposit.error_description'),
    severity: ToastSeverity.Danger,
    hasNoTimeout: false,
    showCloseButton: false,
  };

  if (onRetry) {
    toast({
      ...content,
      actionButtonLabel: strings('predict.deposit.try_again'),
      actionButtonOnPress: onRetry,
    });
    return;
  }

  toast(content);
}

export function parseErrorMessage({
  error,
  defaultCode,
}: {
  error: unknown;
  defaultCode?: string;
}): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorMessages = getPredictErrorMessages();
  const parsedErrorMessage =
    errorMessages[errorMessage as keyof typeof errorMessages] ??
    errorMessages[defaultCode as keyof typeof errorMessages];
  if (parsedErrorMessage) {
    return parsedErrorMessage;
  }
  // Never surface raw PREDICT_* codes to users.
  if (typeof errorMessage === 'string' && errorMessage.startsWith('PREDICT_')) {
    return errorMessages[PREDICT_ERROR_CODES.UNKNOWN_ERROR];
  }
  return errorMessage;
}

interface PlaceOrderErrorParams {
  error: unknown;
  orderParams: PlaceOrderParams;
}

export const getPlaceOrderErrorOutcome = ({
  error: placeOrderError,
}: PlaceOrderErrorParams): PlaceOrderOutcome => {
  const parsedErrorMessage = parseErrorMessage({
    error: placeOrderError,
    defaultCode: PREDICT_ERROR_CODES.PLACE_ORDER_FAILED,
  });

  const rawMessage =
    placeOrderError instanceof Error
      ? placeOrderError.message
      : String(placeOrderError);
  const isNotFilled =
    rawMessage === PREDICT_ERROR_CODES.BUY_ORDER_NOT_FULLY_FILLED ||
    rawMessage === PREDICT_ERROR_CODES.SELL_ORDER_NOT_FULLY_FILLED;

  if (isNotFilled) {
    return { status: 'order_not_filled' };
  }

  return { status: 'error', error: parsedErrorMessage };
};

export const logPlaceOrderError = ({
  error: placeOrderError,
  orderParams,
}: PlaceOrderErrorParams): void => {
  const parsedErrorMessage = parseErrorMessage({
    error: placeOrderError,
    defaultCode: PREDICT_ERROR_CODES.PLACE_ORDER_FAILED,
  });
  DevLogger.log('usePredictPlaceOrder: Error placing order', {
    error: parsedErrorMessage,
    orderParams,
  });

  // Log error with order context (no sensitive data like amounts)
  Logger.error(ensureError(placeOrderError), {
    tags: {
      feature: PREDICT_CONSTANTS.FEATURE_NAME,
      component: 'usePredictPlaceOrder',
    },
    context: {
      name: 'usePredictPlaceOrder',
      data: {
        method: 'placeOrder',
        action: 'order_placement',
        operation: 'order_management',
        side: orderParams.preview?.side,
        marketId: orderParams.analyticsProperties?.marketId,
        transactionType: orderParams.analyticsProperties?.transactionType,
      },
    },
  });
};

export const checkPlaceOrderError = (
  params: PlaceOrderErrorParams,
): PlaceOrderOutcome => {
  logPlaceOrderError(params);
  return getPlaceOrderErrorOutcome(params);
};
