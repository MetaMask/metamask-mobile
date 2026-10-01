import { useSelector } from 'react-redux';
import type { UseQueryResult } from '@tanstack/react-query';
import type { VaultRateResponse } from '@metamask/money-account-api-data-service';
import { useQuery } from '@metamask/react-data-query';
import BigNumber from 'bignumber.js';
import { selectMoneyAccountPremiumVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectMoneyAccountPlusSubscription } from '../../../../selectors/subscriptionController';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

interface CryptoSubscriptionPayment {
  type?: string;
  crypto?: {
    tokenAddress?: unknown;
  };
}

interface UseMoneyPremiumVaultRateResult {
  vaultRateQuery: UseQueryResult<VaultRateResponse>;
  /** Raw vault rate string from the Money API, when the query has one. */
  rate: string | undefined;
  /** Rate as a one-decimal percentage (for example `7.1` for `0.071`). */
  ratePercent: number | undefined;
  /** `ratePercent` with a percent sign (for example `7.1%`). */
  ratePercentFormatted: string | undefined;
}

/**
 * Converts the decimal rate string into a one-decimal percentage.
 *
 * @param rate - Decimal rate from the Money API.
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
 * Reads the Plus subscription's vault-share token.
 *
 * @param paymentMethod - The subscription payment method.
 * @returns The vault address when the payment is crypto.
 */
const readVaultAddress = (
  paymentMethod: CryptoSubscriptionPayment | undefined,
): string | undefined => {
  if (paymentMethod?.type !== 'crypto') {
    return undefined;
  }

  const tokenAddress = paymentMethod.crypto?.tokenAddress;
  return typeof tokenAddress === 'string' && tokenAddress.length > 0
    ? tokenAddress
    : undefined;
};

/**
 * Current rate for the premium vault, shown as the Pro Hub APY.
 *
 * The vault address comes from the Plus subscription's crypto payment method.
 * The chain id comes from `moneyAccountPremiumVaultConfig`.
 *
 * @returns The vault-rate query, the raw rate, and the rate as a percentage.
 */
const useMoneyPremiumVaultRate = (): UseMoneyPremiumVaultRateResult => {
  const plusSubscription = useSelector(selectMoneyAccountPlusSubscription);
  const premiumVaultConfig = useSelector(selectMoneyAccountPremiumVaultConfig);
  const vaultAddress = readVaultAddress(plusSubscription?.paymentMethod);
  const chainId = premiumVaultConfig
    ? Number(premiumVaultConfig.chainId)
    : undefined;
  const isEnabled = Boolean(
    vaultAddress && chainId !== undefined && Number.isSafeInteger(chainId),
  );

  const vaultRateQuery = useQuery({
    queryKey: [
      MoneyAccountApiDataServiceQueryKeys.FETCH_VAULT_RATE,
      vaultAddress as string,
      { chainId },
    ],
    enabled: isEnabled,
    refetchInterval: FIVE_MINUTES_MS,
  }) as UseQueryResult<VaultRateResponse>;

  const rate = vaultRateQuery.data?.rate;
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
