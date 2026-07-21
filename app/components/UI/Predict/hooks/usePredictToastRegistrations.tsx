import {
  IconColor as ReactNativeDsIconColor,
  IconSize as ReactNativeDsIconSize,
  Spinner,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import type { ToastRef } from '../../../../component-library/components/Toast/Toast.types';
import { navigateToTransactionDetails } from '../../../../util/navigation/navigateToTransactionDetails';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared activity type-filter; route-isolation backlog
import { ActivityTypeFilter } from '../../../Views/ActivityScreen/types';
import type { ToastRegistration } from '../../../Nav/App/ControllerEventToastBridge';
import { useAppThemeFromContext } from '../../../../util/theme';
import { PredictEventValues } from '../constants/eventNames';
import type { PredictTransactionStatusChangedPayload } from '../controllers/PredictController';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { formatPrice } from '../utils/format';
import { predictQueries } from '../queries';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';
import { usePredictClaim } from './usePredictClaim';
import { usePredictDeposit } from './usePredictDeposit';
import { usePredictWithdraw } from './usePredictWithdraw';
import { store } from '../../../../store';
import { selectTransactionMetadataById } from '../../../../selectors/transactionController';
import {
  isPerpsPredictMoneyDeposit,
  isPerpsPredictMoneyWithdraw,
} from '../../Money/utils/moneyTransactionGuards';
import { resolveWithdrawTokenInfo } from '../../../Views/confirmations/utils/withdraw-token-resolution';
import { selectPredictBottomSheetEnabledFlag } from '../selectors/featureFlags';
import { shouldSuppressLegacyOrderFailureToast } from '../contexts/PredictPreviewSheetContext';

const showPendingToast = ({
  showToast,
  title,
  description,
  trackLabel,
  onTrack,
}: {
  showToast: ToastRef['showToast'];
  title: string;
  description: string;
  trackLabel?: string;
  onTrack?: () => void;
}) =>
  showToast({
    variant: ToastVariants.Icon,
    labelOptions: [
      { label: title, isBold: true },
      { label: '\n', isBold: false },
      { label: description, isBold: false },
    ],
    iconName: IconName.Loading,
    hasNoTimeout: false,
    startAccessory: (
      <Spinner
        color={ReactNativeDsIconColor.IconDefault}
        spinnerIconProps={{ size: ReactNativeDsIconSize.Lg }}
      />
    ),
    ...(trackLabel && onTrack
      ? {
          closeButtonOptions: {
            label: trackLabel,
            onPress: onTrack,
            variant: ButtonVariants.Link,
          },
        }
      : {}),
  });

const showSuccessToast = ({
  showToast,
  title,
  description,
  iconColor,
  iconName = IconName.Confirmation,
}: {
  showToast: ToastRef['showToast'];
  title: string;
  description: string;
  iconColor: string;
  iconName?: IconName;
}) =>
  showToast({
    variant: ToastVariants.Icon,
    labelOptions: [
      { label: title, isBold: true },
      { label: '\n', isBold: false },
      { label: description, isBold: false },
    ],
    iconName,
    iconColor,
    hasNoTimeout: false,
  });

const showErrorToast = ({
  showToast,
  title,
  description,
  retryLabel,
  onRetry,
  iconColor,
}: {
  showToast: ToastRef['showToast'];
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
  iconColor: string;
}) =>
  showToast({
    variant: ToastVariants.Icon,
    labelOptions: [
      { label: title, isBold: true },
      { label: '\n', isBold: false },
      { label: description, isBold: false },
    ],
    iconName: IconName.Error,
    iconColor,
    hasNoTimeout: false,
    ...(retryLabel && onRetry
      ? {
          linkButtonOptions: {
            label: retryLabel,
            onPress: onRetry,
          },
        }
      : {}),
  });

export const usePredictToastRegistrations = (): ToastRegistration[] => {
  const queryClient = useQueryClient();
  const { deposit } = usePredictDeposit();
  const { claim } = usePredictClaim();
  const { withdraw, withdrawTransaction } = usePredictWithdraw();
  const navigation = useNavigation();
  const theme = useAppThemeFromContext();

  // Subscribe to account group changes so the hook re-renders when the user switches accounts
  useSelector(selectSelectedAccountGroupId);
  const bottomSheetEnabled = useSelector(selectPredictBottomSheetEnabledFlag);
  const selectedAddress = getEvmAccountFromSelectedAccountGroup()?.address;
  const normalizedSelectedAddress = selectedAddress?.toLowerCase() ?? '';
  const handleTransactionStatusChanged = useCallback(
    (payload: unknown, showToast: ToastRef['showToast']): void => {
      const { type, status, senderAddress, transactionId, amount, marketId } =
        payload as PredictTransactionStatusChangedPayload;
      const canRetry =
        Boolean(senderAddress) && senderAddress === normalizedSelectedAddress;

      if (status === 'confirmed') {
        queryClient.invalidateQueries({
          queryKey: predictQueries.balance.keys.all(),
        });

        queryClient.invalidateQueries({
          queryKey: predictQueries.unrealizedPnL.keys.all(),
        });

        // Deposit/Withdraw should not invalidate positions/activity
        if (type === 'claim' || type === 'order') {
          queryClient.invalidateQueries({
            queryKey: predictQueries.positions.keys.all(),
          });

          queryClient.invalidateQueries({
            queryKey: predictQueries.activity.keys.all(),
          });
        }
      }

      if (type === 'deposit') {
        const depositMeta = transactionId
          ? selectTransactionMetadataById(store.getState(), transactionId)
          : undefined;
        if (depositMeta && isPerpsPredictMoneyDeposit(depositMeta)) {
          return;
        }

        if (status === 'approved') {
          showPendingToast({
            showToast,
            title: strings('predict.deposit.adding_funds'),
            description: strings('predict.deposit.available_in_minutes', {
              minutes: 1,
            }),
            trackLabel: strings('predict.deposit.track'),
            onTrack: () => {
              navigateToTransactionDetails(navigation, {
                transactionId,
                initialTypeFilter: ActivityTypeFilter.Predictions,
              });
            },
          });
          return;
        }

        if (status === 'confirmed') {
          const depositAmount =
            typeof amount === 'number' && amount > 0
              ? formatPrice(amount, {
                  maximumDecimals: 2,
                })
              : strings('predict.deposit.account_ready');

          showSuccessToast({
            showToast,
            title: strings('predict.deposit.ready_to_trade'),
            description: strings('predict.deposit.account_ready_description', {
              amount: depositAmount,
            }),
            iconColor: theme.colors.success.default,
          });
          return;
        }

        if (status === 'failed') {
          showErrorToast({
            showToast,
            title: strings('predict.deposit.error_title'),
            description: strings('predict.deposit.error_description'),
            ...(canRetry
              ? {
                  retryLabel: strings('predict.deposit.try_again'),
                  onRetry: () => {
                    deposit().catch(() => undefined);
                  },
                }
              : {}),
            iconColor: theme.colors.error.default,
          });
          return;
        }

        return;
      }

      if (type === 'claim') {
        const formattedClaimAmount = formatPrice(amount ?? 0, {
          maximumDecimals: 2,
        });

        if (status === 'approved') {
          showPendingToast({
            showToast,
            title: strings('predict.claim.toasts.pending.title', {
              amount: formattedClaimAmount,
            }),
            description: strings('predict.claim.toasts.pending.description', {
              time: 5,
            }),
          });
          return;
        }

        if (status === 'confirmed') {
          if ((amount ?? 0) <= 0) {
            showSuccessToast({
              showToast,
              title: strings('predict.claim.toasts.redeemed.title'),
              description: strings('predict.claim.toasts.redeemed.description'),
              iconName: IconName.Info,
              iconColor: theme.colors.primary.default,
            });
            return;
          }

          showSuccessToast({
            showToast,
            title: strings('predict.claim.toasts.confirmed.title'),
            description: strings('predict.claim.toasts.confirmed.description', {
              amount: formattedClaimAmount,
            }),
            iconColor: theme.colors.success.default,
          });
          return;
        }

        if (status === 'failed') {
          showErrorToast({
            showToast,
            title: strings('predict.claim.toasts.error.title'),
            description: strings('predict.claim.toasts.error.description'),
            ...(canRetry
              ? {
                  retryLabel: strings('predict.claim.toasts.error.try_again'),
                  onRetry: () => {
                    claim({
                      entryPoint: PredictEventValues.ENTRY_POINT.BACKGROUND,
                    }).catch(() => undefined);
                  },
                }
              : {}),
            iconColor: theme.colors.error.default,
          });
        }

        return;
      }

      if (type === 'withdraw') {
        if (status === 'approved') {
          showPendingToast({
            showToast,
            title: strings('predict.withdraw.withdrawing'),
            description: strings('predict.withdraw.withdrawing_subtitle'),
          });
          return;
        }

        if (status === 'confirmed') {
          const withdrawMeta = transactionId
            ? selectTransactionMetadataById(store.getState(), transactionId)
            : undefined;
          if (withdrawMeta && isPerpsPredictMoneyWithdraw(withdrawMeta)) {
            return;
          }

          const fallbackAmount = amount ?? withdrawTransaction?.amount ?? 0;
          const { title, description } = getWithdrawConfirmedMessage(
            transactionId,
            fallbackAmount,
          );

          showSuccessToast({
            showToast,
            title,
            description,
            iconColor: theme.colors.success.default,
          });
          return;
        }

        if (status === 'failed') {
          showErrorToast({
            showToast,
            title: strings('predict.withdraw.error_title'),
            description: strings('predict.withdraw.error_description'),
            ...(canRetry
              ? {
                  retryLabel: strings('predict.withdraw.try_again'),
                  onRetry: () => {
                    withdraw().catch(() => undefined);
                  },
                }
              : {}),
            iconColor: theme.colors.error.default,
          });
          return;
        }
      }

      if (type === 'order') {
        if (status === 'depositing') {
          queryClient.invalidateQueries({
            queryKey: predictQueries.positions.keys.all(),
          });

          showPendingToast({
            showToast,
            title: strings('predict.order.prediction_in_progress'),
            description: strings(
              'predict.order.prediction_in_progress_description',
            ),
          });
          return;
        }

        if (status === 'confirmed') {
          showToast({
            variant: ToastVariants.Icon,
            iconName: IconName.Confirmation,
            iconColor: theme.colors.success.default,
            labelOptions: [
              {
                label: strings('predict.order.prediction_placed'),
                isBold: true,
              },
            ],
            hasNoTimeout: false,
          });
          return;
        }

        if (status === 'failed') {
          // When the bottom-sheet flow is on and the provider is mounted,
          // the provider's state-based trigger (in PredictPreviewSheetContext)
          // surfaces a persistent Retry toast for the same error. Skip here
          // to avoid double-firing.
          if (bottomSheetEnabled && shouldSuppressLegacyOrderFailureToast()) {
            return;
          }
          showErrorToast({
            showToast,
            title: strings('predict.order.prediction_failed'),
            description: strings('predict.order.order_failed_generic'),
            iconColor: theme.colors.error.default,
          });
          return;
        }
      }
    },
    [
      bottomSheetEnabled,
      claim,
      deposit,
      navigation,
      normalizedSelectedAddress,
      queryClient,
      theme.colors.error.default,
      theme.colors.primary.default,
      theme.colors.success.default,
      withdraw,
      withdrawTransaction?.amount,
    ],
  );

  return useMemo(
    () => [
      {
        eventName: 'PredictController:transactionStatusChanged',
        handler: handleTransactionStatusChanged,
      },
    ],
    [handleTransactionStatusChanged],
  );
};

/**
 * Derives the withdraw-confirmed toast message from transaction metadata.
 *
 * For post-quote withdrawals with valid metamaskPay data, displays the
 * resolved token symbol and targetFiat amount. Otherwise falls back to the
 * original USDC-only message.
 */
function getWithdrawConfirmedMessage(
  transactionId: string | undefined,
  fallbackAmount: number,
): { title: string; description: string } {
  const title = strings('predict.withdraw.withdraw_completed');

  const { isPostQuote, targetFiat, tokenSymbol } = resolveWithdrawTokenInfo(
    store.getState(),
    transactionId,
  );

  if (!isPostQuote) {
    return {
      title,
      description: strings('predict.withdraw.withdraw_completed_subtitle', {
        amount: formatPrice(fallbackAmount),
      }),
    };
  }

  const withdrawAmount = targetFiat ?? fallbackAmount;

  return {
    title,
    description: strings(
      'predict.withdraw.withdraw_any_token_completed_subtitle',
      { amount: formatPrice(withdrawAmount), token: tokenSymbol },
    ),
  };
}
