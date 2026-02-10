import {
  Box,
  IconColor as ReactNativeDsIconColor,
  IconSize as ReactNativeDsIconSize,
} from '@metamask/design-system-react-native';
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import type { ToastRef } from '../../../../component-library/components/Toast/Toast.types';
import Routes from '../../../../constants/navigation/Routes';
import type { ToastRegistration } from '../../../Nav/App/ControllerEventToastBridge';
import { useAppThemeFromContext } from '../../../../util/theme';
import type { PredictTransactionStatusChangedPayload } from '../controllers/PredictController';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { formatPrice } from '../utils/format';
import { usePredictClaim } from './usePredictClaim';
import { usePredictDeposit } from './usePredictDeposit';
import { usePredictWithdraw } from './usePredictWithdraw';

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
      <Box twClassName="pr-3">
        <Spinner
          color={ReactNativeDsIconColor.PrimaryDefault}
          spinnerIconProps={{ size: ReactNativeDsIconSize.Lg }}
        />
      </Box>
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
}: {
  showToast: ToastRef['showToast'];
  title: string;
  description: string;
  iconColor: string;
}) =>
  showToast({
    variant: ToastVariants.Icon,
    labelOptions: [
      { label: title, isBold: true },
      { label: '\n', isBold: false },
      { label: description, isBold: false },
    ],
    iconName: IconName.Confirmation,
    iconColor,
    hasNoTimeout: false,
  });

const showErrorToast = ({
  showToast,
  title,
  description,
  retryLabel,
  onRetry,
  backgroundColor,
  iconColor,
}: {
  showToast: ToastRef['showToast'];
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
  backgroundColor: string;
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
    backgroundColor,
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
  const { deposit } = usePredictDeposit();
  const { claim } = usePredictClaim();
  const { withdraw, withdrawTransaction } = usePredictWithdraw();
  const navigation = useNavigation();
  const theme = useAppThemeFromContext();

  const selectedAddress =
    getEvmAccountFromSelectedAccountGroup()?.address ?? '0x0';
  const normalizedSelectedAddress = selectedAddress.toLowerCase();
  const handleTransactionStatusChanged = useCallback(
    (payload: unknown, showToast: ToastRef['showToast']): void => {
      const { type, status, senderAddress, transactionId, amount } =
        payload as PredictTransactionStatusChangedPayload;
      const canRetry =
        Boolean(senderAddress) && senderAddress === normalizedSelectedAddress;

      if (type === 'deposit') {
        if (status === 'approved') {
          showPendingToast({
            showToast,
            title: strings('predict.deposit.adding_funds'),
            description: strings('predict.deposit.available_in_minutes', {
              minutes: 1,
            }),
            trackLabel: strings('predict.deposit.track'),
            onTrack: () => {
              navigation.navigate(Routes.TRANSACTIONS_VIEW);
              if (transactionId) {
                setTimeout(() => {
                  navigation.navigate(Routes.TRANSACTION_DETAILS, {
                    transactionId,
                  });
                }, 100);
              }
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
            backgroundColor: theme.colors.accent04.normal,
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
          showSuccessToast({
            showToast,
            title: strings('predict.deposit.account_ready'),
            description: strings('predict.deposit.account_ready_description', {
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
                    claim().catch(() => undefined);
                  },
                }
              : {}),
            backgroundColor: theme.colors.accent04.normal,
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
          const formattedWithdrawAmount = formatPrice(
            amount ?? withdrawTransaction?.amount ?? 0,
          );

          showSuccessToast({
            showToast,
            title: strings('predict.withdraw.withdraw_completed'),
            description: strings(
              'predict.withdraw.withdraw_completed_subtitle',
              {
                amount: formattedWithdrawAmount,
              },
            ),
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
            backgroundColor: theme.colors.accent04.normal,
            iconColor: theme.colors.error.default,
          });
          return;
        }
      }
    },
    [
      claim,
      deposit,
      navigation,
      normalizedSelectedAddress,
      theme.colors.accent04.normal,
      theme.colors.error.default,
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
