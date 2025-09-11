import { useCallback, useContext, useMemo } from 'react';
import { ToastContext } from '../../../../component-library/components/Toast';
import {
  ToastOptions,
  ToastVariants,
} from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useAppThemeFromContext } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import { capitalize } from '../../../../util/general';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import Routes from '../../../../constants/navigation/Routes';
import { handlePerpsError } from '../utils/perpsErrorHandler';
import { OrderDirection } from '../types';
import { formatDurationForDisplay } from '../utils/time';
import { formatPerpsFiat } from '../utils/formatUtils';

export type PerpsToastOptions = ToastOptions & {
  hapticsType: NotificationFeedbackType;
};
export interface PerpsToastOptionsConfig {
  accountManagement: {
    deposit: {
      success: (amount: string) => PerpsToastOptions;
      inProgress: (
        processingTimeInSeconds: number | undefined,
        transactionId: string,
      ) => PerpsToastOptions;
      error: PerpsToastOptions;
    };
    withdrawal: {
      withdrawalInProgress: PerpsToastOptions;
      withdrawalSuccess: (
        amount: string,
        assetSymbol: string,
      ) => PerpsToastOptions;
      withdrawalFailed: (error?: string) => PerpsToastOptions;
    };
  };
  orderManagement: {
    market: {
      submitted: (
        direction: OrderDirection,
        amount: string,
        assetSymbol: string,
      ) => PerpsToastOptions;
      confirmed: (
        direction: OrderDirection,
        amount: string,
        assetSymbol: string,
      ) => PerpsToastOptions;
      creationFailed: (error?: string) => PerpsToastOptions;
    };
    limit: {
      submitted: (
        direction: OrderDirection,
        amount: string,
        assetSymbol: string,
      ) => PerpsToastOptions;
      confirmed: (
        direction: OrderDirection,
        amount: string,
        assetSymbol: string,
      ) => PerpsToastOptions;
      creationFailed: (error?: string) => PerpsToastOptions;
      cancellationInProgress: (
        direction: OrderDirection,
        amount: string,
        assetSymbol: string,
      ) => PerpsToastOptions;
      cancellationSuccess: PerpsToastOptions;
      cancellationFailed: PerpsToastOptions;
      reduceOnlyClose: {
        cancellationSuccess: PerpsToastOptions;
        cancellationFailed: PerpsToastOptions;
      };
    };
  };
  positionManagement: {
    closePosition: {
      marketClose: {
        full: {
          closeFullPositionInProgress: (
            direction: OrderDirection,
            amount: string,
            assetSymbol: string,
          ) => PerpsToastOptions;
          closeFullPositionSuccess: PerpsToastOptions;
        };
        partial: {
          closePartialPositionInProgress: (
            direction: OrderDirection,
            amount: string,
            assetSymbol: string,
          ) => PerpsToastOptions;
        };
      };
      limitClose: {
        full: {
          fullPositionCloseSubmitted: (
            direction: OrderDirection,
            amount: string,
            assetSymbol: string,
          ) => PerpsToastOptions;
        };
        partial: {
          partialPositionCloseSubmitted: (
            direction: OrderDirection,
            amount: string,
            assetSymbol: string,
          ) => PerpsToastOptions;
          switchToMarketOrderMissingLimitPrice: PerpsToastOptions;
        };
      };
    };
  };
  formValidation: {
    orderForm: {
      validationError: (error: string) => PerpsToastOptions;
      limitPriceRequired: PerpsToastOptions;
    };
  };
  dataFetching: {
    market: {
      error: {
        marketDataUnavailable: (assetSymbol: string) => PerpsToastOptions;
      };
    };
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

const PERPS_TOASTS_DEFAULT_OPTIONS: Partial<PerpsToastOptions> = {
  // TODO: Determine if necessary or if it causes persistent toasts.
  hasNoTimeout: false,
};

const usePerpsToasts = (): {
  showToast: (config: PerpsToastOptions) => void;
  PerpsToastOptions: PerpsToastOptionsConfig;
} => {
  const { toastRef } = useContext(ToastContext);
  const theme = useAppThemeFromContext();
  const navigation = useNavigation();

  const perpsBaseToastOptions: Record<string, PerpsToastOptions> = useMemo(
    () => ({
      success: {
        ...(PERPS_TOASTS_DEFAULT_OPTIONS as PerpsToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        iconColor: theme.colors.accent03.dark,
        backgroundColor: theme.colors.accent03.normal,
        hapticsType: NotificationFeedbackType.Success,
      },
      // Intentional duplication for now to avoid coupling with success options.
      inProgress: {
        ...(PERPS_TOASTS_DEFAULT_OPTIONS as PerpsToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.Loading,
        iconColor: theme.colors.accent04.dark,
        backgroundColor: theme.colors.accent04.normal,
        hapticsType: NotificationFeedbackType.Warning,
      },
      info: {
        ...(PERPS_TOASTS_DEFAULT_OPTIONS as PerpsToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.Info,
        iconColor: theme.colors.icon.default,
        backgroundColor: theme.colors.background.alternative,
        hapticsType: NotificationFeedbackType.Warning,
      },
      error: {
        ...(PERPS_TOASTS_DEFAULT_OPTIONS as PerpsToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        iconColor: theme.colors.accent01.dark,
        backgroundColor: theme.colors.accent01.light,
        hapticsType: NotificationFeedbackType.Error,
      },
    }),
    [theme],
  );

  const showToast = useCallback(
    (config: PerpsToastOptions) => {
      toastRef?.current?.showToast(config);
      notificationAsync(config.hapticsType);
    },
    [toastRef],
  );

  const navigationHandlers = useMemo(
    () => ({
      goToPerpsTab: () => {
        toastRef?.current?.closeToast();
        navigation.navigate(Routes.PERPS.ROOT);
      },
      goToActivity: (transactionId: string) => {
        toastRef?.current?.closeToast();
        // Navigate to the Transactions tab first
        navigation.navigate(Routes.TRANSACTIONS_VIEW);

        // Then use a timeout to navigate to the specific transaction details
        setTimeout(() => {
          navigation.navigate(Routes.TRANSACTION_DETAILS, {
            transactionId,
          });
        }, 100);
      },
    }),
    [navigation, toastRef],
  );

  // Centralized toast options for Perp
  const PerpsToastOptions: PerpsToastOptionsConfig = useMemo(
    () => ({
      accountManagement: {
        deposit: {
          success: (amount: string) => {
            let subtext = strings('perps.deposit.funds_are_ready_to_trade');

            if (amount && amount !== '0') {
              subtext = strings('perps.deposit.success_message', {
                amount: formatPerpsFiat(amount),
              });
            }

            return {
              ...perpsBaseToastOptions.success,
              labelOptions: getPerpsToastLabels(
                strings('perps.deposit.success_toast'),
                subtext,
              ),
            };
          },
          inProgress: (
            processingTimeInSeconds: number | undefined,
            transactionId: string,
          ) => {
            let processingMessage = strings(
              'perps.deposit.funds_available_momentarily',
            );

            if (processingTimeInSeconds && processingTimeInSeconds > 0) {
              const formattedProcessingTime = formatDurationForDisplay(
                processingTimeInSeconds,
              );
              processingMessage = strings(
                'perps.deposit.estimated_processing_time',
                {
                  time: formattedProcessingTime,
                },
              );
            }

            let closeButtonOptions;

            if (processingTimeInSeconds) {
              closeButtonOptions = {
                label: strings('perps.deposit.track'),
                onPress: () => navigationHandlers.goToActivity(transactionId),
                variant: ButtonVariants.Link,
              };
            }

            return {
              ...perpsBaseToastOptions.inProgress,
              labelOptions: getPerpsToastLabels(
                strings('perps.deposit.in_progress'),
                processingMessage,
              ),
              closeButtonOptions,
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
        withdrawal: {
          withdrawalInProgress: {
            ...perpsBaseToastOptions.inProgress,
            labelOptions: getPerpsToastLabels(
              strings('perps.withdrawal.processing_title'),
              strings('perps.withdrawal.eta_will_be_shared_shortly'),
            ),
          },
          withdrawalSuccess: (amount: string, assetSymbol: string) => ({
            ...perpsBaseToastOptions.success,
            labelOptions: getPerpsToastLabels(
              strings('perps.withdrawal.success_toast'),
              strings('perps.withdrawal.arrival_time', {
                amount,
                symbol: assetSymbol,
              }),
            ),
          }),
          withdrawalFailed: (error?: string) => ({
            ...perpsBaseToastOptions.error,
            labelOptions: getPerpsToastLabels(
              strings('perps.withdrawal.error'),
              error || strings('perps.withdrawal.error_generic'),
            ),
          }),
        },
      },
      // Intentional duplication of some options between market and limit to avoid coupling.
      orderManagement: {
        market: {
          submitted: (
            direction: OrderDirection,
            amount: string,
            assetSymbol: string,
          ) => ({
            ...perpsBaseToastOptions.inProgress,
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
            labelOptions: getPerpsToastLabels(
              strings('perps.order.order_filled'),
              strings('perps.order.order_placement_subtitle', {
                direction: capitalize(direction),
                amount,
                assetSymbol,
              }),
            ),
          }),
          creationFailed: (error?: string) => ({
            ...perpsBaseToastOptions.error,
            labelOptions: getPerpsToastLabels(
              strings('perps.order.order_failed'),
              handlePerpsError({
                error,
                fallbackMessage: strings(
                  'perps.order.your_funds_have_been_returned_to_you',
                ),
              }),
            ),
          }),
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
            labelOptions: getPerpsToastLabels(
              strings('perps.order.order_placed'),
              strings('perps.order.order_placement_subtitle', {
                direction: capitalize(direction),
                amount,
                assetSymbol,
              }),
            ),
          }),
          creationFailed: (error?: string) => ({
            ...perpsBaseToastOptions.error,
            labelOptions: getPerpsToastLabels(
              strings('perps.order.order_failed'),
              handlePerpsError({
                error,
                fallbackMessage: strings('perps.order.order_failed'),
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
            ),
          },
          reduceOnlyClose: {
            cancellationSuccess: {
              ...perpsBaseToastOptions.success,
              labelOptions: getPerpsToastLabels(
                strings('perps.order.order_cancelled'),
                strings('perps.close_position.limit_close_order_cancelled'),
              ),
            },
            cancellationFailed: {
              ...perpsBaseToastOptions.error,
              labelOptions: getPerpsToastLabels(
                strings('perps.order.failed_to_cancel_order'),
                strings('perps.order.close_order_still_active'),
              ),
            },
          },
        },
      },
      positionManagement: {
        closePosition: {
          marketClose: {
            full: {
              closeFullPositionInProgress: (
                direction: OrderDirection,
                amount: string,
                assetSymbol: string,
              ) => {
                let subtext = strings(
                  'perps.close_position.your_funds_will_be_available_momentarily',
                );

                if (direction && amount && assetSymbol) {
                  subtext = strings(
                    'perps.close_position.closing_position_subtitle',
                    {
                      direction,
                      amount: Math.abs(parseFloat(amount)),
                      assetSymbol,
                    },
                  );
                }

                return {
                  ...perpsBaseToastOptions.inProgress,
                  labelOptions: getPerpsToastLabels(
                    strings('perps.close_position.closing_position'),
                    subtext,
                  ),
                };
              },
              closeFullPositionSuccess: {
                ...perpsBaseToastOptions.success,
                labelOptions: getPerpsToastLabels(
                  strings('perps.close_position.position_closed'),
                  strings('perps.close_position.funds_are_available_to_trade'),
                ),
              },
            },
            partial: {
              closePartialPositionInProgress: (
                direction: OrderDirection,
                amount: string,
                assetSymbol: string,
              ) => {
                let subtext = strings(
                  'perps.close_position.your_funds_will_be_available_momentarily',
                );

                if (direction && amount && assetSymbol) {
                  subtext = strings(
                    'perps.close_position.closing_position_subtitle',
                    {
                      direction,
                      amount: Math.abs(parseFloat(amount)),
                      assetSymbol,
                    },
                  );
                }

                return {
                  ...perpsBaseToastOptions.inProgress,
                  labelOptions: getPerpsToastLabels(
                    strings('perps.close_position.partially_closing_position'),
                    subtext,
                  ),
                };
              },
            },
          },
          limitClose: {
            full: {
              fullPositionCloseSubmitted: (
                direction: OrderDirection,
                amount: string,
                assetSymbol: string,
              ) => ({
                ...perpsBaseToastOptions.success,
                labelOptions: getPerpsToastLabels(
                  strings('perps.close_position.position_close_order_placed'),
                  strings('perps.close_position.closing_position_subtitle', {
                    direction,
                    amount: Math.abs(parseFloat(amount)),
                    assetSymbol,
                  }),
                ),
              }),
            },
            partial: {
              partialPositionCloseSubmitted: (
                direction: OrderDirection,
                amount: string,
                assetSymbol: string,
              ) => ({
                ...perpsBaseToastOptions.success,
                labelOptions: getPerpsToastLabels(
                  strings('perps.close_position.partial_close_submitted'),
                  strings('perps.close_position.closing_position_subtitle', {
                    direction,
                    amount: Math.abs(parseFloat(amount)),
                    assetSymbol,
                  }),
                ),
              }),
              switchToMarketOrderMissingLimitPrice: {
                ...perpsBaseToastOptions.info,
                labelOptions: getPerpsToastLabels(
                  strings(
                    'perps.close_position.order_type_reverted_to_market_order',
                  ),
                  strings(
                    'perps.close_position.you_need_set_price_limit_order',
                  ),
                ),
              },
            },
          },
        },
      },
      formValidation: {
        orderForm: {
          validationError: (error: string) => ({
            ...perpsBaseToastOptions.error,
            labelOptions: getPerpsToastLabels(
              strings('perps.order.validation.failed'),
              error,
            ),
          }),
          limitPriceRequired: {
            ...perpsBaseToastOptions.error,
            labelOptions: getPerpsToastLabels(
              strings('perps.order.validation.please_set_a_limit_price'),
              strings(
                'perps.order.validation.limit_price_must_be_set_before_configuring_tpsl',
              ),
            ),
          },
        },
      },
      dataFetching: {
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
      },
    }),
    [
      navigationHandlers,
      perpsBaseToastOptions.error,
      perpsBaseToastOptions.inProgress,
      perpsBaseToastOptions.info,
      perpsBaseToastOptions.success,
    ],
  );

  return { showToast, PerpsToastOptions };
};

export default usePerpsToasts;
