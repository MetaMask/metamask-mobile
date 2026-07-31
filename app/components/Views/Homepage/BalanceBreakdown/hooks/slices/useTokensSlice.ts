import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import {
  selectAccountGroupBalanceForEmptyState,
  selectBalanceBySelectedAccountGroup,
  selectBalanceChangeBySelectedAccountGroup,
} from '../../../../../../selectors/assets/balances';
import { useAccountGroupBalanceFetchState } from '../../../../../UI/Assets/components/Balance/useAccountGroupBalanceFetchState';
import { useNetworkEnablement } from '../../../../../hooks/useNetworkEnablement/useNetworkEnablement';
import type { BalanceSlice } from '../../types';

export function useTokensSlice(): BalanceSlice {
  const { popularNetworks } = useNetworkEnablement();
  const chainIdsKey = (popularNetworks ?? []).join(',');
  const chainIds = useMemo<CaipChainId[]>(
    () => (chainIdsKey ? (chainIdsKey.split(',') as CaipChainId[]) : []),
    [chainIdsKey],
  );

  const balanceSelector = useMemo(
    () => selectBalanceBySelectedAccountGroup(chainIds),
    [chainIds],
  );
  const balanceChangeSelector = useMemo(
    () => selectBalanceChangeBySelectedAccountGroup('1d', chainIds),
    [chainIds],
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
