import {
  IconColor as ReactNativeDsIconColor,
  IconSize as ReactNativeDsIconSize,
} from '@metamask/design-system-react-native';
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import React, { useCallback, useContext, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import Engine from '../../../../core/Engine';
import { useAppThemeFromContext } from '../../../../util/theme';
import { usePredictDeposit } from './usePredictDeposit';

const toastStyles = StyleSheet.create({
  spinnerContainer: {
    paddingRight: 12,
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const usePredictDepositToasts = () => {
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const { deposit } = usePredictDeposit();

  const showPendingToast = useCallback(
    () =>
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('predict.deposit.adding_funds'), isBold: true },
          { label: '\n', isBold: false },
          {
            label: strings('predict.deposit.estimated_processing_time', {
              time: 30,
            }),
            isBold: false,
          },
        ],
        iconName: IconName.Loading,
        iconColor: theme.colors.accent04.dark,
        backgroundColor: theme.colors.accent04.normal,
        hasNoTimeout: false,
        startAccessory: (
          <View style={toastStyles?.spinnerContainer}>
            <Spinner
              color={ReactNativeDsIconColor.PrimaryDefault}
              spinnerIconProps={{ size: ReactNativeDsIconSize.Xl }}
            />
          </View>
        ),
      }),
    [theme.colors.accent04.dark, theme.colors.accent04.normal, toastRef],
  );

  const showConfirmedToast = useCallback(
    (amount: string) =>
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('predict.deposit.account_ready'), isBold: true },
          { label: '\n', isBold: false },
          {
            label: strings('predict.deposit.account_ready_description', {
              amount,
            }),
            isBold: false,
          },
        ],
        iconName: IconName.CheckBold,
        iconColor: theme.colors.success.default,
        backgroundColor: theme.colors.accent04.normal,
        hasNoTimeout: false,
      }),
    [theme.colors.accent04.normal, theme.colors.success.default, toastRef],
  );

  const showErrorToast = useCallback(
    () =>
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
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
        linkButtonOptions: {
          label: strings('predict.deposit.try_again'),
          onPress: () => {
            deposit();
          },
        },
      }),
    [
      deposit,
      theme.colors.accent04.normal,
      theme.colors.error.default,
      toastRef,
    ],
  );

  useEffect(() => {
    const handlePredictDepositTransactionStatusUpdate = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      const isPredictDeposit = transactionMeta?.nestedTransactions?.some(
        (tx) => tx.type === TransactionType.predictDeposit,
      );
      if (!isPredictDeposit) {
        return;
      }

      if (transactionMeta.status === TransactionStatus.confirmed) {
        Engine.context.PredictController.clearDepositTransaction();
        showConfirmedToast(transactionMeta.metamaskPay?.totalFiat ?? 'Balance');
      }

      // Handle PredictDeposit failed - clear deposit in progress
      if (transactionMeta.status === TransactionStatus.failed) {
        Engine.context.PredictController.clearDepositTransaction();
        showErrorToast();
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      handlePredictDepositTransactionStatusUpdate,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionStatusUpdated',
        handlePredictDepositTransactionStatusUpdate,
      );
    };
  }, [deposit, showConfirmedToast, showErrorToast, showPendingToast, toastRef]);
};
