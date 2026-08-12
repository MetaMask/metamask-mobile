import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type { NormalizedVaultApyResponse } from '@metamask/money-account-balance-service';
import type { UseQueryResult } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { MoneyAccountBalanceServiceQueryKeys } from '../queryKeys';
import { selectMoneyVaultApyRemoteConfig } from '../selectors/featureFlags';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export interface UseMoneyVaultApyResult {
  vaultApyQuery: UseQueryResult<NormalizedVaultApyResponse>;
  apyDecimal: number | undefined;
  apyPercent: number | undefined;
  apyPercentFormatted: string | undefined;
}

export interface UseMoneyVaultApyOptions {
  enabled?: boolean;
}

const useMoneyVaultApy = ({
  enabled = true,
}: UseMoneyVaultApyOptions = {}): UseMoneyVaultApyResult => {
  const { vaultApyFallback, vaultApyOverride } = useSelector(
    selectMoneyVaultApyRemoteConfig,
  );

  const vaultApyQuery = useQuery({
    queryKey: [MoneyAccountBalanceServiceQueryKeys.GET_VAULT_APY],
    enabled,
    refetchInterval: FIVE_MINUTES_MS,
  }) as UseQueryResult<NormalizedVaultApyResponse>;

  const serviceApy = vaultApyQuery.data?.apy;

  // During first load with no cache, do not show fallback to avoid flicker.
  // Show fallback on explicit APY query errors (service outage path) or when
  // a settled query still yields no APY value.
  const shouldUseFallback =
    !vaultApyQuery.isLoading &&
    (vaultApyQuery.isError || serviceApy === undefined);

  // Override always wins when set; otherwise use live service value; then use
  // fallback only when the APY query is settled/error and no live APY exists.
  const apyDecimal =
    vaultApyOverride !== undefined
      ? vaultApyOverride
      : (serviceApy ?? (shouldUseFallback ? vaultApyFallback : undefined));

  const apyPercent =
    apyDecimal !== undefined
      ? new BigNumber(apyDecimal)
          .multipliedBy(100)
          .dp(1, BigNumber.ROUND_HALF_UP)
          .toNumber()
      : undefined;

  const apyPercentFormatted =
    apyPercent !== undefined ? `${apyPercent}%` : undefined;

  return {
    vaultApyQuery,
    apyDecimal,
    apyPercent,
    apyPercentFormatted,
  };
};

export default useMoneyVaultApy;
