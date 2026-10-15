import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useBalanceBreakdown } from '../Views/Homepage/BalanceBreakdown/hooks/useBalanceBreakdown';
import { selectSelectedAccountGroup } from '../../selectors/multichainAccounts/accountTreeController';
import type { HeroData } from '../Views/Homepage/BalanceBreakdown/types';

// Balance breakdown hooks expose only the selected account. Retain its last
// complete homepage total so previously selected accounts do not fall back to
// an incomplete token-only value after switching accounts.
const accountBalanceCache = new Map<string, number>();

export type AccountListBalanceGetter = (
  accountGroupId: string,
) => number | null;

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
}): number | null {
  const isSelected = selectedAccountGroupId === accountGroupId;

  if (isSelected) {
    if (
      hero.status !== 'ready' ||
      hero.isPartiallyLoaded ||
      hero.hasErroredSlice
    ) {
      return null;
    }

    return hero.totalFiat;
  }

  if (knownAccountBalance === undefined) {
    return null;
  }

  return knownAccountBalance;
}

export function useAccountListBalance(): AccountListBalanceGetter {
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const { hero } = useBalanceBreakdown();
  const isHeroComplete =
    hero.status === 'ready' && !hero.isPartiallyLoaded && !hero.hasErroredSlice;

  useEffect(() => {
    if (!selectedAccountGroup?.id || !isHeroComplete) {
      return;
    }

    accountBalanceCache.set(
      `${hero.userCurrency}:${selectedAccountGroup.id}`,
      hero.totalFiat,
    );
  }, [
    hero.totalFiat,
    hero.userCurrency,
    isHeroComplete,
    selectedAccountGroup?.id,
  ]);

  return useCallback(
    (accountGroupId: string) => {
      const knownAccountBalance = accountBalanceCache.get(
        `${hero.userCurrency}:${accountGroupId}`,
      );

      return getAccountListBalance({
        hero,
        knownAccountBalance,
        selectedAccountGroupId: selectedAccountGroup?.id,
        accountGroupId,
      });
    },
    [hero, selectedAccountGroup?.id],
  );
}
