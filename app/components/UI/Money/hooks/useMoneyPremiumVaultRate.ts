import { useSelector } from 'react-redux';
import type { UseQueryResult } from '@tanstack/react-query';
import type { PositionResponse } from '@metamask/money-account-api-data-service';
import { useQuery } from '@metamask/react-data-query';
import BigNumber from 'bignumber.js';
import { selectMoneyAccountPlusSubscription } from '../../../../selectors/subscriptionController';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
import { readVaultAddress } from '../utils/readVaultAddress';
import useMoneyAccountInfo from './useMoneyAccountInfo';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

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
 * Converts a decimal APY into a one-decimal percentage.
 *
 * @param rate - Decimal `current_apy` from the positions response.
 * @returns The percentage, or undefined when the rate is not a finite number.
 */
const parseRatePercent = (rate: string | undefined): number | undefined => {
  if (rate === undefined) {
    return undefined;
  }

  const rateDecimal = new BigNumber(rate);
  if (rateDecimal.isNaN() || !rateDecimal.isFinite()) {
    return undefined;
  }

  return rateDecimal
    .multipliedBy(100)
    .dp(1, BigNumber.ROUND_HALF_UP)
    .toNumber();
};

/**
 * Current APY for the premium vault, shown on Pro Hub.
 *
 * Reads `current_apy` from the premium position. The vault address comes from
 * the Plus subscription's crypto payment method. The account address comes
 * from the primary Money account.
 *
 * @returns The positions query, the raw APY decimal, and the APY as a percentage.
 */
const useMoneyPremiumVaultRate = (): UseMoneyPremiumVaultRateResult => {
  const { primaryMoneyAccount } = useMoneyAccountInfo();
  const plusSubscription = useSelector(selectMoneyAccountPlusSubscription);
  const address = primaryMoneyAccount?.address?.toLowerCase();
  const vaultAddress = readVaultAddress(plusSubscription?.paymentMethod);
  const isEnabled = Boolean(address && vaultAddress);

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
  const ratePercent = parseRatePercent(rate);
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
