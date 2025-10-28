import { useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';
import { TransactionRecord } from '../types/transactionTypes';

interface UsePerpsTransactionStateProps {
  withdrawalRequests: TransactionRecord[];
  isDepositInProgress: boolean;
}

interface UsePerpsTransactionStateReturn {
  withdrawalAmount: string | null;
  hasActiveWithdrawals: boolean;
  statusText: string;
  isAnyTransactionInProgress: boolean;
}

/**
 * Custom hook to manage all Perps transaction state logic
 * Separates business logic from UI components
 *
 * @param withdrawalRequests - Array of withdrawal requests to monitor
 * @param isDepositInProgress - Whether a deposit transaction is currently in progress
 * @returns Object containing all transaction state and derived values
 */
export const usePerpsTransactionState = ({
  withdrawalRequests,
  isDepositInProgress,
}: UsePerpsTransactionStateProps): UsePerpsTransactionStateReturn => {
  // Extract withdrawal amount from active withdrawals
  const withdrawalAmount = useMemo(() => {
    const activeWithdrawal = withdrawalRequests.find(
      (request) =>
        request.status === 'pending' || request.status === 'bridging',
    );
    return activeWithdrawal?.amount || null;
  }, [withdrawalRequests]);

  // Check if there are any active withdrawals (pending or bridging)
  const hasActiveWithdrawals = useMemo(
    () =>
      withdrawalRequests.some(
        (request) =>
          request.status === 'pending' || request.status === 'bridging',
      ),
    [withdrawalRequests],
  );

  // Determine the status text based on transaction states
  const statusText = useMemo(() => {
    if (isDepositInProgress && hasActiveWithdrawals) {
      return strings('perps.multiple_transactions_in_progress');
    }
    if (isDepositInProgress) {
      return strings('perps.deposit_in_progress');
    }
    if (hasActiveWithdrawals) {
      return strings('perps.withdraw_in_progress');
    }
    return strings('perps.available_balance');
  }, [isDepositInProgress, hasActiveWithdrawals]);

  // Determine if any transaction is in progress
  const isAnyTransactionInProgress = useMemo(
    () => isDepositInProgress || hasActiveWithdrawals,
    [isDepositInProgress, hasActiveWithdrawals],
  );

  return {
    withdrawalAmount,
    hasActiveWithdrawals,
    statusText,
    isAnyTransactionInProgress,
  };
};
