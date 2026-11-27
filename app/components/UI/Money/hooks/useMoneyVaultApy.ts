import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type {
  PositionResponse,
  VaultsResponse,
} from '@metamask/money-account-api-data-service';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  selectMoneyAccountPremiumVaultConfig,
  selectMoneyAccountVaultConfig,
} from '../../../../selectors/featureFlagController/moneyAccount';
import { selectHasMoneyAccountPremiumApyEntitlement } from '../../../../selectors/subscriptionController';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
import { selectMoneyVaultApyRemoteConfig } from '../selectors/featureFlags';
import { parseApy, toApyPercent } from '../utils/apy';
import { findVault } from '../utils/moneyVaultState';
import useMoneyPremiumVaultRate from './useMoneyPremiumVaultRate';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export interface UseMoneyVaultApyResult {
  /**
   * Query that backs the displayed APY: the premium positions query when the
   * user is entitled, otherwise the base vault APY query.
   */
  vaultApyQuery:
    | UseQueryResult<VaultsResponse>
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
   * True while `FETCH_VAULTS` is in its first load and no base rate is
   * available yet. An override, a cached service value, or a settled fallback
   * clears this even if a refetch is in flight. Entitled users still need it:
   * `vaultApyQuery` switches to the premium rate and hides this query.
   */
  isBaseApyLoading: boolean;
}

export interface UseMoneyVaultApyOptions {
  enabled?: boolean;
  /**
   * Premium positions poll interval. Omit to keep the five-minute default.
   * Money home passes false because its positions query already polls that key.
   */
  positionsRefetchInterval?: number | false;
}

/**
 * Resolves the APY the Money surfaces should show.
 *
 * Non-subscribers keep the base vault APY. Subscribers with the `premiumApy`
 * entitlement see the premium vault rate from `useMoneyPremiumVaultRate`.
 * `premiumVaultApyOverride` wins when set. A rate of zero or less (the backend
 * sends "0.0000" when it has no data) counts as missing. The APY then uses
 * `premiumVaultApyFallback`, but only after the positions query settles with
 * an error or no usable rate. While it is still loading the APY stays blank
 * so neither the base rate nor the fallback flashes. Entitled users never see
 * the base APY or `vaultApyFallback`.
 *
 * @param options - Optional enable flag and premium positions poll interval.
 * @returns Effective APY values and the query backing the displayed rate.
 */
const useMoneyVaultApy = ({
  enabled = true,
  positionsRefetchInterval,
}: UseMoneyVaultApyOptions = {}): UseMoneyVaultApyResult => {
  const {
    vaultApyFallback,
    vaultApyOverride,
    premiumVaultApyFallback,
    premiumVaultApyOverride,
  } = useSelector(selectMoneyVaultApyRemoteConfig);
  const isEntitled = useSelector(selectHasMoneyAccountPremiumApyEntitlement);
  const premiumVaultConfig = useSelector(selectMoneyAccountPremiumVaultConfig);
  const baseVaultConfig = useSelector(selectMoneyAccountVaultConfig);

  const baseVaultApyQuery = useQuery({
    queryKey: [MoneyAccountApiDataServiceQueryKeys.FETCH_VAULTS],
    enabled,
    refetchInterval: FIVE_MINUTES_MS,
  }) as UseQueryResult<VaultsResponse>;

  const baseVault = findVault(
    baseVaultApyQuery.data?.vaults,
    baseVaultConfig?.boringVault,
    'standard',
  );
  const serviceApy = parseApy(baseVault?.current_apy);

  // During first load with no cache, do not show fallback to avoid flicker.
  // Show fallback on explicit APY query errors (service outage path) or when
  // a settled query still yields no APY value.
  const shouldUseFallback =
    !baseVaultApyQuery.isLoading &&
    (baseVaultApyQuery.isError || serviceApy === undefined);

  // Override always wins when set; otherwise use live service value; then use
  // fallback only when the APY query is settled/error and no live APY exists.
  const baseApyDecimal =
    vaultApyOverride ??
    serviceApy ??
    (shouldUseFallback ? vaultApyFallback : undefined);

  const { rate, vaultRateQuery } = useMoneyPremiumVaultRate({
    enabled: enabled && isEntitled,
    vaultAddress: premiumVaultConfig?.boringVault,
    ...(positionsRefetchInterval !== undefined && {
      refetchInterval: positionsRefetchInterval,
    }),
  });
  // The backend sends "0.0000" when it has no data for the premium vault, so
  // a non-positive live rate counts as missing.
  const premiumServiceRate = parseApy(rate);
  const livePremiumApy =
    premiumServiceRate !== undefined && premiumServiceRate > 0
      ? premiumServiceRate
      : undefined;
  const shouldUsePremiumFallback =
    !vaultRateQuery.isLoading &&
    (vaultRateQuery.isError || livePremiumApy === undefined);
  // Entitled users never fall back to the base APY (including while the
  // premium rate is loading), so the base rate does not flash after subscribe.
  const premiumApyDecimal =
    premiumVaultApyOverride ??
    livePremiumApy ??
    (shouldUsePremiumFallback ? premiumVaultApyFallback : undefined);
  const apyDecimal = isEntitled ? premiumApyDecimal : baseApyDecimal;
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
