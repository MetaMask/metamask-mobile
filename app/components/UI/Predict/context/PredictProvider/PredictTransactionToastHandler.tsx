import {
  Box,
  IconColor as ReactNativeDsIconColor,
  IconSize as ReactNativeDsIconSize,
} from '@metamask/design-system-react-native';
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
import { TransactionStatus } from '@metamask/transaction-controller';
import React, { useCallback, useContext, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../../component-library/components/Toast/Toast.types';
import { ButtonVariants } from '../../../../../component-library/components/Buttons/Button';
import { useAppThemeFromContext } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { POLYMARKET_PROVIDER_ID } from '../../providers/polymarket/constants';
import { formatPrice, calculateNetAmount } from '../../utils/format';
import { selectPredictWonPositions } from '../../selectors/predictController';
import { getEvmAccountFromSelectedAccountGroup } from '../../utils/accounts';
import { PredictPosition } from '../../types';
import { usePredictContext } from './usePredictContext';
import { PredictTransactionEvent } from './PredictProvider.types';

const toastStyles = StyleSheet.create({
  spinnerContainer: {
    paddingRight: 12,
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const PredictTransactionToastHandler: React.FC = () => {
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const navigation = useNavigation();
  const {
    subscribeToDepositEvents,
    subscribeToClaimEvents,
    subscribeToWithdrawEvents,
  } = usePredictContext();

  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const selectedAddress = evmAccount?.address ?? '0x0';
  const wonPositions = useSelector(
    selectPredictWonPositions({ address: selectedAddress }),
  );

  const totalClaimableAmount = wonPositions.reduce(
    (sum: number, position: PredictPosition) => sum + position.currentValue,
    0,
  );
  const formattedClaimAmount = formatPrice(totalClaimableAmount, {
    maximumDecimals: 2,
  });

  const showPendingToast = useCallback(
    (title: string, description: string, onPress?: () => void) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: title, isBold: true },
          { label: '\n', isBold: false },
          { label: description, isBold: false },
        ],
        iconName: IconName.Loading,
        iconColor: theme.colors.accent04.dark,
        backgroundColor: theme.colors.accent04.normal,
        hasNoTimeout: false,
        startAccessory: (
          <Box style={toastStyles.spinnerContainer}>
            <Spinner
              color={ReactNativeDsIconColor.PrimaryDefault}
              spinnerIconProps={{ size: ReactNativeDsIconSize.Lg }}
            />
          </Box>
        ),
        ...(onPress
          ? {
              closeButtonOptions: {
                label: strings('predict.deposit.track'),
                onPress,
                variant: ButtonVariants.Link,
              },
            }
          : {}),
      });
    },
    [theme.colors.accent04.dark, theme.colors.accent04.normal, toastRef],
  );

  const showConfirmedToast = useCallback(
    (title: string, description: string) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: title, isBold: true },
          { label: '\n', isBold: false },
          { label: description, isBold: false },
        ],
        iconName: IconName.Confirmation,
        iconColor: theme.colors.accent03.dark,
        backgroundColor: 'transparent',
        hasNoTimeout: false,
        startAccessory: (
          <View style={toastStyles.spinnerContainer}>
            <Icon
              name={IconName.Confirmation}
              color={theme.colors.success.default}
              size={IconSize.Lg}
            />
          </View>
        ),
      });
    },
    [theme.colors.accent03.dark, theme.colors.success.default, toastRef],
  );

  const showErrorToast = useCallback(
    (title: string, description: string, retryLabel?: string) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: title, isBold: true },
          { label: '\n', isBold: false },
          { label: description, isBold: false },
        ],
        iconName: IconName.Error,
        iconColor: theme.colors.error.default,
        backgroundColor: theme.colors.accent04.normal,
        hasNoTimeout: false,
        ...(retryLabel
          ? {
              linkButtonOptions: {
                label: retryLabel,
                onPress: () => navigation.goBack(),
              },
            }
          : {}),
      });
    },
    [
      navigation,
      theme.colors.accent04.normal,
      theme.colors.error.default,
      toastRef,
    ],
  );

  const handleDepositEvent = useCallback(
    (event: PredictTransactionEvent) => {
      const { transactionMeta, status } = event;

      if (status === TransactionStatus.rejected) {
        Engine.context.PredictController.clearPendingDeposit({
          providerId: POLYMARKET_PROVIDER_ID,
        });
      } else if (status === TransactionStatus.approved) {
        showPendingToast(
          strings('predict.deposit.adding_funds'),
          strings('predict.deposit.available_in_minutes', { minutes: 1 }),
          () => {
            navigation.navigate(Routes.TRANSACTIONS_VIEW as never);
            if (transactionMeta?.id) {
              setTimeout(() => {
                navigation.navigate(
                  Routes.TRANSACTION_DETAILS as never,
                  {
                    transactionId: transactionMeta.id,
                  } as never,
                );
              }, 100);
            }
          },
        );
      } else if (status === TransactionStatus.confirmed) {
        Engine.context.PredictController.clearPendingDeposit({
          providerId: POLYMARKET_PROVIDER_ID,
        });
        const netAmount = calculateNetAmount({
          totalFiat: transactionMeta.metamaskPay?.totalFiat,
          bridgeFeeFiat: transactionMeta.metamaskPay?.bridgeFeeFiat,
          networkFeeFiat: transactionMeta.metamaskPay?.networkFeeFiat,
        });
        const amount =
          formatPrice(netAmount, { maximumDecimals: 2 }) ?? 'Balance';
        showConfirmedToast(
          strings('predict.deposit.ready_to_trade'),
          strings('predict.deposit.account_ready_description', { amount }),
        );
      } else if (status === TransactionStatus.failed) {
        Engine.context.PredictController.clearPendingDeposit({
          providerId: POLYMARKET_PROVIDER_ID,
        });
        showErrorToast(
          strings('predict.deposit.error_title'),
          strings('predict.deposit.error_description'),
          strings('predict.deposit.try_again'),
        );
      }
    },
    [navigation, showConfirmedToast, showErrorToast, showPendingToast],
  );

  const handleClaimEvent = useCallback(
    (event: PredictTransactionEvent) => {
      const { status } = event;

      if (status === TransactionStatus.rejected) {
        Engine.context.PredictController.confirmClaim({
          providerId: POLYMARKET_PROVIDER_ID,
        });
      } else if (status === TransactionStatus.approved) {
        showPendingToast(
          strings('predict.claim.toasts.pending.title', {
            amount: formattedClaimAmount,
          }),
          strings('predict.claim.toasts.pending.description', { time: 5 }),
        );
      } else if (status === TransactionStatus.confirmed) {
        Engine.context.PredictController.confirmClaim({
          providerId: POLYMARKET_PROVIDER_ID,
        });
        showConfirmedToast(
          strings('predict.deposit.account_ready'),
          strings('predict.deposit.account_ready_description', {
            amount: formattedClaimAmount,
          }),
        );
      } else if (status === TransactionStatus.failed) {
        showErrorToast(
          strings('predict.claim.toasts.error.title'),
          strings('predict.claim.toasts.error.description'),
          strings('predict.claim.toasts.error.try_again'),
        );
      }
    },
    [
      formattedClaimAmount,
      showConfirmedToast,
      showErrorToast,
      showPendingToast,
    ],
  );

  const handleWithdrawEvent = useCallback(
    (event: PredictTransactionEvent) => {
      const { status } = event;
      const withdrawAmount =
        Engine.context.PredictController.state.withdrawTransaction?.amount ?? 0;
      const formattedAmount = formatPrice(withdrawAmount.toString());

      if (status === TransactionStatus.rejected) {
        Engine.context.PredictController.clearWithdrawTransaction();
      } else if (status === TransactionStatus.approved) {
        showPendingToast(
          strings('predict.withdraw.withdrawing'),
          strings('predict.withdraw.withdrawing_subtitle'),
        );
      } else if (status === TransactionStatus.confirmed) {
        Engine.context.PredictController.clearWithdrawTransaction();
        showConfirmedToast(
          strings('predict.withdraw.withdraw_completed'),
          strings('predict.withdraw.withdraw_completed_subtitle', {
            amount: formattedAmount,
          }),
        );
      } else if (status === TransactionStatus.failed) {
        Engine.context.PredictController.clearWithdrawTransaction();
        showErrorToast(
          strings('predict.withdraw.error_title'),
          strings('predict.withdraw.error_description'),
          strings('predict.withdraw.try_again'),
        );
      }
    },
    [showConfirmedToast, showErrorToast, showPendingToast],
  );

  useEffect(() => {
    const unsubDeposit = subscribeToDepositEvents(handleDepositEvent);
    const unsubClaim = subscribeToClaimEvents(handleClaimEvent);
    const unsubWithdraw = subscribeToWithdrawEvents(handleWithdrawEvent);

    return () => {
      unsubDeposit();
      unsubClaim();
      unsubWithdraw();
    };
  }, [
    handleClaimEvent,
    handleDepositEvent,
    handleWithdrawEvent,
    subscribeToClaimEvents,
    subscribeToDepositEvents,
    subscribeToWithdrawEvents,
  ]);

  return null;
};
