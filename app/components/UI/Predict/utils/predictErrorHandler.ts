import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
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
 * Patterns that identify transient connectivity failures rather than
 * application bugs. These surface differently across transports
 * (Android Cronet via nitro-fetch, RN default fetch, iOS URLSession) so we
 * match on the substrings each of them emits.
 *
 * Reported as breadcrumbs/warnings instead of Sentry errors, since they are
 * driven by the user's network conditions (DNS failures, timeouts, offline,
 * geo/ISP blocking) and are not actionable as crashes.
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
  /request tim(ed |e)?out/iu,
  /timeout/iu,
  /network is unreachable/iu,
  /(the )?internet connection appears to be offline/iu,
  /name (not resolved|resolution failed)/iu,
  /could not (connect|resolve host)/iu,
];

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
  return NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function createDepositErrorToast(
  theme: {
    colors: { error: { default: string }; accent04: { normal: string } };
  },
  onRetry?: () => void,
) {
  return {
    variant: ToastVariants.Icon as const,
    labelOptions: [
      { label: strings('predict.deposit.error_title'), isBold: true },
      { label: '\n', isBold: false },
      {
        label: strings('predict.deposit.error_description'),
        isBold: false,
      },
    ],
    iconName: IconName.Error,
    iconColor: theme.colors.error.default,
    backgroundColor: theme.colors.accent04.normal,
    hasNoTimeout: false,
    ...(onRetry && {
      linkButtonOptions: {
        label: strings('predict.deposit.try_again'),
        onPress: onRetry,
      },
    }),
  };
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
