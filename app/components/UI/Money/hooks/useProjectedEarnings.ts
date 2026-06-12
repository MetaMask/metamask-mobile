import { useMemo } from 'react';
import { AssetType } from '../../../Views/confirmations/types/token';
import { tokenFiatValue } from '../../Earn/hooks/useMusdConversionTokens';
import {
  calculateProjectedEarnings,
  PROJECTION_YEARS,
} from '../utils/projections';

interface ProjectedEarnings {
  eligibleTokens: AssetType[];
  totalAssetsFiat: number;
  projectedAmount: number;
}

export function useProjectedEarnings(
  tokens: AssetType[] | undefined,
  apyPercent: number | undefined,
): ProjectedEarnings {
  const safeApyPercent = apyPercent ?? 0;

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
            safeApyPercent,
            PROJECTION_YEARS,
          ),
        0,
      ),
    [eligibleTokens, safeApyPercent],
  );

  return { eligibleTokens, totalAssetsFiat, projectedAmount };
}

export default useProjectedEarnings;
