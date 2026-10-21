import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type { NormalizedVaultApyResponse } from '@metamask/money-account-balance-service';
import type { VaultRateResponse } from '@metamask/money-account-api-data-service';
import type { UseQueryResult } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { selectHasMoneyAccountPremiumApyEntitlement } from '../../../../selectors/subscriptionController';
import { MoneyAccountBalanceServiceQueryKeys } from '../queryKeys';
import { selectMoneyVaultApyRemoteConfig } from '../selectors/featureFlags';
import useMoneyPremiumVaultRate from './useMoneyPremiumVaultRate';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export interface UseMoneyVaultApyResult {
  /**
   * Query that backs the displayed APY: the premium vault-rate query when the
   * user is entitled, otherwise the base vault APY query.
   */
  vaultApyQuery:
    | UseQueryResult<NormalizedVaultApyResponse>
    | UseQueryResult<VaultRateResponse>;
  /** Effective APY decimal shown across Money surfaces. */
  apyDecimal: number | undefined;
  apyPercent: number | undefined;
  apyPercentFormatted: string | undefined;
  /** Base vault APY as a one-decimal percentage. */
  baseApyPercent: number | undefined;
}

export interface UseMoneyVaultApyOptions {
  enabled?: boolean;
}

const toApyPercent = (apyDecimal: number | undefined): number | undefined =>
  apyDecimal !== undefined
    ? new BigNumber(apyDecimal)
        .multipliedBy(100)
        .dp(1, BigNumber.ROUND_HALF_UP)
        .toNumber()
    : undefined;

/**
 * Parses a decimal APY/rate string into a number.
 *
 * @param value - Decimal rate string from the Money API.
 * @returns The parsed number, or undefined when missing or not finite.
 */
const parseApy = (value: string | null | undefined): number | undefined => {
  if (value == null) {
    return undefined;
  }
  const parsed = new BigNumber(value);
  if (parsed.isNaN() || !parsed.isFinite()) {
    return undefined;
  }
  return parsed.toNumber();
};

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

  return {
    vaultApyQuery: isEntitled ? vaultRateQuery : baseVaultApyQuery,
    apyDecimal,
    apyPercent,
    apyPercentFormatted,
    baseApyPercent,
  };
};

export default useMoneyVaultApy;
