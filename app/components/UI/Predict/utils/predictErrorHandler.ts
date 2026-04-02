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
