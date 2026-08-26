import {
  IconSize as ReactNativeDsIconSize,
  Spinner,
  toast,
  ToastSeverity,
  type ToastOptions,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';

import {
  playNotification,
  NotificationMoment,
  type HapticNotificationMoment,
} from '../../../../util/haptics';
import React, { useCallback, useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { navigateToTransactionDetails } from '../../../../util/navigation/navigateToTransactionDetails';
import { selectIsTransactionsRedesignEnabled } from '../../../../selectors/featureFlagController/activityRedesign';
import { selectTransactionMetadataById } from '../../../../selectors/transactionController';
import { store } from '../../../../store';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared activity type-filter; route-isolation backlog
import {
  ActivityTypeFilter,
  PerpsActivityFilter,
} from '../../../Views/ActivityScreen/types';
import { capitalize } from '../../../../util/general';
import {
  PERPS_EVENT_VALUE,
  OrderDirection,
  getPerpsDisplaySymbol,
  type Position,
} from '@metamask/perps-controller';
import { formatPerpsFiat } from '../utils/formatUtils';
import { handlePerpsError } from '../utils/translatePerpsError';
import { formatDurationForDisplay } from '../utils/time';

export type PerpsToastOptions = ToastOptions & {
  hapticsType: HapticNotificationMoment;
};

export interface PerpsToastOptionsConfig {
  accountManagement: {
    deposit: {
      success: (amount: string) => PerpsToastOptions;
      inProgress: (
        processingTimeInSeconds: number | undefined,
        transactionId: string,
      ) => PerpsToastOptions;
      takingLonger: PerpsToastOptions;
      tradeCanceled: PerpsToastOptions;
      error: PerpsToastOptions;
    };
    oneClickTrade: {
      txCreationFailed: PerpsToastOptions;
    };
    withdrawal: {
      withdrawalInProgress: PerpsToastOptions;
      withdrawalSuccess: (
        amount: string,
        assetSymbol: string,
      ) => PerpsToastOptions;
      withdrawalFailed: (error?: string) => PerpsToastOptions;
      withdrawalStartFailed: (onRetry: () => void) => PerpsToastOptions;
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
      submitting: () => PerpsToastOptions;
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
      cancelAllSuccess: (count: number) => PerpsToastOptions;
      cancelAllPartialSuccess: (
        successCount: number,
        totalCount: number,
      ) => PerpsToastOptions;
      cancelAllFailed: (error?: string) => PerpsToastOptions;
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
      editSubmitting: () => PerpsToastOptions;
      editConfirmed: (
        direction: OrderDirection,
        amount: string,
        assetSymbol: string,
      ) => PerpsToastOptions;
      editFailed: (error?: string) => PerpsToastOptions;
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
          closeFullPositionSuccess: (
            position: Position,
            marketPrice?: string,
          ) => PerpsToastOptions;
          closeFullPositionFailed: PerpsToastOptions;
        };
        partial: {
          closePartialPositionInProgress: (
            direction: OrderDirection,
            amount: string,
            assetSymbol: string,
          ) => PerpsToastOptions;
          closePartialPositionSuccess: (
            position: Position,
            marketPrice?: string,
          ) => PerpsToastOptions;
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
          fullPositionCloseFailed: PerpsToastOptions;
        };
        partial: {
          partialPositionCloseSubmitted: (
            direction: OrderDirection,
            amount: string,
            assetSymbol: string,
          ) => PerpsToastOptions;
          partialPositionCloseFailed: PerpsToastOptions;
          switchToMarketOrderMissingLimitPrice: PerpsToastOptions;
        };
      };
    };
    tpsl: {
      updateTPSLSuccess: PerpsToastOptions;
      updateTPSLError: (error?: string) => PerpsToastOptions;
    };
    margin: {
      addSuccess: (assetSymbol: string, amount: string) => PerpsToastOptions;
      removeSuccess: (assetSymbol: string, amount: string) => PerpsToastOptions;
      adjustmentFailed: (error?: string) => PerpsToastOptions;
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
  contentSharing: {
    pnlHeroCard: {
      shareSuccess: PerpsToastOptions;
      shareFailed: PerpsToastOptions;
    };
  };
  watchlist: {
    added: (symbol: string) => PerpsToastOptions;
    removed: (symbol: string) => PerpsToastOptions;
    addError: PerpsToastOptions;
    limitReached: PerpsToastOptions;
  };
}

const getPerpsToastLabels = (
  primary: string,
  secondary?: string,
): Pick<ToastOptions, 'title' | 'description'> => ({
  title: primary,
  description: secondary,
});

function dismissToast() {
  try {
    toast.dismiss();
  } catch {
    // Toaster may be unmounted in tests
  }
}

const PERPS_TOASTS_DEFAULT_OPTIONS: Partial<PerpsToastOptions> = {
  hasNoTimeout: false,
};

const usePerpsToasts = (): {
  showToast: (config: PerpsToastOptions) => void;
  PerpsToastOptions: PerpsToastOptionsConfig;
} => {
  const navigation = useNavigation<AppNavigationProp>();

  const perpsBaseToastOptions: Record<string, PerpsToastOptions> = useMemo(
    () => ({
      success: {
        ...(PERPS_TOASTS_DEFAULT_OPTIONS as PerpsToastOptions),
        severity: ToastSeverity.Success,
        hapticsType: NotificationMoment.Success,
      },
      // Intentional duplication for now to avoid coupling with success options.
      inProgress: {
        ...(PERPS_TOASTS_DEFAULT_OPTIONS as PerpsToastOptions),
        hapticsType: NotificationMoment.Warning,
        startAccessory: (
          <Spinner spinnerIconProps={{ size: ReactNativeDsIconSize.Lg }} />
        ),
      },
      info: {
        ...(PERPS_TOASTS_DEFAULT_OPTIONS as PerpsToastOptions),
        severity: ToastSeverity.Default,
        hapticsType: NotificationMoment.Warning,
      },
      error: {
        ...(PERPS_TOASTS_DEFAULT_OPTIONS as PerpsToastOptions),
        severity: ToastSeverity.Danger,
        hapticsType: NotificationMoment.Error,
      },
      warning: {
        ...(PERPS_TOASTS_DEFAULT_OPTIONS as PerpsToastOptions),
        severity: ToastSeverity.Warning,
        hapticsType: NotificationMoment.Warning,
      },
    }),
    [],
  );

  const navigationHandlers = useMemo(
    () => ({
      goToPerpsTab: () => {
        dismissToast();
        navigation.navigate(Routes.PERPS.ROOT);
      },
      goToActivity: (
        transactionId: string,
        perpsFilter?: PerpsActivityFilter,
      ) => {
        dismissToast();
        const state = store.getState();
        const depositMeta = selectTransactionMetadataById(state, transactionId);
        navigateToTransactionDetails(navigation, {
          transactionId,
          initialTypeFilter: ActivityTypeFilter.Perps,
          ...(perpsFilter ? { initialPerpsFilter: perpsFilter } : {}),
          isTransactionsRedesignEnabled:
            selectIsTransactionsRedesignEnabled(state),
          ...(depositMeta?.chainId
            ? { chainId: toEvmCaipChainId(depositMeta.chainId) }
            : {}),
        });
      },
      goToPnlHeroCard: (position: Position, marketPrice?: string) => {
        dismissToast();
        navigation.navigate(Routes.PERPS.PNL_HERO_CARD, {
          position,
          marketPrice,
          source: PERPS_EVENT_VALUE.SOURCE.CLOSE_TOAST,
        });
      },
    }),
    [navigation],
  );

  const perpsToastButtonOptions = useMemo(
    () => ({
      pnlHeroCardShareButton: (
        position: Position,
        marketPrice?: string,
      ): Pick<ToastOptions, 'actionButtonLabel' | 'actionButtonOnPress'> => ({
        actionButtonLabel: strings('perps.pnl_hero_card.share_button'),
        actionButtonOnPress: () =>
          navigationHandlers.goToPnlHeroCard(position, marketPrice),
      }),
      goToActivityButton: (
        transactionId: string,
      ): Pick<ToastOptions, 'actionButtonLabel' | 'actionButtonOnPress'> => ({
        actionButtonLabel: strings('perps.deposit.track'),
        actionButtonOnPress: () =>
          navigationHandlers.goToActivity(
            transactionId,
            PerpsActivityFilter.Deposits,
          ),
      }),
    }),
    [navigationHandlers],
  );

  const showToast = useCallback((config: PerpsToastOptions) => {
    const { hapticsType, ...toastOptions } = config;
    toast(toastOptions);
    playNotification(hapticsType);
  }, []);

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
              ...getPerpsToastLabels(
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

            return {
              ...perpsBaseToastOptions.inProgress,
              ...getPerpsToastLabels(
                strings('perps.deposit.in_progress'),
                processingMessage,
              ),
              ...(processingTimeInSeconds
                ? perpsToastButtonOptions.goToActivityButton(transactionId)
                : {}),
            };
          },
          takingLonger: {
            ...perpsBaseToastOptions.warning,
            ...getPerpsToastLabels(
              strings('perps.deposit.deposit_taking_longer'),
            ),
            hasNoTimeout: true,
            actionButtonLabel: strings('perps.deposit.cancel_trade'),
            actionButtonOnPress: () => {
              /* no-op — callers wrap this to cancel the in-flight trade */
            },
          },
          tradeCanceled: {
            ...(PERPS_TOASTS_DEFAULT_OPTIONS as PerpsToastOptions),
            severity: ToastSeverity.Warning,
            hapticsType: NotificationMoment.Warning,
            ...getPerpsToastLabels(strings('perps.deposit.trade_canceled')),
            description: strings('perps.deposit.funds_returned_to_account'),
          },
          error: {
            ...perpsBaseToastOptions.error,
            ...getPerpsToastLabels(
              strings('perps.deposit.deposit_failed'),
              strings('perps.deposit.error_generic'),
            ),
          },
        },
        oneClickTrade: {
          txCreationFailed: {
            ...perpsBaseToastOptions.error,
            ...getPerpsToastLabels(
              strings('perps.one_click_trade.tx_creation_failed_title'),
              strings('perps.one_click_trade.tx_creation_failed_description'),
            ),
          },
        },
        withdrawal: {
          withdrawalInProgress: {
            ...perpsBaseToastOptions.inProgress,
            ...getPerpsToastLabels(
              strings('perps.withdrawal.processing_title'),
            ),
          },
          withdrawalSuccess: (amount: string, assetSymbol: string) => ({
            ...perpsBaseToastOptions.success,
            ...getPerpsToastLabels(
              strings('perps.withdrawal.success_toast'),
              strings('perps.withdrawal.success_toast_description', {
                amount: amount
                  ? (Number.parseFloat(amount) - 1).toFixed(2)
                  : undefined,
                symbol: assetSymbol,
                networkName: 'Arbitrum',
              }),
            ),
          }),
          withdrawalFailed: (error?: string) => ({
            ...perpsBaseToastOptions.error,
            ...getPerpsToastLabels(
              strings('perps.withdrawal.error'),
              handlePerpsError({
                error,
                fallbackMessage: strings('perps.withdrawal.error_generic'),
              }),
            ),
          }),
          withdrawalStartFailed: (onRetry: () => void) => ({
            ...perpsBaseToastOptions.error,
            ...getPerpsToastLabels(
              strings('perps.withdrawal.toast_error_title'),
              strings('perps.withdrawal.toast_start_error_description'),
            ),
            actionButtonLabel: strings('perps.withdrawal.try_again'),
            actionButtonOnPress: onRetry,
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
            ...getPerpsToastLabels(
              strings('perps.order.order_submitted'),
              strings('perps.order.order_placement_subtitle', {
                direction: capitalize(direction),
                amount,
                assetSymbol: getPerpsDisplaySymbol(assetSymbol),
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
            ...getPerpsToastLabels(
              strings('perps.order.order_filled'),
              strings('perps.order.order_placement_subtitle', {
                direction: capitalize(direction),
                amount,
                assetSymbol: getPerpsDisplaySymbol(assetSymbol),
              }),
            ),
          }),
          creationFailed: (error?: string) => ({
            ...perpsBaseToastOptions.error,
            ...getPerpsToastLabels(
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
            ...getPerpsToastLabels(
              strings('perps.order.order_submitted'),
              strings('perps.order.order_placement_subtitle', {
                direction: capitalize(direction),
                amount,
                assetSymbol: getPerpsDisplaySymbol(assetSymbol),
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
            ...getPerpsToastLabels(
              strings('perps.order.order_placed'),
              strings('perps.order.order_placement_subtitle', {
                direction: capitalize(direction),
                amount,
                assetSymbol: getPerpsDisplaySymbol(assetSymbol),
              }),
            ),
          }),
          creationFailed: (error?: string) => ({
            ...perpsBaseToastOptions.error,
            ...getPerpsToastLabels(
              strings('perps.order.order_failed'),
              handlePerpsError({
                error,
                fallbackMessage: strings(
                  'perps.order.your_funds_have_been_returned_to_you',
                ),
              }),
            ),
          }),
          editSubmitting: () => ({
            ...perpsBaseToastOptions.inProgress,
            hasNoTimeout: true,
            ...getPerpsToastLabels(strings('perps.order.updating_your_order')),
          }),
          editConfirmed: (
            direction: OrderDirection,
            amount: string,
            assetSymbol: string,
          ) => ({
            ...perpsBaseToastOptions.success,
            ...getPerpsToastLabels(
              strings('perps.order.order_updated'),
              strings('perps.order.order_placement_subtitle', {
                direction: capitalize(direction),
                amount,
                assetSymbol: getPerpsDisplaySymbol(assetSymbol),
              }),
            ),
          }),
          editFailed: (error?: string) => ({
            ...perpsBaseToastOptions.error,
            ...getPerpsToastLabels(
              strings('perps.order.order_update_failed'),
              handlePerpsError({
                error,
                fallbackMessage: strings(
                  'perps.order.order_update_failed_subtitle',
                ),
              }),
            ),
          }),
        },
        // Used for both market and limit orders.
        shared: {
          submitting: () => ({
            ...perpsBaseToastOptions.inProgress,
            hasNoTimeout: true,
            ...getPerpsToastLabels(
              strings('perps.order.submitting_your_trade'),
            ),
          }),
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
                  assetSymbol: getPerpsDisplaySymbol(assetSymbol),
                }),
              );
            }

            return {
              ...perpsBaseToastOptions.inProgress,
              ...getPerpsToastLabels(labels[0], labels?.[1]),
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
                  amount: Math.abs(Number.parseFloat(amount)),
                  assetSymbol: getPerpsDisplaySymbol(assetSymbol),
                }),
              );
            } else if (!isReduceOnly) {
              labels.push(strings('perps.order.funds_are_available_to_trade'));
            }

            return {
              ...perpsBaseToastOptions.success,
              ...getPerpsToastLabels(labels[0], labels?.[1]),
            };
          },
          cancellationFailed: {
            ...perpsBaseToastOptions.error,
            ...getPerpsToastLabels(
              strings('perps.order.failed_to_cancel_order'),
              strings('perps.order.order_still_active'),
            ),
          },
          cancelAllSuccess: (count: number) => ({
            ...perpsBaseToastOptions.success,
            ...getPerpsToastLabels(
              strings('perps.cancel_all_modal.success_title'),
              strings('perps.cancel_all_modal.success_message', { count }),
            ),
          }),
          cancelAllPartialSuccess: (
            successCount: number,
            totalCount: number,
          ) => ({
            ...perpsBaseToastOptions.success,
            ...getPerpsToastLabels(
              strings('perps.cancel_all_modal.success_title'),
              strings('perps.cancel_all_modal.partial_success', {
                successCount,
                totalCount,
              }),
            ),
          }),
          cancelAllFailed: (error?: string) => ({
            ...perpsBaseToastOptions.error,
            ...getPerpsToastLabels(
              strings('perps.cancel_all_modal.error_title'),
              error || 'Unknown error',
            ),
          }),
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
                      amount: Math.abs(Number.parseFloat(amount)),
                      assetSymbol: getPerpsDisplaySymbol(assetSymbol),
                    },
                  );
                }

                return {
                  ...perpsBaseToastOptions.inProgress,
                  ...getPerpsToastLabels(
                    strings('perps.close_position.closing_position'),
                    subtext,
                  ),
                };
              },
              closeFullPositionSuccess: (
                position: Position,
                marketPrice?: string,
              ) => {
                const roeValue =
                  Number.parseFloat(position.returnOnEquity) * 100;

                return {
                  ...perpsBaseToastOptions.success,
                  ...perpsToastButtonOptions.pnlHeroCardShareButton(
                    position,
                    marketPrice,
                  ),
                  ...getPerpsToastLabels(
                    strings('perps.close_position.position_closed'),
                    `${strings('perps.close_position.your_pnl_is')} ${roeValue.toFixed(2)}%`,
                  ),
                };
              },
              closeFullPositionFailed: {
                ...perpsBaseToastOptions.error,
                ...getPerpsToastLabels(
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
                      amount: Math.abs(Number.parseFloat(amount)),
                      assetSymbol: getPerpsDisplaySymbol(assetSymbol),
                    },
                  );
                }

                return {
                  ...perpsBaseToastOptions.inProgress,
                  ...getPerpsToastLabels(
                    strings('perps.close_position.partially_closing_position'),
                    subtext,
                  ),
                };
              },
              closePartialPositionSuccess: (
                position: Position,
                marketPrice?: string,
              ) => {
                const roeValue =
                  Number.parseFloat(position.returnOnEquity) * 100;

                return {
                  ...perpsBaseToastOptions.success,
                  ...perpsToastButtonOptions.pnlHeroCardShareButton(
                    position,
                    marketPrice,
                  ),
                  ...getPerpsToastLabels(
                    strings('perps.close_position.position_partially_closed'),
                    `${strings('perps.close_position.your_pnl_is')} ${roeValue.toFixed(2)}%`,
                  ),
                };
              },
              closePartialPositionFailed: {
                ...perpsBaseToastOptions.error,
                ...getPerpsToastLabels(
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
                // Limit closes rest until filled and get no follow-up toast, so
                // this is terminal. Use success (green tick) — matching the
                // partial close and the open limit "Order placed" toast —
                // instead of an in-progress spinner that never resolves.
                ...perpsBaseToastOptions.success,
                ...getPerpsToastLabels(
                  strings('perps.close_position.position_close_order_placed'),
                  strings('perps.close_position.closing_position_subtitle', {
                    direction,
                    amount: Math.abs(Number.parseFloat(amount)),
                    assetSymbol: getPerpsDisplaySymbol(assetSymbol),
                  }),
                ),
              }),
              fullPositionCloseFailed: {
                ...perpsBaseToastOptions.error,
                ...getPerpsToastLabels(
                  strings('perps.close_position.failed_to_place_close_order'),
                  strings('perps.close_position.your_position_is_still_active'),
                ),
              },
            },
            partial: {
              partialPositionCloseSubmitted: (
                direction: OrderDirection,
                amount: string,
                assetSymbol: string,
              ) => ({
                ...perpsBaseToastOptions.success,
                ...getPerpsToastLabels(
                  strings('perps.close_position.partial_close_submitted'),
                  strings('perps.close_position.closing_position_subtitle', {
                    direction,
                    amount: Math.abs(Number.parseFloat(amount)),
                    assetSymbol: getPerpsDisplaySymbol(assetSymbol),
                  }),
                ),
              }),
              partialPositionCloseFailed: {
                ...perpsBaseToastOptions.error,
                ...getPerpsToastLabels(
                  strings(
                    'perps.close_position.failed_to_place_partial_close_order',
                  ),
                  strings('perps.close_position.your_position_is_still_active'),
                ),
              },
              switchToMarketOrderMissingLimitPrice: {
                ...perpsBaseToastOptions.info,
                ...getPerpsToastLabels(
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
            ...getPerpsToastLabels(
              strings('perps.position.tpsl.update_success'),
            ),
          },
          updateTPSLError: (error?: string) => ({
            ...perpsBaseToastOptions.error,
            ...getPerpsToastLabels(
              strings('perps.position.tpsl.update_failed'),
              error || strings('perps.errors.tpslUpdateFailed'),
            ),
          }),
        },
        margin: {
          addSuccess: (assetSymbol: string, amount: string) => ({
            ...perpsBaseToastOptions.success,
            ...getPerpsToastLabels(
              strings('perps.position.margin.add_success', {
                amount,
                asset: assetSymbol,
              }),
            ),
          }),
          removeSuccess: (assetSymbol: string, amount: string) => ({
            ...perpsBaseToastOptions.success,
            ...getPerpsToastLabels(
              strings('perps.position.margin.remove_success', {
                amount,
                asset: assetSymbol,
              }),
            ),
          }),
          adjustmentFailed: (error?: string) => ({
            ...perpsBaseToastOptions.error,
            ...getPerpsToastLabels(
              strings('perps.position.margin.adjustment_failed'),
              error || strings('perps.errors.marginAdjustmentFailed'),
            ),
          }),
        },
      },
      formValidation: {
        orderForm: {
          validationError: (error: string) => ({
            ...perpsBaseToastOptions.error,
            ...getPerpsToastLabels(
              strings('perps.order.validation.failed'),
              error, // Pass through directly - validation errors are already localized
            ),
          }),
          limitPriceRequired: {
            ...perpsBaseToastOptions.error,
            ...getPerpsToastLabels(
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
              ...getPerpsToastLabels(
                strings('perps.order.error.invalid_asset'),
                strings('perps.order.error.asset_not_tradable', {
                  asset: getPerpsDisplaySymbol(assetSymbol),
                }),
              ),
              actionButtonLabel: strings('perps.order.error.go_back'),
              actionButtonOnPress: () => {
                navigationHandlers.goToPerpsTab();
              },
            }),
          },
        },
      },
      contentSharing: {
        pnlHeroCard: {
          shareSuccess: {
            ...perpsBaseToastOptions.success,
            ...getPerpsToastLabels(
              strings('perps.pnl_hero_card.export_success'),
            ),
          },
          shareFailed: {
            ...perpsBaseToastOptions.error,
            ...getPerpsToastLabels(strings('perps.pnl_hero_card.share_failed')),
          },
        },
      },
      watchlist: {
        added: (symbol: string) => ({
          ...perpsBaseToastOptions.success,
          ...getPerpsToastLabels(
            strings('perps.watchlist.added', {
              symbol: getPerpsDisplaySymbol(symbol),
            }),
          ),
        }),
        removed: (symbol: string) => ({
          ...perpsBaseToastOptions.info,
          ...getPerpsToastLabels(
            strings('perps.watchlist.removed', {
              symbol: getPerpsDisplaySymbol(symbol),
            }),
          ),
        }),
        addError: {
          ...perpsBaseToastOptions.error,
          ...getPerpsToastLabels(strings('perps.watchlist.add_error')),
        },
        limitReached: {
          ...perpsBaseToastOptions.info,
          ...getPerpsToastLabels(
            strings('perps.watchlist.limit_reached', { limit: 100 }),
          ),
        },
      },
    }),
    [
      navigationHandlers,
      perpsBaseToastOptions.error,
      perpsBaseToastOptions.inProgress,
      perpsBaseToastOptions.info,
      perpsBaseToastOptions.success,
      perpsBaseToastOptions.warning,
      perpsToastButtonOptions,
    ],
  );

  return { showToast, PerpsToastOptions };
};

export default usePerpsToasts;
