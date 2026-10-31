import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type { NormalizedVaultApyResponse } from '@metamask/money-account-balance-service';
import type { PositionResponse } from '@metamask/money-account-api-data-service';
import type { UseQueryResult } from '@tanstack/react-query';
import { selectHasMoneyAccountPremiumApyEntitlement } from '../../../../selectors/subscriptionController';
import { MoneyAccountBalanceServiceQueryKeys } from '../queryKeys';
import { selectMoneyVaultApyRemoteConfig } from '../selectors/featureFlags';
import { parseApy, toApyPercent } from '../utils/apy';
import useMoneyPremiumVaultRate from './useMoneyPremiumVaultRate';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export interface UseMoneyVaultApyResult {
  /**
   * Query that backs the displayed APY: the premium positions query when the
   * user is entitled, otherwise the base vault APY query.
   */
  vaultApyQuery:
    | UseQueryResult<NormalizedVaultApyResponse>
    | UseQueryResult<PositionResponse>;
  /** Effective APY decimal shown across Money surfaces. */
  apyDecimal: number | undefined;
  apyPercent: number | undefined;
  apyPercentFormatted: string | undefined;
  /** Base vault APY as a decimal (before entitlement override). */
  baseApyDecimal: number | undefined;
  /** Base vault APY as a one-decimal percentage. */
  baseApyPercent: number | undefined;
  /**
   * True while `GET_VAULT_APY` is in its first load and no base rate is
   * available yet. An override, a cached service value, or a settled fallback
   * clears this even if a refetch is in flight. Entitled users still need it:
   * `vaultApyQuery` switches to the premium rate and hides this query.
   */
  isBaseApyLoading: boolean;
}

export interface UseMoneyVaultApyOptions {
  enabled?: boolean;
}

/**
 * Resolves the APY the Money surfaces should show.
 *
 * Non-subscribers keep the base vault APY. Subscribers with the `premiumApy`
 * entitlement see the premium vault rate from `useMoneyPremiumVaultRate`.
 * While that rate is still loading the APY stays blank so the base rate does
 * not flash for a newly entitled user.
 *
 * @param options - Optional enable flag for the APY queries.
 * @returns Effective APY values and the query backing the displayed rate.
 */
const useMoneyVaultApy = ({
  enabled = true,
}: UseMoneyVaultApyOptions = {}): UseMoneyVaultApyResult => {
  const { vaultApyFallback, vaultApyOverride } = useSelector(
    selectMoneyVaultApyRemoteConfig,
  );
  const isEntitled = useSelector(selectHasMoneyAccountPremiumApyEntitlement);

  const baseVaultApyQuery = useQuery({
    queryKey: [MoneyAccountBalanceServiceQueryKeys.GET_VAULT_APY],
    enabled,
    refetchInterval: FIVE_MINUTES_MS,
  }) as UseQueryResult<NormalizedVaultApyResponse>;

  const serviceApy = baseVaultApyQuery.data?.apy;

  // During first load with no cache, do not show fallback to avoid flicker.
  // Show fallback on explicit APY query errors (service outage path) or when
  // a settled query still yields no APY value.
  const shouldUseFallback =
    !baseVaultApyQuery.isLoading &&
    (baseVaultApyQuery.isError || serviceApy === undefined);

  // Override always wins when set; otherwise use live service value; then use
  // fallback only when the APY query is settled/error and no live APY exists.
  const baseApyDecimal =
    vaultApyOverride !== undefined
      ? vaultApyOverride
      : (serviceApy ?? (shouldUseFallback ? vaultApyFallback : undefined));

  const { rate, vaultRateQuery } = useMoneyPremiumVaultRate({
    enabled: enabled && isEntitled,
  });
  // Entitled users never fall back to the base APY (including while the
  // premium rate is loading), so the base rate does not flash after subscribe.
  const apyDecimal = isEntitled ? parseApy(rate) : baseApyDecimal;
  const apyPercent = toApyPercent(apyDecimal);
  const apyPercentFormatted =
    apyPercent !== undefined ? `${apyPercent}%` : undefined;
  const baseApyPercent = toApyPercent(baseApyDecimal);
  const isBaseApyLoading =
    baseVaultApyQuery.isLoading && baseApyDecimal === undefined;

  return {
    vaultApyQuery: isEntitled ? vaultRateQuery : baseVaultApyQuery,
    apyDecimal,
    apyPercent,
    apyPercentFormatted,
    baseApyDecimal,
    baseApyPercent,
    isBaseApyLoading,
  };
};

export default useMoneyVaultApy;
