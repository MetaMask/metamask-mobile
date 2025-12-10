import {
  Box,
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
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import Engine from '../../../../core/Engine';
import { useAppThemeFromContext } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';

const toastStyles = StyleSheet.create({
  spinnerContainer: {
    paddingRight: 12,
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 24,
    height: 24,
  },
});

interface ToastConfig {
  title: string;
  description: string;
}

interface PendingToastConfig extends ToastConfig {
  getAmount?: (transactionMeta: TransactionMeta) => string;
  onPress?: (transactionMeta?: TransactionMeta) => void;
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
  pendingToastConfig?: PendingToastConfig;
  confirmedToastConfig: ConfirmedToastConfig;
  errorToastConfig: ErrorToastConfig;
  transactionBatchId?: string;
  clearTransaction?: () => void;
  onConfirmed?: () => void;
}

export const usePredictToasts = ({
  transactionType,
  transactionBatchId,
  pendingToastConfig,
  confirmedToastConfig,
  errorToastConfig,
  clearTransaction,
  onConfirmed,
}: UsePredictToastsParams) => {
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);

  const showPendingToast = useCallback(
    ({
      amount,
      config,
      transactionMeta,
    }: {
      amount?: string;
      config: PendingToastConfig;
      transactionMeta?: TransactionMeta;
    }) => {
      const title = amount
        ? config.title.replace('{amount}', amount)
        : config.title;

      return toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: title, isBold: true },
          { label: '\n', isBold: false },
          {
            label: config.description,
            isBold: false,
          },
        ],
        iconName: IconName.Loading,
        iconColor: theme.colors.accent04.dark,
        backgroundColor: theme.colors.accent04.normal,
        hasNoTimeout: false,
        startAccessory: (
          <Box style={toastStyles?.spinnerContainer}>
            <Spinner
              color={ReactNativeDsIconColor.PrimaryDefault}
              spinnerIconProps={{ size: ReactNativeDsIconSize.Lg }}
            />
          </Box>
        ),
        ...(config.onPress
          ? {
              closeButtonOptions: {
                label: strings('predict.deposit.track'),
                onPress: () => config.onPress?.(transactionMeta),
                variant: ButtonVariants.Link,
              },
            }
          : {}),
      });
    },
    [theme.colors.accent04.dark, theme.colors.accent04.normal, toastRef],
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
        iconName: IconName.Confirmation,
        iconColor: theme.colors.accent03.dark,
        backgroundColor: 'transparent',
        hasNoTimeout: false,
        startAccessory: (
          <View style={toastStyles?.spinnerContainer}>
            <Icon
              name={IconName.Confirmation}
              color={theme.colors.success.default}
              size={IconSize.Lg}
            />
          </View>
        ),
      });
    },
    [
      confirmedToastConfig.description,
      confirmedToastConfig.title,
      theme.colors.accent03.dark,
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
      const isTargetTransaction =
        transactionMeta.batchId === transactionBatchId;

      const isTargetNestedTransaction =
        transactionMeta?.nestedTransactions?.some(
          (tx) => tx.type === transactionType,
        );

      if (transactionBatchId && !isTargetTransaction) {
        return;
      } else if (!isTargetNestedTransaction) {
        return;
      }

      if (transactionMeta.status === TransactionStatus.rejected) {
        clearTransaction?.();
      } else if (
        transactionMeta.status === TransactionStatus.approved &&
        pendingToastConfig
      ) {
        const amount = pendingToastConfig.getAmount?.(transactionMeta);
        showPendingToast({
          amount,
          config: pendingToastConfig,
          transactionMeta,
        });
      } else if (transactionMeta.status === TransactionStatus.confirmed) {
        clearTransaction?.();
        const amount = confirmedToastConfig.getAmount(transactionMeta);
        showConfirmedToast(amount);
        onConfirmed?.();
      } else if (transactionMeta.status === TransactionStatus.failed) {
        clearTransaction?.();
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
    transactionBatchId,
    transactionType,
  ]);

  return { showPendingToast };
};
