import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import { usePerpsTrading } from './usePerpsTrading';
import usePerpsToasts from './usePerpsToasts';
import { selectTransactionBridgeQuotesById } from '../../../../core/redux/slices/confirmationMetrics';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import { usePerpsLiveAccount } from './stream/usePerpsLiveAccount';

/**
 * Hook to monitor deposit status and show appropriate toasts
 *
 * This hook:
 * 1. Shows in-progress toast when deposit transaction is approved
 * 2. Watches live account balance for increases after deposit confirmation
 * 3. Shows success toast when balance increases (indicating HyperLiquid processed the deposit)
 * 4. Shows error toast if deposit fails
 *
 * This ensures the success toast only shows when HyperLiquid has actually
 * credited the funds, matching what the user sees in the UI.
 */
export const usePerpsDepositStatus = () => {
  const { clearDepositResult } = usePerpsTrading();
  const { showToast, PerpsToastOptions } = usePerpsToasts();
  // Get live account data with fast updates
  const { account: liveAccount } = usePerpsLiveAccount({ throttleMs: 1000 });

  // Track if we're expecting a deposit
  const expectingDepositRef = useRef(false);
  const prevAvailableBalanceRef = useRef<string>('0');

  // Get deposit state from controller
  const depositInProgress = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PerpsController?.depositInProgress ?? false,
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

  // Listen for PerpsDeposit transaction status updates to display appropriate toasts
  useEffect(() => {
    const handlePerpsDepositTransactionStatusUpdate = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (transactionMeta.type !== TransactionType.perpsDeposit) {
        return;
      }

      // Handle PerpsDeposit approved to display "deposit in progress" toast
      if (transactionMeta.status === TransactionStatus.approved) {
        expectingDepositRef.current = true;
        prevAvailableBalanceRef.current = liveAccount?.availableBalance || '0';

        const processingTimeSeconds =
          bridgeQuotes?.[0]?.estimatedProcessingTimeInSeconds;

        showToast(
          PerpsToastOptions.accountManagement.deposit.inProgress(
            processingTimeSeconds,
            transactionMeta.id,
          ),
        );
      }

      // Handle PerpsDeposit failed to display "deposit error" toast
      if (transactionMeta.status === TransactionStatus.failed) {
        expectingDepositRef.current = false;

        showToast(PerpsToastOptions.accountManagement.deposit.error);

        clearDepositResult();
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      handlePerpsDepositTransactionStatusUpdate,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionStatusUpdated',
        handlePerpsDepositTransactionStatusUpdate,
      );
    };
  }, [
    PerpsToastOptions.accountManagement.deposit,
    bridgeQuotes,
    clearDepositResult,
    liveAccount?.availableBalance,
    showToast,
  ]);

  // Watch for balance increases when expecting a deposit
  useEffect(() => {
    if (!expectingDepositRef.current || !liveAccount) {
      return;
    }

    const currentBalance = parseFloat(liveAccount.availableBalance || '0');
    const previousBalance = parseFloat(prevAvailableBalanceRef.current);
    // Check if balance increased
    if (currentBalance > previousBalance) {
      // Show success toast
      showToast(
        PerpsToastOptions.accountManagement.deposit.success(
          liveAccount?.availableBalance,
        ),
      );

      // Reset state
      expectingDepositRef.current = false;
      prevAvailableBalanceRef.current = liveAccount.availableBalance;
    }
  }, [liveAccount, showToast, PerpsToastOptions.accountManagement.deposit]);

  return { depositInProgress };
};
