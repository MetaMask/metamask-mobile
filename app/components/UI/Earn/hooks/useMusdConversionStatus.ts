import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useEffect, useRef } from 'react';
import Engine from '../../../../core/Engine';
import useEarnToasts from './useEarnToasts';
/**
 * Hook to monitor mUSD conversion transaction status and show appropriate toasts
 *
 * This hook:
 * 1. Subscribes to TransactionController:transactionStatusUpdated events
 * 2. Filters for mUSD conversion transactions (type === 'musdConversion')
 * 3. Shows toasts based on transaction status:
 * - submitted → in-progress toast
 * - confirmed → success toast
 * - failed → failed toast
 * 4. Tracks shown toasts to prevent duplicates
 *
 * This hook should be mounted globally to ensure toasts are shown even when
 * navigating away from the conversion screen.
 */
export const useMusdConversionStatus = () => {
  const { showToast, EarnToastOptions } = useEarnToasts();

  const shownToastsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleTransactionStatusUpdated = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (transactionMeta.type !== TransactionType.musdConversion) {
        return;
      }

      const { id: transactionId, status } = transactionMeta;

      const toastKey = `${transactionId}-${status}`;

      if (shownToastsRef.current.has(toastKey)) {
        return;
      }

      switch (status) {
        case TransactionStatus.submitted:
          showToast(EarnToastOptions.mUsdConversion.inProgress);
          shownToastsRef.current.add(toastKey);
          break;
        case TransactionStatus.confirmed:
          showToast(EarnToastOptions.mUsdConversion.success);
          shownToastsRef.current.add(toastKey);
          // Clean up entries for this transaction after final status
          setTimeout(() => {
            shownToastsRef.current.delete(
              `${transactionId}-${TransactionStatus.submitted}`,
            );
            shownToastsRef.current.delete(
              `${transactionId}-${TransactionStatus.confirmed}`,
            );
          }, 5000);
          break;
        case TransactionStatus.failed:
          showToast(EarnToastOptions.mUsdConversion.failed);
          shownToastsRef.current.add(toastKey);
          // Clean up entries for this transaction after final status
          setTimeout(() => {
            shownToastsRef.current.delete(
              `${transactionId}-${TransactionStatus.submitted}`,
            );
            shownToastsRef.current.delete(
              `${transactionId}-${TransactionStatus.failed}`,
            );
          }, 5000);
          break;
        default:
          break;
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      handleTransactionStatusUpdated,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionStatusUpdated',
        handleTransactionStatusUpdated,
      );
    };
  }, [showToast, EarnToastOptions.mUsdConversion]);
};
