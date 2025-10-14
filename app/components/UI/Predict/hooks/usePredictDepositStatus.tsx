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
import { NotificationFeedbackType } from 'expo-haptics';
import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import Engine from '../../../../core/Engine';
import { useAppThemeFromContext } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';

const toastStyles = StyleSheet.create({
  spinnerContainer: {
    paddingRight: 12,
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const usePredictDepositStatus = () => {
  const [isDepositInProgress, setIsDepositInProgress] = useState(false);
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);

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

      // Handle PredictDeposit approved - set deposit in progress
      if (transactionMeta.status === TransactionStatus.approved) {
        setIsDepositInProgress(true);
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            { label: strings('predict.deposit.in_progress'), isBold: true },
          ],
          iconName: IconName.Loading,
          iconColor: theme.colors.accent04.dark,
          backgroundColor: theme.colors.accent04.normal,
          hapticsType: NotificationFeedbackType.Warning,
          startAccessory: (
            <View style={toastStyles?.spinnerContainer}>
              <Spinner
                color={ReactNativeDsIconColor.PrimaryDefault}
                spinnerIconProps={{ size: ReactNativeDsIconSize.Xl }}
              />
            </View>
          ),
        });
      }

      if (transactionMeta.status === TransactionStatus.confirmed) {
        setIsDepositInProgress(false);
      }

      // Handle PredictDeposit failed - clear deposit in progress
      if (transactionMeta.status === TransactionStatus.failed) {
        setIsDepositInProgress(false);
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
  }, []);

  return {
    isDepositInProgress,
  };
};
