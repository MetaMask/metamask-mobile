import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useCallback, useContext } from 'react';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import {
  PERPS_CONSTANTS,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type AccountState,
} from '@metamask/perps-controller';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ButtonIconVariant } from '../../../../component-library/components/Toast/Toast.types';
import usePerpsToasts from './usePerpsToasts';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import { usePerpsStream } from '../providers/PerpsStreamManager';
import { PERPS_PAY_WITH_TOKEN_CREDIT_TIMEOUT_MS } from '../constants/perpsConfig';

const getSpendableBalance = (account: AccountState | null): number => {
  const spendable = Number.parseFloat(account?.spendableBalance ?? '');
  return Number.isFinite(spendable) ? spendable : 0;
};

/**
 * Hook to track deposit status for Perps order view
 *
 * This hook handles:
 * 1. Showing the "depositing" toast once the user confirms the deposit
 * 2. Handling transaction failures
 * 3. After the deposit transaction confirms, waiting for HyperLiquid to credit
 * the Perps balance (account stream), then executing the order
 * 4. Reporting "deposit received, order not placed" when the credit does not
 * arrive in time
 *
 * The on-chain confirmation only means the bridge deposit landed; the order
 * would fail with insufficient margin if sent before HyperLiquid credits it.
 */
export const usePerpsOrderDepositTracking = () => {
  const { showToast, PerpsToastOptions } = usePerpsToasts();
  const { track } = usePerpsEventTracking();
  const { toastRef } = useContext(ToastContext);
  const streamManager = usePerpsStream();

  const showProgressToast = useCallback(
    (transactionId: string) => {
      showToast({
        ...PerpsToastOptions.accountManagement.deposit.inProgress(
          0,
          transactionId,
        ),
        labelOptions: [
          {
            label: strings('perps.deposit.depositing_your_funds'),
            isBold: true,
          },
        ],
        hasNoTimeout: true,
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: IconName.Close,
          onPress: () => toastRef?.current?.closeToast(),
        },
      });
    },
    [showToast, PerpsToastOptions, toastRef],
  );

  // Callback to show toast when user confirms the deposit
  const handleDepositConfirm = useCallback(
    (
      transactionMeta: TransactionMeta,
      callback: () => void,
      /** Minimum Perps balance increase that counts as the deposit credit. */
      requiredCreditUsd?: string,
    ) => {
      if (transactionMeta.type !== TransactionType.perpsDepositAndOrder) {
        return;
      }
      const transactionId = transactionMeta.id;
      const accountChannel = streamManager.account;
      // Taken before the deposit is confirmed, so any later increase is the
      // credit (or part of it). Without a live snapshot, the first delivery
      // becomes the baseline so a preloaded balance is never read as credit.
      const initialAccount = accountChannel.getSnapshot();
      let baselineSpendable = initialAccount
        ? getSpendableBalance(initialAccount)
        : undefined;
      const minCreditUsd = Number.parseFloat(requiredCreditUsd ?? '');
      let cancelTradeRequested = false;
      let isSettled = false;
      let creditTimeoutId: ReturnType<typeof setTimeout> | undefined;
      let unsubscribeAccount: (() => void) | undefined;
      showProgressToast(transactionId);

      const takingLongerToastOptions =
        PerpsToastOptions.accountManagement.deposit.takingLonger;
      const cancelTradeOnPress = () => {
        cancelTradeRequested = true;

        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.CANCEL_TRADE_WITH_TOKEN,
        });

        // Replace current toast with "Trade canceled" (don't close first to avoid race)
        showToast(PerpsToastOptions.accountManagement.deposit.tradeCanceled);
      };
      const depositLongerTimeoutId = setTimeout(() => {
        const baseClose = takingLongerToastOptions.closeButtonOptions;

        track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.CANCEL_TRADE_WITH_TOKEN_TOAST,
        });

        showToast({
          ...takingLongerToastOptions,
          closeButtonOptions: baseClose
            ? { ...baseClose, onPress: cancelTradeOnPress }
            : undefined,
        } as Parameters<typeof showToast>[0]);
      }, PERPS_CONSTANTS.DepositTakingLongerToastDelayMs);

      // Bound once the transaction listeners below are subscribed.
      let removeTransactionListeners: () => void = () => undefined;

      const settle = () => {
        isSettled = true;
        clearTimeout(depositLongerTimeoutId);
        clearTimeout(creditTimeoutId);
        unsubscribeAccount?.();
        removeTransactionListeners();
      };

      const hasDepositBeenCredited = (account: AccountState | null) => {
        if (!account) {
          return false;
        }
        if (baselineSpendable === undefined) {
          baselineSpendable = getSpendableBalance(account);
          return false;
        }
        const credited = getSpendableBalance(account) - baselineSpendable;
        return minCreditUsd > 0 ? credited >= minCreditUsd : credited > 0;
      };

      const waitForCreditThenPlaceOrder = () => {
        creditTimeoutId = setTimeout(() => {
          settle();
          if (!cancelTradeRequested) {
            showToast(
              PerpsToastOptions.accountManagement.deposit.orderNotPlaced,
            );
          }
        }, PERPS_PAY_WITH_TOKEN_CREDIT_TIMEOUT_MS);

        const unsubscribe = accountChannel.subscribe({
          callback: (account) => {
            if (isSettled || !hasDepositBeenCredited(account)) {
              return;
            }
            settle();
            if (!cancelTradeRequested) {
              callback?.();
            }
          },
        });
        // subscribe() delivers cached data synchronously, which may already
        // have settled before the unsubscribe handle was returned.
        if (isSettled) {
          unsubscribe();
        } else {
          unsubscribeAccount = unsubscribe;
        }
      };

      // Handle failed transactions
      const handleTransactionFailed = ({
        transactionMeta: failedTransactionMeta,
      }: {
        transactionMeta: TransactionMeta;
      }) => {
        if (
          failedTransactionMeta?.type === TransactionType.perpsDepositAndOrder
        ) {
          if (failedTransactionMeta.id === transactionId) {
            settle();
            showToast(PerpsToastOptions.accountManagement.deposit.error);
          }
        }
      };

      const handleTransactionStatusUpdated = ({
        transactionMeta: updatedTransactionMeta,
      }: {
        transactionMeta: TransactionMeta;
      }) => {
        if (
          updatedTransactionMeta.id === transactionId &&
          updatedTransactionMeta.status === TransactionStatus.confirmed
        ) {
          removeTransactionListeners();
          waitForCreditThenPlaceOrder();
        }
      };

      Engine.controllerMessenger.subscribe(
        'TransactionController:transactionFailed',
        handleTransactionFailed,
      );
      Engine.controllerMessenger.subscribe(
        'TransactionController:transactionStatusUpdated',
        handleTransactionStatusUpdated,
      );
      removeTransactionListeners = () => {
        Engine.controllerMessenger.unsubscribe(
          'TransactionController:transactionFailed',
          handleTransactionFailed,
        );
        Engine.controllerMessenger.unsubscribe(
          'TransactionController:transactionStatusUpdated',
          handleTransactionStatusUpdated,
        );
      };
    },
    [
      showToast,
      showProgressToast,
      PerpsToastOptions.accountManagement.deposit,
      track,
      streamManager,
    ],
  );

  return {
    handleDepositConfirm,
  };
};
