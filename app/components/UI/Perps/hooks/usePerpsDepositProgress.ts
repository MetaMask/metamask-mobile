import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import { usePerpsLiveAccount } from './stream/usePerpsLiveAccount';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';

/**
 * Hook to track deposit progress state for UI components
 *
 * This hook monitors transaction status and balance changes to determine
 * when a deposit is in progress, similar to usePerpsDepositStatus but
 * returns the state for UI consumption instead of showing toasts.
 */
export const usePerpsDepositProgress = () => {
  // Get live account data with fast updates
  const { account: liveAccount } = usePerpsLiveAccount({ throttleMs: 1000 });

  // Track if we're expecting a deposit
  const [isDepositInProgress, setIsDepositInProgress] = useState(false);
  const prevAvailableBalanceRef = useRef<string>('0');

  // Listen for PerpsDeposit transaction status updates
  useEffect(() => {
    const handlePerpsDepositTransactionStatusUpdate = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (transactionMeta.type !== TransactionType.perpsDeposit) {
        return;
      }

      // Handle PerpsDeposit approved - set deposit in progress
      if (transactionMeta.status === TransactionStatus.approved) {
        setIsDepositInProgress(true);
        prevAvailableBalanceRef.current = liveAccount?.availableBalance || '0';
      }

      // Handle PerpsDeposit failed - clear deposit in progress
      if (transactionMeta.status === TransactionStatus.failed) {
        setIsDepositInProgress(false);
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
  }, [liveAccount?.availableBalance]);

  // Watch for balance increases when expecting a deposit
  useEffect(() => {
    if (!isDepositInProgress || !liveAccount) {
      return;
    }

    const currentBalance = parseFloat(liveAccount.availableBalance || '0');
    const previousBalance = parseFloat(prevAvailableBalanceRef.current);

    // Check if balance increased
    if (currentBalance > previousBalance) {
      // Deposit completed successfully
      setIsDepositInProgress(false);
      prevAvailableBalanceRef.current = liveAccount.availableBalance;
    }
  }, [isDepositInProgress, liveAccount]);

  return { isDepositInProgress };
};
