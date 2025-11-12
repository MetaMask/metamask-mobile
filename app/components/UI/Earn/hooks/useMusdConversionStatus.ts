import {
  TransactionMeta,
  TransactionStatus,
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

  // Track which transaction IDs we've already shown toasts for
  // Using a Set to efficiently check if we've already shown a toast for a status
  const shownToastsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleTransactionStatusUpdated = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      // Only process mUSD conversion transactions
      // TODO: Add type for musdConversion to TransactionType.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (transactionMeta.type !== ('musdConversion' as any)) {
        return;
      }

      const { id: transactionId, status } = transactionMeta;

      // Create a unique key for this transaction + status combination
      const toastKey = `${transactionId}-${status}`;

      // Skip if we've already shown a toast for this transaction status
      if (shownToastsRef.current.has(toastKey)) {
        return;
      }

      // Show appropriate toast based on status
      switch (status) {
        case TransactionStatus.submitted:
          showToast(EarnToastOptions.mUsdConversion.inProgress);
          shownToastsRef.current.add(toastKey);
          break;
        case TransactionStatus.confirmed:
          showToast(EarnToastOptions.mUsdConversion.success);
          shownToastsRef.current.add(toastKey);
          break;
        case TransactionStatus.failed:
          showToast(EarnToastOptions.mUsdConversion.failed);
          shownToastsRef.current.add(toastKey);
          break;
        default:
          // No toast for other statuses
          break;
      }
    };

    // Subscribe to transaction status updates
    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      handleTransactionStatusUpdated,
    );

    // Cleanup subscription on unmount
    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionStatusUpdated',
        handleTransactionStatusUpdated,
      );
    };
  }, [showToast, EarnToastOptions.mUsdConversion]);
};
