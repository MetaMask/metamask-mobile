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
import { capitalize } from '../../../../util/general';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';

export interface PerpsToastOptions {
  deposit: {
    success: ToastOptions;
    error: ToastOptions;
  };
}

type OrderDirection = 'long' | 'short';

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
  const navigation = useNavigation();

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
        iconName: IconName.Loading,
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

  const navigationHandlers = useMemo(
    () => ({
      goToPerpsTab: () => {
        toastRef?.current?.closeToast();
        navigation.navigate(Routes.PERPS.ROOT);
      },
    }),
    [navigation, toastRef],
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
      order: {
        // Intentional duplication of some options between market and limit to avoid coupling.
        orderManagement: {
          market: {
            submitted: (
              direction: OrderDirection,
              amount: string,
              assetSymbol: string,
            ) => ({
              ...perpsBaseToastOptions.success,
              labelOptions: getPerpsToastLabels(
                strings('perps.order.order_submitted'),
                strings('perps.order.order_placement_subtitle', {
                  direction: capitalize(direction),
                  amount,
                  assetSymbol,
                }),
              ),
            }),
            // Displays "Order Filled" since market orders are filled immediately or fail.
            confirmed: (
              direction: OrderDirection,
              amount: string,
              assetSymbol: string,
            ) => ({
              ...perpsBaseToastOptions.success,
              iconName: IconName.Check,
              iconColor: theme.colors.primary.default,
              backgroundColor: theme.colors.background.default,
              labelOptions: getPerpsToastLabels(
                strings('perps.order.order_filled'),
                strings('perps.order.order_placement_subtitle', {
                  direction: capitalize(direction),
                  amount,
                  assetSymbol,
                }),
              ),
            }),
            error: {
              ...perpsBaseToastOptions.error,
              labelOptions: getPerpsToastLabels(
                strings('perps.order.order_failed'),
                strings('perps.order.your_funds_have_been_returned_to_you'),
              ),
            },
          },
          limit: {
            submitted: (
              direction: OrderDirection,
              amount: string,
              assetSymbol: string,
            ) => ({
              ...perpsBaseToastOptions.success,
              labelOptions: getPerpsToastLabels(
                strings('perps.order.order_submitted'),
                strings('perps.order.order_placement_subtitle', {
                  direction: capitalize(direction),
                  amount,
                  assetSymbol,
                }),
              ),
            }),
            // Displays "Order Placed" since limit orders aren't typically filled immediately.
            confirmed: (
              direction: OrderDirection,
              amount: string,
              assetSymbol: string,
            ) => ({
              ...perpsBaseToastOptions.success,
              iconName: IconName.Check,
              iconColor: theme.colors.primary.default,
              backgroundColor: theme.colors.background.default,
              labelOptions: getPerpsToastLabels(
                strings('perps.order.order_placed'),
                strings('perps.order.order_placement_subtitle', {
                  direction: capitalize(direction),
                  amount,
                  assetSymbol,
                }),
              ),
            }),
            cancellationInProgress: (
              direction: OrderDirection,
              amount: string,
              assetSymbol: string,
            ) => ({
              ...perpsBaseToastOptions.inProgress,
              labelOptions: getPerpsToastLabels(
                strings('perps.order.cancelling_order'),
                strings('perps.order.cancelling_order_subtitle', {
                  direction,
                  amount,
                  assetSymbol,
                }),
              ),
            }),
            cancellationSuccess: {
              ...perpsBaseToastOptions.success,
              labelOptions: getPerpsToastLabels(
                strings('perps.order.order_cancelled'),
                strings('perps.order.funds_are_available_to_trade'),
              ),
            },
            cancellationFailed: {
              ...perpsBaseToastOptions.error,
              labelOptions: getPerpsToastLabels(
                strings('perps.order.failed_to_cancel_order'),
                strings('perps.order.funds_have_been_returned_to_you'),
              ),
            },
            // TODO: Rename to placeOrderFailed (update market and limit types)
            error: {
              ...perpsBaseToastOptions.error,
              labelOptions: getPerpsToastLabels(
                strings('perps.order.order_failed'),
                strings('perps.order.your_funds_have_been_returned_to_you'),
              ),
            },
          },
        },
        orderForm: {
          validationError: (error: string) => ({
            ...perpsBaseToastOptions.error,
            labelOptions: getPerpsToastLabels(
              strings('perps.order.validation.failed'),
              error,
            ),
          }),
        },
      },
      market: {
        error: {
          marketDataUnavailable: (assetSymbol: string) => ({
            ...perpsBaseToastOptions.error,
            labelOptions: getPerpsToastLabels(
              strings('perps.order.error.invalid_asset'),
              strings('perps.order.error.asset_not_tradable', {
                asset: assetSymbol,
              }),
            ),
            closeButtonOptions: {
              label: strings('perps.order.error.go_back'),
              variant: ButtonVariants.Secondary,
              onPress: () => {
                navigationHandlers.goToPerpsTab();
              },
            },
          }),
        },
      },
    }),
    [
      navigationHandlers,
      perpsBaseToastOptions.error,
      perpsBaseToastOptions.inProgress,
      perpsBaseToastOptions.success,
      theme.colors.background.default,
      theme.colors.primary.default,
    ],
  );

  return { showToast, PerpsToastOptions };
};

export default usePerpsToasts;
