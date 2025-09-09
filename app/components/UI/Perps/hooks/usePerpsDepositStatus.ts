import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import { usePerpsTrading } from './usePerpsTrading';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import usePerpsToasts from './usePerpsToasts';
import { selectTransactionBridgeQuotesById } from '../../../../core/redux/slices/confirmationMetrics';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import { formatPerpsFiat } from '../utils/formatUtils';
import { selectPerpsAccountState } from '../selectors/perpsController';

/**
 * Hook to monitor deposit status and show appropriate toasts
 *
 * This hook watches for changes in deposit state and shows:
 * - In-progress toast when deposit starts
 * - Success toast when deposit completes successfully
 * - Error toast when deposit fails (but not for user cancellation)
 * - Automatically clears the result after showing the toast
 */
export const usePerpsDepositStatus = () => {
  const { clearDepositResult } = usePerpsTrading();

  const accountState = useSelector(selectPerpsAccountState);

  const { showToast, PerpsToastOptions } = usePerpsToasts();

  // Track which results we've already shown toasts for
  const hasProcessedResultRef = useRef<string | null>(null);

  // Get deposit state from controller
  const depositInProgress = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PerpsController?.depositInProgress ?? false,
  );

  const lastDepositResult = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PerpsController?.lastDepositResult ?? null,
  );

  // Get the internal transaction ID from the controller. Needed to get bridge quotes.
  const lastDepositTransactionId = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PerpsController?.lastDepositTransactionId ??
      null,
  );

  // For Perps deposits this array typically contains only one element.
  const bridgeQuotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, lastDepositTransactionId ?? ''),
  );

  // Listen for PerpsDeposit approval - Used to display deposit in progress toast
  useEffect(() => {
    const handleTransactionApproved = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (
        transactionMeta.type === TransactionType.perpsDeposit &&
        transactionMeta.status === TransactionStatus.approved
      ) {
        const processingTimeSeconds =
          bridgeQuotes?.[0]?.estimatedProcessingTimeInSeconds;

        showToast(
          PerpsToastOptions.accountManagement.deposit.inProgress(
            processingTimeSeconds,
          ),
        );
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      handleTransactionApproved,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionStatusUpdated',
        handleTransactionApproved,
      );
    };
  }, [PerpsToastOptions.accountManagement.deposit, bridgeQuotes, showToast]);

  // Listen for PerpsDeposit confirmation - Used to display deposit success toast
  useEffect(() => {
    const handleTransactionConfirmed = async (
      transactionMeta: TransactionMeta,
    ) => {
      if (transactionMeta.type === TransactionType.perpsDeposit) {
        await Engine.context.PerpsController.getAccountState();

        if (accountState?.totalBalance) {
          showToast(
            PerpsToastOptions.accountManagement.deposit.success(
              formatPerpsFiat(accountState.totalBalance),
            ),
          );
        }
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionConfirmed',
      handleTransactionConfirmed,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionConfirmed',
        handleTransactionConfirmed,
      );
    };
  }, [
    PerpsToastOptions.accountManagement.deposit,
    accountState?.totalBalance,
    showToast,
  ]);

  // Clear stale results on mount
  useEffect(() => {
    // If there's a result on mount, it's stale from a previous session
    if (lastDepositResult) {
      DevLogger.log(
        'usePerpsDepositStatus: Clearing stale deposit result on mount',
      );
      clearDepositResult();
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - intentionally omitting dependencies

  // Update toast when deposit state changes - We display the deposit error toast if the deposit fails
  useEffect(() => {
    // Create a unique identifier for this result to prevent duplicate toasts
    const resultId = lastDepositResult
      ? `${lastDepositResult.success}-${
          lastDepositResult.txHash || lastDepositResult.error
        }`
      : null;

    // Show/update toast if we have a NEW result that hasn't been processed
    if (lastDepositResult && resultId !== hasProcessedResultRef.current) {
      hasProcessedResultRef.current = resultId;

      if (!lastDepositResult.success) {
        // Show error toast
        showToast(PerpsToastOptions.accountManagement.deposit.error);
      }

      const timeoutId = setTimeout(() => {
        clearDepositResult();
        hasProcessedResultRef.current = null;
      }, 500);

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }
  }, [
    lastDepositResult,
    clearDepositResult,
    showToast,
    PerpsToastOptions.accountManagement.deposit.error,
    PerpsToastOptions.accountManagement.deposit,
    bridgeQuotes,
  ]);

  return { depositInProgress };
};
