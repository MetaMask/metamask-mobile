import { useCallback, useContext, useMemo } from 'react';
import { ToastContext } from '../../../../component-library/components/Toast';
import {
  ToastOptions,
  ToastVariants,
} from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useAppThemeFromContext } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import { toHumanDuration } from '../../../Views/confirmations/utils/time';

export interface PerpsToastOptions {
  deposit: {
    success: ToastOptions;
    error: ToastOptions;
  };
}

const getPerpsToastLabels = (primary: string, secondary?: string) => {
  const labels = [
    {
      label: primary,
      isBold: true,
    },
  ];

  if (secondary) {
    labels.push(
      {
        label: '\n',
        isBold: false,
      },
      {
        label: secondary,
        isBold: false,
      },
    );
  }

  return labels;
};

const PERPS_TOASTS_DEFAULT_OPTIONS: Partial<ToastOptions> = {
  hasNoTimeout: false,
};

const usePerpsToasts = () => {
  const { toastRef } = useContext(ToastContext);
  const theme = useAppThemeFromContext();

  const perpsBaseToastOptions: Record<string, ToastOptions> = useMemo(
    () => ({
      success: {
        ...(PERPS_TOASTS_DEFAULT_OPTIONS as ToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        iconColor: theme.colors.icon.default,
        backgroundColor: theme.colors.primary.default,
      },
      // Intentional duplication for now to avoid coupling with success options.
      inProgress: {
        ...(PERPS_TOASTS_DEFAULT_OPTIONS as ToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        iconColor: theme.colors.icon.default,
        backgroundColor: theme.colors.primary.default,
      },
      error: {
        ...(PERPS_TOASTS_DEFAULT_OPTIONS as ToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        iconColor: theme.colors.icon.default,
        backgroundColor: theme.colors.error.default,
      },
    }),
    [theme],
  );

  const showToast = useCallback(
    (config: ToastOptions) => {
      toastRef?.current?.showToast(config);
    },
    [toastRef],
  );

  // Centralized toast options for Perps
  const PerpsToastOptions = useMemo(
    () => ({
      deposit: {
        success: (amountFormatted: string) => ({
          ...perpsBaseToastOptions.success,
          labelOptions: getPerpsToastLabels(
            strings('perps.deposit.success_toast'),
            strings('perps.deposit.success_message', {
              amount: amountFormatted,
            }),
          ),
        }),
        inProgress: (processingTimeInSeconds: number | undefined) => {
          let processingMessage = strings(
            'perps.deposit.funds_available_momentarily',
          );

          if (processingTimeInSeconds && processingTimeInSeconds > 0) {
            const formattedProcessingTime = toHumanDuration(
              processingTimeInSeconds,
            );
            processingMessage = strings(
              'perps.deposit.estimated_processing_time',
              {
                time: formattedProcessingTime,
              },
            );
          }

          return {
            ...perpsBaseToastOptions.inProgress,
            labelOptions: getPerpsToastLabels(
              strings('perps.deposit.in_progress'),
              processingMessage,
            ),
          };
        },
        error: {
          ...perpsBaseToastOptions.error,
          labelOptions: getPerpsToastLabels(
            strings('perps.deposit.error_toast'),
            strings('perps.deposit.error_generic'),
          ),
        },
      },
    }),
    [
      perpsBaseToastOptions.error,
      perpsBaseToastOptions.inProgress,
      perpsBaseToastOptions.success,
    ],
  );

  return { showToast, PerpsToastOptions };
};

export default usePerpsToasts;
