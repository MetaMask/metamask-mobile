import { useEffect, useRef, useState } from 'react';

/**
 * Timeout for account group balance fetch.
 * This prevents a flash of empty state when the balance is not yet fetched.
 * !TODO: This is a temporary fix for an artificial loading state and should be refactored after Account API v4 integration
 */
export const ACCOUNT_GROUP_BALANCE_FETCH_TIMEOUT = 3000;

interface GroupBalanceSnapshot {
  groupId: string;
  totalBalanceInUserCurrency: number;
}

interface AccountGroupBalanceSnapshot {
  totalBalanceInUserCurrency: number;
}

interface UseAccountGroupBalanceFetchStateParams {
  groupBalance: GroupBalanceSnapshot | null;
  accountGroupBalance: AccountGroupBalanceSnapshot | null;
}

export function useAccountGroupBalanceFetchState({
  groupBalance,
  accountGroupBalance,
}: UseAccountGroupBalanceFetchStateParams): boolean {
  const [hasBalanceFetched, setHasBalanceFetched] = useState(false);
  const initialBalanceRef = useRef<number | null>(null);
  const initialAccountGroupBalanceRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentGroupIdRef = useRef<string | null>(null);

  useEffect(() => {
    const groupId = groupBalance?.groupId ?? null;

    // Check if groupId has changed (account switch)
    if (currentGroupIdRef.current !== groupId) {
      // Reset all tracking state for new account
      setHasBalanceFetched(false);
      initialBalanceRef.current = null;
      initialAccountGroupBalanceRef.current = null;
      currentGroupIdRef.current = groupId;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setHasBalanceFetched(true);
      }, ACCOUNT_GROUP_BALANCE_FETCH_TIMEOUT);
    }

    // Store initial balance when it first appears
    if (initialBalanceRef.current === null && groupBalance) {
      initialBalanceRef.current = groupBalance.totalBalanceInUserCurrency;
    }

    if (initialAccountGroupBalanceRef.current === null && accountGroupBalance) {
      initialAccountGroupBalanceRef.current =
        accountGroupBalance.totalBalanceInUserCurrency;
    }

    // Track balance changes - if EITHER balance updates from initial value, mark as fetched
    // We track both groupBalance AND accountGroupBalance since empty state uses accountGroupBalance
    if (groupBalance && initialBalanceRef.current !== null) {
      const currentBalance = groupBalance.totalBalanceInUserCurrency;
      const accountGroupCurrentBalance =
        accountGroupBalance?.totalBalanceInUserCurrency ?? null;

      // Mark as fetched if either balance has changed from initial 0, or if both exist and are non-zero
      const hasChanged = currentBalance !== initialBalanceRef.current;
      const accountGroupExistsAndNonZero =
        accountGroupCurrentBalance !== null && accountGroupCurrentBalance > 0;
      const bothExistAndNonZero =
        currentBalance > 0 && accountGroupExistsAndNonZero;
      const accountGroupBecamePositive =
        accountGroupExistsAndNonZero &&
        (initialAccountGroupBalanceRef.current === null ||
          initialAccountGroupBalanceRef.current === 0);

      if (hasChanged || bothExistAndNonZero || accountGroupBecamePositive) {
        setHasBalanceFetched(true);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    }
  }, [groupBalance, accountGroupBalance]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  return hasBalanceFetched;
}
