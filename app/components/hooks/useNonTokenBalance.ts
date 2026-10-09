import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useFiatNormalizer } from '../Views/Homepage/BalanceBreakdown/hooks/useFiatNormalizer';
import { useDefiSlice } from '../Views/Homepage/BalanceBreakdown/hooks/slices/useDefiSlice';
import { useMoneySlice } from '../Views/Homepage/BalanceBreakdown/hooks/slices/useMoneySlice';
import { usePerpsSlice } from '../Views/Homepage/BalanceBreakdown/hooks/slices/usePerpsSlice';
import { usePredictSlice } from '../Views/Homepage/BalanceBreakdown/hooks/slices/usePredictSlice';
import { selectSelectedAccountGroup } from '../../selectors/multichainAccounts/accountTreeController';
import type {
  BalanceSlice,
  FiatConverter,
  SliceKey,
} from '../Views/Homepage/BalanceBreakdown/types';

export type NonTokenSliceKey = Exclude<SliceKey, 'tokens'>;

const ACCOUNT_SLICE_KEYS: NonTokenSliceKey[] = ['perps', 'predict', 'defi'];

export interface NonTokenBalances {
  moneyBalance?: number;
  accountBalance?: number;
}

export type AccountListNonTokenBalanceGetter = (
  accountGroupId: string,
) => number | null;

function getSliceBalance(
  slice: Pick<BalanceSlice, 'status' | 'valueFiat'>,
): number | undefined {
  if (slice.status === 'loading') {
    return undefined;
  }

  return slice.status === 'ready' ? slice.valueFiat : 0;
}

export function getNonTokenBalances(
  slices: Record<NonTokenSliceKey, Pick<BalanceSlice, 'status' | 'valueFiat'>>,
): NonTokenBalances {
  const moneyBalance = getSliceBalance(slices.money);
  const accountSliceBalances = ACCOUNT_SLICE_KEYS.map((key) =>
    getSliceBalance(slices[key]),
  );
  const hasLoadingAccountSlice = accountSliceBalances.some(
    (balance) => balance === undefined,
  );

  return {
    moneyBalance,
    accountBalance: hasLoadingAccountSlice
      ? undefined
      : accountSliceBalances.reduce<number>(
          (total, balance) => total + (balance ?? 0),
          0,
        ),
  };
}

/**
 * Money is shared across every account row. Selected-account primitives are
 * only added to the active account group.
 */
export function getAccountListNonTokenBalance({
  moneyBalance,
  accountBalance,
  selectedAccountGroupId,
  accountGroupId,
}: NonTokenBalances & {
  selectedAccountGroupId?: string;
  accountGroupId: string;
}): number | null {
  if (moneyBalance === undefined) {
    return null;
  }

  if (selectedAccountGroupId !== accountGroupId) {
    return moneyBalance;
  }

  return accountBalance === undefined ? null : moneyBalance + accountBalance;
}

export function useNonTokenBalanceSlices(
  toUserCurrency: FiatConverter,
): Record<NonTokenSliceKey, BalanceSlice> {
  const moneySlice = useMoneySlice(toUserCurrency);
  const perpsSlice = usePerpsSlice(toUserCurrency);
  const predictSlice = usePredictSlice(toUserCurrency);
  const defiSlice = useDefiSlice(toUserCurrency);

  return useMemo(
    () => ({
      money: moneySlice,
      perps: perpsSlice,
      predict: predictSlice,
      defi: defiSlice,
    }),
    [defiSlice, moneySlice, perpsSlice, predictSlice],
  );
}

export function useNonTokenBalances(): NonTokenBalances {
  const { toUserCurrency } = useFiatNormalizer();
  const slices = useNonTokenBalanceSlices(toUserCurrency);

  return useMemo(() => getNonTokenBalances(slices), [slices]);
}

export function useAccountListNonTokenBalance(): AccountListNonTokenBalanceGetter {
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const { moneyBalance, accountBalance } = useNonTokenBalances();

  return useCallback(
    (accountGroupId: string) =>
      getAccountListNonTokenBalance({
        moneyBalance,
        accountBalance,
        selectedAccountGroupId: selectedAccountGroup?.id,
        accountGroupId,
      }),
    [accountBalance, moneyBalance, selectedAccountGroup?.id],
  );
}
