import { useSelector } from 'react-redux';
import type { UseQueryResult } from '@tanstack/react-query';
import type { PositionResponse } from '@metamask/money-account-api-data-service';
import { useQuery } from '@metamask/react-data-query';
import { selectMoneyAccountPlusSubscription } from '../../../../selectors/subscriptionController';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
import { parseApy, toApyPercent } from '../utils/apy';
import { readVaultAddress } from '../utils/readVaultAddress';
import useMoneyAccountInfo from './useMoneyAccountInfo';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export interface UseMoneyPremiumVaultRateOptions {
  /**
   * When false, the positions query does not run. Defaults to true.
   */
  enabled?: boolean;
  /**
   * Vault used when the Plus payment method has no crypto token address.
   * Cancelled plans and card payments have none, but the user can still hold
   * premium funds. Money home passes the premium config `boringVault`.
   */
  vaultAddress?: string;
}

interface UseMoneyPremiumVaultRateResult {
  /** Positions query that carries `current_apy` per vault. */
  vaultRateQuery: UseQueryResult<PositionResponse>;
  /** Raw `current_apy` decimal for the premium vault, when the position has one. */
  rate: string | undefined;
  /** `current_apy` as a one-decimal percentage (for example `7.1` for `0.071`). */
  ratePercent: number | undefined;
  /** `ratePercent` with a percent sign (for example `7.1%`). */
  ratePercentFormatted: string | undefined;
}

/**
 * Current APY for the premium vault, shown on Pro Hub.
 *
 * Reads `current_apy` from the premium position. The vault address comes from
 * the Plus subscription's crypto payment method, then from `options.vaultAddress`
 * when that payment method has no token. The account address comes from the
 * primary Money account.
 *
 * @param options - Optional enable flag and fallback vault. `enabled` defaults
 * to true. When false the positions query does not run, even if an account and
 * vault address exist.
 * @returns The positions query, the raw APY decimal, and the APY as a percentage.
 */
const useMoneyPremiumVaultRate = ({
  enabled = true,
  vaultAddress: fallbackVaultAddress,
}: UseMoneyPremiumVaultRateOptions = {}): UseMoneyPremiumVaultRateResult => {
  const { primaryMoneyAccount } = useMoneyAccountInfo();
  const plusSubscription = useSelector(selectMoneyAccountPlusSubscription);
  const address = primaryMoneyAccount?.address?.toLowerCase();
  const vaultAddress =
    readVaultAddress(plusSubscription?.paymentMethod) ?? fallbackVaultAddress;
  const isEnabled = Boolean(enabled && address && vaultAddress);

  const vaultRateQuery = useQuery({
    queryKey: [
      MoneyAccountApiDataServiceQueryKeys.FETCH_POSITIONS,
      address as string,
    ],
    enabled: isEnabled,
    refetchInterval: FIVE_MINUTES_MS,
  }) as UseQueryResult<PositionResponse>;

  const normalizedVaultAddress = vaultAddress?.toLowerCase();
  const rate =
    normalizedVaultAddress === undefined
      ? undefined
      : vaultRateQuery.data?.positions.find(
          (position) =>
            position.vault_address.toLowerCase() === normalizedVaultAddress,
        )?.current_apy;
  const ratePercent = toApyPercent(parseApy(rate));
  const ratePercentFormatted =
    ratePercent !== undefined ? `${ratePercent}%` : undefined;

  return {
    vaultRateQuery,
    rate,
    ratePercent,
    ratePercentFormatted,
  };
};

export default useMoneyPremiumVaultRate;
