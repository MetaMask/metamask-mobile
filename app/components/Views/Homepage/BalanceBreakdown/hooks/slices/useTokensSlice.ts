import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectAccountGroupBalanceForEmptyState,
  selectBalanceBySelectedAccountGroup,
  selectBalanceChangeBySelectedAccountGroup,
} from '../../../../../../selectors/assets/balances';
import { useAccountGroupBalanceFetchState } from '../../../../../UI/Assets/components/Balance/useAccountGroupBalanceFetchState';
import type { BalanceSlice } from '../../types';

export function useTokensSlice(): BalanceSlice {
  // No network list is passed intentionally: this uses all enabled networks,
  // matching the account-list balance and the aggregate-balance requirement.
  const balanceSelector = useMemo(
    () => selectBalanceBySelectedAccountGroup(),
    [],
  );
  const balanceChangeSelector = useMemo(
    () => selectBalanceChangeBySelectedAccountGroup('1d'),
    [],
  );

  const groupBalance = useSelector(balanceSelector);
  const balanceChange1d = useSelector(balanceChangeSelector);
  const accountGroupBalance = useSelector(
    selectAccountGroupBalanceForEmptyState,
  );
  const hasBalanceFetched = useAccountGroupBalanceFetchState({
    groupBalance,
    accountGroupBalance,
  });

  const status = !groupBalance || !hasBalanceFetched ? 'loading' : 'ready';
  const valueFiat =
    status === 'ready' ? (groupBalance?.totalBalanceInUserCurrency ?? 0) : 0;

  return useMemo(
    () => ({
      key: 'tokens' as const,
      isVisible: true,
      valueFiat,
      delta:
        status === 'ready' && balanceChange1d
          ? {
              amount: balanceChange1d.amountChangeInUserCurrency,
              percent: balanceChange1d.percentChange / 100,
            }
          : undefined,
      status,
    }),
    [balanceChange1d, status, valueFiat],
  );
}
