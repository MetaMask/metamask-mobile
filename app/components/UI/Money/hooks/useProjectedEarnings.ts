import { useMemo } from 'react';
import { tokenFiatValue } from '../../Earn/utils/token';
import type { MoneyDepositAsset } from '../selectors/depositTokens';
import { moneySafeTokenFiatCurrency } from '../utils/moneyFormatFiat';
import {
  calculateProjectedEarnings,
  PROJECTION_YEARS,
} from '../utils/projections';

interface ProjectedEarnings {
  eligibleTokens: MoneyDepositAsset[];
  totalAssetsFiat: number;
  projectedAmount: number;
  currency: string;
}

export function useProjectedEarnings(
  tokens: MoneyDepositAsset[] | undefined,
  apyDecimal: number | undefined,
): ProjectedEarnings {
  const safeApyDecimal = apyDecimal ?? 0;

  const eligibleTokens = useMemo(
    () => (tokens ?? []).filter((token) => tokenFiatValue(token) > 0),
    [tokens],
  );

  const totalAssetsFiat = useMemo(
    () => eligibleTokens.reduce((sum, token) => sum + tokenFiatValue(token), 0),
    [eligibleTokens],
  );

  const projectedAmount = useMemo(
    () =>
      eligibleTokens.reduce(
        (sum, token) =>
          sum +
          calculateProjectedEarnings(
            tokenFiatValue(token),
            safeApyDecimal,
            PROJECTION_YEARS,
          ),
        0,
      ),
    [eligibleTokens, safeApyDecimal],
  );

  // Derived from the same `eligibleTokens` the sums are computed over to prevent drift.
  const currency = useMemo(
    () => moneySafeTokenFiatCurrency(eligibleTokens[0]),
    [eligibleTokens],
  );

  return { eligibleTokens, totalAssetsFiat, projectedAmount, currency };
}

export default useProjectedEarnings;
