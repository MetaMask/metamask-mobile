import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useCallback } from 'react';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import {
  PERPS_CONSTANTS,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import usePerpsToasts from './usePerpsToasts';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { usePerpsEventTracking } from './usePerpsEventTracking';

/**
 * Hook to track deposit status for Perps order view
 *
 * This hook handles:
 * 1. Listening for deposit transaction approval and showing "depositing" toast
 * 2. Monitoring balance changes to detect when funds arrive
 * 3. Showing success toast when funds arrive
 * 4. Handling transaction failures
 * 5. Executing the order after funds arrive
 *
 * This ensures the order is placed automatically after the deposit completes.
 */
export const usePerpsOrderDepositTracking = () => {
  const { showToast, PerpsToastOptions } = usePerpsToasts();
  const { track } = usePerpsEventTracking();

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
        hasNoTimeout: false,
      });
    },
    [showToast, PerpsToastOptions],
  );

  // Callback to show toast when user confirms the deposit
  const handleDepositConfirm = useCallback(
    (transactionMeta: TransactionMeta, callback: () => void) => {
      if (transactionMeta.type !== TransactionType.perpsDepositAndOrder) {
        return;
      }
      const transactionId = transactionMeta.id;
      let cancelTradeRequested = false;
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
            clearTimeout(depositLongerTimeoutId);
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
          clearTimeout(depositLongerTimeoutId);
          if (!cancelTradeRequested) {
            callback?.();
          }
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
    },
    [
      showToast,
      showProgressToast,
      PerpsToastOptions.accountManagement.deposit,
      track,
    ],
  );

  return {
    handleDepositConfirm,
  };
};
