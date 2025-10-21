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
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import Engine from '../../../../core/Engine';
import { useAppThemeFromContext } from '../../../../util/theme';

const toastStyles = StyleSheet.create({
  spinnerContainer: {
    paddingRight: 12,
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

interface ToastConfig {
  title: string;
  description: string;
}

interface PendingToastConfig extends ToastConfig {
  getAmount?: (transactionMeta: TransactionMeta) => string;
}

interface ConfirmedToastConfig extends ToastConfig {
  getAmount: (transactionMeta: TransactionMeta) => string;
}

interface ErrorToastConfig extends ToastConfig {
  retryLabel: string;
  onRetry: () => void;
}

interface UsePredictToastsParams {
  transactionType: TransactionType;
  pendingToastConfig: PendingToastConfig;
  confirmedToastConfig: ConfirmedToastConfig;
  errorToastConfig: ErrorToastConfig;
  clearTransaction: () => void;
  onConfirmed?: () => void;
}

export const usePredictToasts = ({
  transactionType,
  pendingToastConfig,
  confirmedToastConfig,
  errorToastConfig,
  clearTransaction,
  onConfirmed,
}: UsePredictToastsParams) => {
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);

  const showPendingToast = useCallback(
    (amount?: string) => {
      const title = amount
        ? pendingToastConfig.title.replace('{amount}', amount)
        : pendingToastConfig.title;

      return toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: title, isBold: true },
          { label: '\n', isBold: false },
          {
            label: pendingToastConfig.description,
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
      });
    },
    [
      pendingToastConfig.description,
      pendingToastConfig.title,
      theme.colors.accent04.dark,
      theme.colors.accent04.normal,
      toastRef,
    ],
  );

  const showConfirmedToast = useCallback(
    (amount: string) => {
      const description = confirmedToastConfig.description.replace(
        '{amount}',
        amount,
      );

      return toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: confirmedToastConfig.title, isBold: true },
          { label: '\n', isBold: false },
          {
            label: description,
            isBold: false,
          },
        ],
        iconName: IconName.CheckBold,
        iconColor: theme.colors.success.default,
        backgroundColor: theme.colors.accent04.normal,
        hasNoTimeout: false,
      });
    },
    [
      confirmedToastConfig.description,
      confirmedToastConfig.title,
      theme.colors.accent04.normal,
      theme.colors.success.default,
      toastRef,
    ],
  );

  const showErrorToast = useCallback(
    () =>
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: errorToastConfig.title, isBold: true },
          { label: '\n', isBold: false },
          {
            label: errorToastConfig.description,
            isBold: false,
          },
        ],
        iconName: IconName.Error,
        iconColor: theme.colors.error.default,
        backgroundColor: theme.colors.accent04.normal,
        hasNoTimeout: false,
        linkButtonOptions: {
          label: errorToastConfig.retryLabel,
          onPress: errorToastConfig.onRetry,
        },
      }),
    [
      errorToastConfig.description,
      errorToastConfig.onRetry,
      errorToastConfig.retryLabel,
      errorToastConfig.title,
      theme.colors.accent04.normal,
      theme.colors.error.default,
      toastRef,
    ],
  );

  useEffect(() => {
    const handleTransactionStatusUpdate = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      const isTargetTransaction = transactionMeta?.nestedTransactions?.some(
        (tx) => tx.type === transactionType,
      );
      if (!isTargetTransaction) {
        return;
      }

      if (transactionMeta.status === TransactionStatus.approved) {
        const amount = pendingToastConfig.getAmount?.(transactionMeta);
        showPendingToast(amount);
      }

      if (transactionMeta.status === TransactionStatus.confirmed) {
        clearTransaction();
        const amount = confirmedToastConfig.getAmount(transactionMeta);
        showConfirmedToast(amount);
        onConfirmed?.();
      }

      if (transactionMeta.status === TransactionStatus.failed) {
        clearTransaction();
        showErrorToast();
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      handleTransactionStatusUpdate,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionStatusUpdated',
        handleTransactionStatusUpdate,
      );
    };
  }, [
    clearTransaction,
    confirmedToastConfig,
    onConfirmed,
    pendingToastConfig,
    showConfirmedToast,
    showErrorToast,
    showPendingToast,
    toastRef,
    transactionType,
  ]);
};
