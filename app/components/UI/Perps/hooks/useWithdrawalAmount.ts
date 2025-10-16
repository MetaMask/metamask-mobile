import { useState, useEffect } from 'react';

interface WithdrawalRequest {
  status: string;
  amount?: string;
}

/**
 * Custom hook to manage withdrawal amount state based on active withdrawal requests
 *
 * @param withdrawalRequests - Array of withdrawal requests to monitor
 * @returns Object containing the current withdrawal amount or null if no active withdrawals
 */
export const useWithdrawalAmount = (
  withdrawalRequests: WithdrawalRequest[],
) => {
  const [withdrawalAmount, setWithdrawalAmount] = useState<string | null>(null);

  useEffect(() => {
    // Check if there are any active withdrawals (pending or bridging)
    const activeWithdrawal = withdrawalRequests.find(
      (request) =>
        request.status === 'pending' || request.status === 'bridging',
    );

    if (activeWithdrawal?.amount) {
      setWithdrawalAmount(activeWithdrawal.amount);
    } else {
      // Clear withdrawal amount when no active withdrawals
      setWithdrawalAmount(null);
    }
  }, [withdrawalRequests]);

  return { withdrawalAmount };
};
