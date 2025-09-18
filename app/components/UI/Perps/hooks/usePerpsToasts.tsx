import React, { useCallback, useContext, useMemo } from 'react';
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
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
import {
  IconSize as ReactNativeDsIconSize,
  IconColor as ReactNativeDsIconColor,
} from '@metamask/design-system-react-native';
import { View, StyleSheet } from 'react-native';

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
    shared: {
      cancellationInProgress: (
        direction: OrderDirection,
        amount: string,
        assetSymbol: string,
        detailedOrderType?: string,
      ) => PerpsToastOptions;
      cancellationSuccess: (
        isReduceOnly?: boolean,
        detailedOrderType?: string,
        direction?: OrderDirection,
        amount?: string,
        assetSymbol?: string,
      ) => PerpsToastOptions;
      cancellationFailed: PerpsToastOptions;
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
          closeFullPositionFailed: PerpsToastOptions;
        };
        partial: {
          closePartialPositionInProgress: (
            direction: OrderDirection,
            amount: string,
            assetSymbol: string,
          ) => PerpsToastOptions;
          closePartialPositionSuccess: PerpsToastOptions;
          closePartialPositionFailed: PerpsToastOptions;
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
    tpsl: {
      updateTPSLSuccess: PerpsToastOptions;
      updateTPSLError: (error?: string) => PerpsToastOptions;
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
  hasNoTimeout: false,
};

const toastStyles = StyleSheet.create({
  spinnerContainer: {
    paddingRight: 12,
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

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
        startAccessory: (
          <View style={toastStyles.spinnerContainer}>
            <Spinner
              color={ReactNativeDsIconColor.PrimaryDefault}
              spinnerIconProps={{ size: ReactNativeDsIconSize.Xl }}
            />
          </View>
        ),
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
            ),
          },
          withdrawalSuccess: (amount: string, assetSymbol: string) => ({
            ...perpsBaseToastOptions.success,
            labelOptions: getPerpsToastLabels(
              strings('perps.withdrawal.success_toast'),
              strings('perps.withdrawal.success_toast_description', {
                amount: amount
                  ? (parseFloat(amount) - 1).toFixed(2)
                  : undefined,
                symbol: assetSymbol,
                networkName: 'Arbitrum',
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
                fallbackMessage: strings(
                  'perps.order.your_funds_have_been_returned_to_you',
                ),
              }),
            ),
          }),
        },
        // Used for both market and limit orders.
        shared: {
          cancellationInProgress: (
            direction: OrderDirection,
            amount: string,
            assetSymbol: string,
            detailedOrderType?: string,
          ) => {
            const labels: string[] = [];

            // Title
            if (detailedOrderType) {
              const orderTypeLowercase = detailedOrderType.toLowerCase();

              labels.push(
                strings('perps.order.cancelling_order_in_progress', {
                  detailedOrderType: orderTypeLowercase,
                }),
              );
            } else {
              labels.push(strings('perps.order.cancelling_order'));
            }

            // Subtext
            if (direction && amount && assetSymbol) {
              labels.push(
                strings('perps.order.cancelling_order_subtitle', {
                  direction,
                  amount,
                  assetSymbol,
                }),
              );
            }

            return {
              ...perpsBaseToastOptions.inProgress,
              labelOptions: getPerpsToastLabels(labels[0], labels?.[1]),
            };
          },
          cancellationSuccess: (
            isReduceOnly?: boolean,
            detailedOrderType?: string,
            direction?: OrderDirection,
            amount?: string,
            assetSymbol?: string,
          ) => {
            const labels: string[] = [];

            // Title
            if (detailedOrderType) {
              const orderTypeLowercase = capitalize(
                detailedOrderType.toLowerCase(),
              );

              labels.push(
                strings('perps.order.order_cancelled_success', {
                  detailedOrderType: orderTypeLowercase,
                }),
              );
            } else {
              labels.push(strings('perps.order.order_cancelled'));
            }

            // Subtext
            if (direction && amount && assetSymbol) {
              labels.push(
                strings('perps.order.order_placement_subtitle', {
                  direction,
                  amount: Math.abs(parseFloat(amount)),
                  assetSymbol,
                }),
              );
            } else if (!isReduceOnly) {
              labels.push(strings('perps.order.funds_are_available_to_trade'));
            }

            return {
              ...perpsBaseToastOptions.success,
              labelOptions: getPerpsToastLabels(labels[0], labels?.[1]),
            };
          },
          cancellationFailed: {
            ...perpsBaseToastOptions.error,
            labelOptions: getPerpsToastLabels(
              strings('perps.order.failed_to_cancel_order'),
              strings('perps.order.order_still_active'),
            ),
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
              closeFullPositionFailed: {
                ...perpsBaseToastOptions.error,
                labelOptions: getPerpsToastLabels(
                  strings('perps.close_position.failed_to_close_position'),
                  strings('perps.close_position.your_position_is_still_active'),
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
              closePartialPositionSuccess: {
                ...perpsBaseToastOptions.success,
                labelOptions: getPerpsToastLabels(
                  strings('perps.close_position.position_partially_closed'),
                  strings('perps.close_position.funds_are_available_to_trade'),
                ),
              },
              closePartialPositionFailed: {
                ...perpsBaseToastOptions.error,
                labelOptions: getPerpsToastLabels(
                  strings(
                    'perps.close_position.failed_to_partially_close_position',
                  ),
                  strings('perps.close_position.your_position_is_still_active'),
                ),
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
                ...perpsBaseToastOptions.inProgress,
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
        tpsl: {
          updateTPSLSuccess: {
            ...perpsBaseToastOptions.success,
            labelOptions: getPerpsToastLabels(
              strings('perps.position.tpsl.update_success'),
            ),
          },
          updateTPSLError: (error?: string) => {
            const errorMessage = error || strings('perps.errors.unknown');

            return {
              ...perpsBaseToastOptions.error,
              labelOptions: getPerpsToastLabels(
                strings('perps.position.tpsl.update_failed'),
                errorMessage,
              ),
            };
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
