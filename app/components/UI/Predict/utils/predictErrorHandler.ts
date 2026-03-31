import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { getPredictErrorMessages } from '../constants/errors';

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
