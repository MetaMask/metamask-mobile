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
import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import Engine from '../../../../core/Engine';
import { useAppThemeFromContext } from '../../../../util/theme';
import { usePredictClaim } from './usePredictClaim';
import { useSelector } from 'react-redux';
import { selectPredictClaimablePositions } from '../selectors/predictController';
import { PredictPosition, PredictPositionStatus } from '../types';
import { formatPrice } from '../utils/format';
import { usePredictPositions } from './usePredictPositions';

const toastStyles = StyleSheet.create({
  spinnerContainer: {
    paddingRight: 12,
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const usePredictClaimToasts = () => {
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const { claim } = usePredictClaim();
  const { loadPositions } = usePredictPositions({
    claimable: true,
    loadOnMount: true,
  });

  const claimablePositions = useSelector(selectPredictClaimablePositions);
  const wonPositions = useMemo(
    () =>
      claimablePositions.filter(
        (position) => position.status === PredictPositionStatus.WON,
      ),
    [claimablePositions],
  );

  const totalClaimableAmount = useMemo(
    () =>
      wonPositions.reduce(
        (sum: number, position: PredictPosition) => sum + position.currentValue,
        0,
      ),
    [wonPositions],
  );
  const showPendingToast = useCallback(
    (amount: string) =>
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings('predict.claim.toasts.pending.title', { amount }),
            isBold: true,
          },
          { label: '\n', isBold: false },
          {
            label: strings('predict.claim.toasts.pending.description', {
              time: 5,
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
          { label: strings('predict.claim.toasts.error.title'), isBold: true },
          { label: '\n', isBold: false },
          {
            label: strings('predict.claim.toasts.error.description'),
            isBold: false,
          },
        ],
        iconName: IconName.Error,
        iconColor: theme.colors.error.default,
        backgroundColor: theme.colors.accent04.normal,
        hasNoTimeout: false,
        linkButtonOptions: {
          label: strings('predict.claim.toasts.error.try_again'),
          onPress: () => {
            claim();
          },
        },
      }),
    [claim, theme.colors.accent04.normal, theme.colors.error.default, toastRef],
  );

  useEffect(() => {
    const handlePredictClaimTransactionStatusUpdate = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      const isPredictClaim = transactionMeta?.nestedTransactions?.some(
        (tx) => tx.type === TransactionType.predictClaim,
      );
      if (!isPredictClaim) {
        return;
      }

      if (transactionMeta.status === TransactionStatus.approved) {
        showPendingToast(
          formatPrice(totalClaimableAmount, { maximumDecimals: 2 }),
        );
      }

      if (transactionMeta.status === TransactionStatus.confirmed) {
        Engine.context.PredictController.clearClaimTransaction();
        showConfirmedToast(
          formatPrice(totalClaimableAmount, { maximumDecimals: 2 }),
        );
        loadPositions();
      }

      // Handle PredictDeposit failed - clear deposit in progress
      if (transactionMeta.status === TransactionStatus.failed) {
        Engine.context.PredictController.clearClaimTransaction();
        showErrorToast();
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      handlePredictClaimTransactionStatusUpdate,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionStatusUpdated',
        handlePredictClaimTransactionStatusUpdate,
      );
    };
  }, [
    loadPositions,
    showConfirmedToast,
    showErrorToast,
    showPendingToast,
    toastRef,
    totalClaimableAmount,
  ]);
};
