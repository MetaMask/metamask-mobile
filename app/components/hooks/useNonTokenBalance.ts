import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useBalanceBreakdown } from '../Views/Homepage/BalanceBreakdown/hooks/useBalanceBreakdown';
import { selectSelectedAccountGroup } from '../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountByAccountGroupAndScope } from '../../selectors/multichainAccounts/accounts';
import { EVM_SCOPE } from '../UI/Earn/constants/networks';
import type { HeroData } from '../Views/Homepage/BalanceBreakdown/types';

// Balance breakdown hooks expose only the selected account. Retain its last
// complete homepage total so previously selected accounts do not fall back to
// an incomplete token-only value after switching accounts.
const accountBalanceCache = new Map<string, number>();

export interface AccountListBalance {
  mode: 'total';
  value: number;
}

export type AccountListBalanceGetter = (
  accountGroupId: string,
) => AccountListBalance | null;

export function getAccountListBalance({
  hero,
  knownAccountBalance,
  selectedAccountGroupId,
  accountGroupId,
}: {
  hero: HeroData;
  knownAccountBalance?: number;
  selectedAccountGroupId?: string;
  accountGroupId: string;
}): AccountListBalance | null {
  const isSelected = selectedAccountGroupId === accountGroupId;

  if (isSelected) {
    if (
      hero.status !== 'ready' ||
      hero.isPartiallyLoaded ||
      hero.hasErroredSlice
    ) {
      return null;
    }

    return { mode: 'total', value: hero.totalFiat };
  }

  if (knownAccountBalance === undefined) {
    return null;
  }

  return { mode: 'total', value: knownAccountBalance };
}

export function useAccountListBalance(): AccountListBalanceGetter {
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const getInternalAccountByAccountGroupAndScope = useSelector(
    selectInternalAccountByAccountGroupAndScope,
  );
  const { hero } = useBalanceBreakdown();
  const selectedEvmAddress = selectedAccountGroup
    ? getInternalAccountByAccountGroupAndScope(
        EVM_SCOPE,
        selectedAccountGroup.id,
      )?.address.toLowerCase()
    : undefined;
  const isHeroComplete =
    hero.status === 'ready' && !hero.isPartiallyLoaded && !hero.hasErroredSlice;

  useEffect(() => {
    if (!selectedEvmAddress || !isHeroComplete) {
      return;
    }

    accountBalanceCache.set(
      `${hero.userCurrency}:${selectedEvmAddress}`,
      hero.totalFiat,
    );
  }, [hero.totalFiat, hero.userCurrency, isHeroComplete, selectedEvmAddress]);

  return useCallback(
    (accountGroupId: string) => {
      const evmAddress = getInternalAccountByAccountGroupAndScope(
        EVM_SCOPE,
        accountGroupId,
      )?.address.toLowerCase();
      const knownAccountBalance = evmAddress
        ? accountBalanceCache.get(`${hero.userCurrency}:${evmAddress}`)
        : undefined;

      return getAccountListBalance({
        hero,
        knownAccountBalance,
        selectedAccountGroupId: selectedAccountGroup?.id,
        accountGroupId,
      });
    },
    [getInternalAccountByAccountGroupAndScope, hero, selectedAccountGroup?.id],
  );
}
