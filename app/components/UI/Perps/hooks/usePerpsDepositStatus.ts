import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectTransactionBridgeQuotesById } from '../../../../core/redux/slices/confirmationMetrics';
import type { RootState } from '../../../../reducers';
import {
  ARBITRUM_MAINNET_CHAIN_ID_HEX,
  USDC_ARBITRUM_MAINNET_ADDRESS,
} from '../constants/hyperLiquidConfig';
import { usePerpsLiveAccount } from './stream/usePerpsLiveAccount';
import usePerpsToasts from './usePerpsToasts';
import { usePerpsTrading } from './usePerpsTrading';

// Track transaction IDs that should skip the default toast (handled by PerpsOrderView)
const skipDefaultToastTransactionIds = new Set<string>();

/**
 * Mark a transaction ID to skip the default toast
 * Used by PerpsOrderView to prevent duplicate toasts
 */
export const markTransactionSkipDefaultToast = (transactionId: string) => {
  skipDefaultToastTransactionIds.add(transactionId);
};

/**
 * Unmark a transaction ID (cleanup)
 */
export const unmarkTransactionSkipDefaultToast = (transactionId: string) => {
  skipDefaultToastTransactionIds.delete(transactionId);
};

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
      const { metamaskPay } = transactionMeta;

      const isArbUSDCDeposit =
        metamaskPay?.chainId === ARBITRUM_MAINNET_CHAIN_ID_HEX &&
        metamaskPay?.tokenAddress === USDC_ARBITRUM_MAINNET_ADDRESS;

      if (
        transactionMeta.type === TransactionType.perpsDeposit &&
        transactionMeta.status === TransactionStatus.approved
      ) {
        // Skip showing toast if this transaction is being handled by PerpsOrderView
        if (skipDefaultToastTransactionIds.has(transactionMeta.id)) {
          return;
        }

        expectingDepositRef.current = true;
        prevAvailableBalanceRef.current = liveAccount?.availableBalance || '0';

        const processingTimeSeconds = isArbUSDCDeposit ? 0 : 60; // hardcoded to 1 minute to avoid estimation failures of multiple bridges

        showToast(
          PerpsToastOptions.accountManagement.deposit.inProgress(
            processingTimeSeconds,
            transactionMeta.id,
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
  }, [
    PerpsToastOptions.accountManagement.deposit,
    bridgeQuotes,
    liveAccount?.availableBalance,
    showToast,
  ]);

  // Watch for balance increases when expecting a deposit
  useEffect(() => {
    if (!expectingDepositRef.current || !liveAccount) {
      return;
    }

    const currentBalance = Number.parseFloat(
      liveAccount.availableBalance || '0',
    );
    const previousBalance = Number.parseFloat(prevAvailableBalanceRef.current);
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

  // Handle deposit errors from controller state
  useEffect(() => {
    if (lastDepositResult && !lastDepositResult.success) {
      showToast(PerpsToastOptions.accountManagement.deposit.error);

      expectingDepositRef.current = false;

      const timeout = setTimeout(() => {
        clearDepositResult();
      }, 500);

      // Clear the error after showing toast
      return () => clearTimeout(timeout);
    }
  }, [
    lastDepositResult,
    clearDepositResult,
    showToast,
    PerpsToastOptions.accountManagement.deposit.error,
  ]);

  return { depositInProgress };
};
