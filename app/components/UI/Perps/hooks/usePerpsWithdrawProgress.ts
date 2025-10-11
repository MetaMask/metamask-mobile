import { useEffect, useRef, useState } from 'react';
import { usePerpsLiveAccount } from './stream/usePerpsLiveAccount';
import type { RootState } from '../../../../reducers';
import { useSelector } from 'react-redux';

/**
 * Hook to track withdrawal progress state for UI components
 *
 * This hook monitors the PerpsController's withdrawInProgress state and balance changes
 * to determine when a withdrawal is in progress, similar to usePerpsDepositProgress but
 * returns the state for UI consumption instead of showing toasts.
 */
export const usePerpsWithdrawProgress = () => {
  // Get live account data with fast updates
  const { account: liveAccount } = usePerpsLiveAccount({ throttleMs: 1000 });

  // Track if we're expecting a withdrawal
  const [isWithdrawInProgress, setIsWithdrawInProgress] = useState(false);
  const prevAvailableBalanceRef = useRef<string>('0');
  const liveAccountRef = useRef(liveAccount);

  // Get withdrawal progress state from controller
  const withdrawInProgress = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PerpsController?.withdrawInProgress ?? false,
  );

  // Update the ref whenever liveAccount changes
  useEffect(() => {
    liveAccountRef.current = liveAccount;
  }, [liveAccount]);

  // Listen for controller withdrawInProgress state changes
  useEffect(() => {
    if (withdrawInProgress) {
      // Withdrawal started - set progress state and capture current balance
      setIsWithdrawInProgress(true);
      prevAvailableBalanceRef.current =
        liveAccountRef.current?.availableBalance || '0';
    } else if (isWithdrawInProgress) {
      // Withdrawal completed or failed - clear progress state
      setIsWithdrawInProgress(false);
    }
  }, [withdrawInProgress, isWithdrawInProgress]);

  // Watch for balance decreases when expecting a withdrawal
  useEffect(() => {
    if (!isWithdrawInProgress || !liveAccount) {
      return;
    }

    const currentBalance = parseFloat(liveAccount.availableBalance || '0');
    const previousBalance = parseFloat(prevAvailableBalanceRef.current);

    // Check if balance decreased (funds withdrawn)
    if (currentBalance < previousBalance) {
      // Withdrawal completed successfully
      setIsWithdrawInProgress(false);
      prevAvailableBalanceRef.current = liveAccount.availableBalance;
    }
  }, [isWithdrawInProgress, liveAccount]);

  return { isWithdrawInProgress };
};
