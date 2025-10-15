import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { RootState } from '../../../../reducers';
import usePerpsToasts from './usePerpsToasts';
import { usePerpsLiveAccount } from './stream/usePerpsLiveAccount';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { USDC_ARBITRUM_MAINNET_ADDRESS } from '../constants/hyperLiquidConfig';

/**
 * Hook to monitor deposit status and show appropriate toasts
 * Handles the full deposit flow: in progress, success, and error states
 */
export const usePerpsDepositStatus = () => {
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  // Get live account data with fast updates
  const { account: liveAccount } = usePerpsLiveAccount({ throttleMs: 1000 });

  const lastDepositResult = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PerpsController?.lastDepositResult ?? null,
  );

  const clearDepositResult = useCallback(() => {
    const controller = Engine.context.PerpsController;
    controller?.clearDepositResult();
  }, []);

  // Track if we've already processed the current result
  const hasProcessedResultRef = useRef<string | null>(null);
  const hasShownInProgressToastRef = useRef<string | null>(null);

  // Track balance changes to detect when funds are available
  const prevAvailableBalanceRef = useRef<string>('0');
  const [isWaitingForFunds, setIsWaitingForFunds] = useState<boolean>(false);
  const liveAccountRef = useRef(liveAccount);

  // Update the ref whenever liveAccount changes
  useEffect(() => {
    liveAccountRef.current = liveAccount;
  }, [liveAccount]);

  /**
   * Check if the transaction is an arb.USDC deposit
   */
  const isArbUsdcDeposit = useCallback(
    (transactionMeta: TransactionMeta): boolean => {
      // For direct perps deposits, check if the transaction is to the arb.USDC token address
      if (transactionMeta.type === 'perpsDeposit') {
        const tokenAddress = transactionMeta.txParams?.to?.toLowerCase();
        const isArbUsdc =
          tokenAddress === USDC_ARBITRUM_MAINNET_ADDRESS.toLowerCase();

        DevLogger.log(
          'usePerpsDepositStatus: Checking direct arb.USDC detection',
          {
            tokenAddress,
            expectedAddress: USDC_ARBITRUM_MAINNET_ADDRESS.toLowerCase(),
            isArbUsdc,
            transactionId: transactionMeta.id,
          },
        );

        return isArbUsdc;
      }

      // For bridge transactions, they are never instant (they need bridging time)
      // Bridge transactions are ETH -> USDC conversions that take time
      if (transactionMeta.type === 'bridge') {
        DevLogger.log(
          'usePerpsDepositStatus: Bridge transaction detected - not instant',
          {
            transactionId: transactionMeta.id,
            type: transactionMeta.type,
          },
        );

        return false; // Bridge transactions always take time
      }

      // For other transaction types, assume not arb.USDC
      DevLogger.log('usePerpsDepositStatus: Unknown transaction type', {
        type: transactionMeta.type,
        transactionId: transactionMeta.id,
      });

      return false;
    },
    [],
  );

  // Handle deposit error results (success is handled by balance monitoring)
  useEffect(() => {
    // Only handle error cases - success is handled by balance monitoring
    if (!lastDepositResult || lastDepositResult.success) {
      return;
    }

    // Create a unique identifier for this error result to prevent duplicate toasts
    const resultId = `error-${lastDepositResult.error}`;

    // Skip if we've already processed this error
    if (resultId === hasProcessedResultRef.current) {
      return;
    }

    // Mark this error as processed
    hasProcessedResultRef.current = resultId;

    DevLogger.log('usePerpsDepositStatus: Processing error result', {
      lastDepositResult,
      resultId,
    });

    // Show error toast
    showToast(PerpsToastOptions.accountManagement.deposit.error);

    // Stop waiting for funds since there was an error
    setIsWaitingForFunds(false);

    // Clear the result after showing toast
    const timeoutId = setTimeout(() => {
      clearDepositResult();
      hasProcessedResultRef.current = null;
      hasShownInProgressToastRef.current = null;
    }, 500);

    // Cleanup function to clear timeout if component unmounts
    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    lastDepositResult,
    clearDepositResult,
    showToast,
    PerpsToastOptions.accountManagement.deposit,
  ]);

  // Monitor transaction status changes to trigger in-progress toast and set up balance tracking
  useEffect(() => {
    const handlePerpsDepositTransactionStatusUpdate = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      DevLogger.log('usePerpsDepositStatus: Processing transaction', {
        type: transactionMeta.type,
        status: transactionMeta.status,
        id: transactionMeta.id,
      });
      // Handle both perpsDeposit and bridge transactions
      if (
        transactionMeta.type !== TransactionType.perpsDeposit &&
        transactionMeta.type !== 'bridge'
      ) {
        return;
      }

      // When transaction is approved/submitted/confirmed, trigger in-progress toast and start balance monitoring
      if (
        transactionMeta.status === TransactionStatus.approved ||
        transactionMeta.status === TransactionStatus.submitted ||
        transactionMeta.status === TransactionStatus.confirmed
      ) {
        // Only show if we haven't already shown this toast for this transaction
        if (hasShownInProgressToastRef.current !== transactionMeta.id) {
          DevLogger.log(
            'usePerpsDepositStatus: Transaction approved/submitted/confirmed, triggering in-progress toast',
            {
              transactionId: transactionMeta.id,
              status: transactionMeta.status,
              txParams: transactionMeta.txParams,
            },
          );

          // Show deposit in progress toast with appropriate ETA
          // arb.USDC deposits are instant (0 seconds), others take ~1 minute
          const isArbUsdc = isArbUsdcDeposit(transactionMeta);
          const processingTime = isArbUsdc ? 0 : 60;

          DevLogger.log('usePerpsDepositStatus: Processing time decision', {
            isArbUsdc,
            processingTime,
            transactionId: transactionMeta.id,
          });
          showToast(
            PerpsToastOptions.accountManagement.deposit.inProgress(
              processingTime,
              transactionMeta.id,
            ),
          );

          hasShownInProgressToastRef.current = transactionMeta.id;
        }

        // Start monitoring balance changes to detect when funds are available
        setIsWaitingForFunds(true);
        prevAvailableBalanceRef.current =
          liveAccountRef.current?.availableBalance || '0';
      }

      // Handle transaction failure - stop waiting for funds and reset toast tracking
      if (transactionMeta.status === TransactionStatus.failed) {
        setIsWaitingForFunds(false);
        hasShownInProgressToastRef.current = null;
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
    showToast,
    PerpsToastOptions.accountManagement.deposit,
    isArbUsdcDeposit,
  ]);

  // Monitor balance changes to detect when funds are available
  useEffect(() => {
    if (!isWaitingForFunds || !liveAccount) {
      return;
    }

    const currentBalance = parseFloat(liveAccount.availableBalance || '0');
    const previousBalance = parseFloat(prevAvailableBalanceRef.current);

    // Check if balance increased (funds are now available)
    if (currentBalance > previousBalance) {
      DevLogger.log(
        'usePerpsDepositStatus: Balance increased, funds are now available',
        {
          previousBalance,
          currentBalance,
          increase: currentBalance - previousBalance,
        },
      );

      // Calculate deposit amount and show success toast
      const depositAmount = currentBalance.toFixed(2);
      showToast(
        PerpsToastOptions.accountManagement.deposit.success(depositAmount),
      );

      // Stop waiting for funds and clear state
      setIsWaitingForFunds(false);
      prevAvailableBalanceRef.current = liveAccount.availableBalance;

      // Reset toast tracking immediately
      hasShownInProgressToastRef.current = null;

      // Clear any pending deposit result after a delay
      setTimeout(() => {
        clearDepositResult();
        hasProcessedResultRef.current = null;
      }, 500);
    }
  }, [
    isWaitingForFunds,
    liveAccount,
    showToast,
    PerpsToastOptions.accountManagement.deposit,
    clearDepositResult,
  ]);

  return {
    depositInProgress: !!lastDepositResult || isWaitingForFunds,
  };
};
