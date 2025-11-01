import { useCallback, useState } from 'react';
import type { PulseColor } from './useColorPulseAnimation';

interface UseBalanceComparisonReturn {
  previousBalance: string;
  compareAndUpdateBalance: (newBalance: string) => PulseColor;
  resetBalance: () => void;
}

/**
 * Custom hook for comparing balance changes
 * Tracks previous balance and determines if new balance increased, decreased, or stayed the same
 *
 * @param initialBalance - Optional initial balance value
 * @returns Previous balance, comparison function, and reset function
 */
export const useBalanceComparison = (
  initialBalance: string = '',
): UseBalanceComparisonReturn => {
  const [previousBalance, setPreviousBalance] =
    useState<string>(initialBalance);

  const compareAndUpdateBalance = useCallback(
    (newBalance: string): PulseColor => {
      const currentBalance = parseFloat(newBalance || '0');
      const prevBalance = parseFloat(previousBalance || '0');

      let balanceChange: PulseColor = 'same';

      // Only compare if we have a previous balance (not initial load)
      if (
        previousBalance !== '' &&
        !isNaN(prevBalance) &&
        !isNaN(currentBalance)
      ) {
        if (currentBalance > prevBalance) {
          balanceChange = 'increase';
        } else if (currentBalance < prevBalance) {
          balanceChange = 'decrease';
        }
      }

      // Update previous balance for next comparison
      setPreviousBalance(newBalance);

      return balanceChange;
    },
    [previousBalance],
  );

  const resetBalance = useCallback(() => {
    setPreviousBalance('');
  }, []);

  return {
    previousBalance,
    compareAndUpdateBalance,
    resetBalance,
  };
};
