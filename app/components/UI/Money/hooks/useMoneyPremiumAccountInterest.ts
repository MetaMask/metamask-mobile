import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { UseQueryResult } from '@tanstack/react-query';
import type {
  InterestOptions,
  InterestResponse,
  InterestWindow,
  PositionResponse,
} from '@metamask/money-account-api-data-service';
import { useQuery } from '@metamask/react-data-query';
import BigNumber from 'bignumber.js';
import { selectMoneyAccountPremiumVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectMoneyAccountPlusSubscription } from '../../../../selectors/subscriptionController';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
import { moneyFormatUsd } from '../utils/moneyFormatFiat';
import useMoneyAccountInfo from './useMoneyAccountInfo';

const SINCE_INCEPTION_WINDOW: InterestWindow = 'since_inception';

interface CryptoSubscriptionPayment {
  type?: string;
  crypto?: {
    tokenAddress?: unknown;
  };
}

interface UseMoneyPremiumAccountInterestResult {
  sinceInceptionQuery: UseQueryResult<InterestResponse>;
  positionsQuery: UseQueryResult<PositionResponse>;
  /** Formatted since-inception interest, or `$0.00` when it is not available. */
  sinceInceptionInterest: string;
  /** APY as a percentage (for example `7.1` for 7.1%), when the position has one. */
  apyPercent: number | undefined;
}

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
 * Formats interest the same way Money Home does: a leading plus on amounts
 * above zero, and `$0.00` when the value is missing or not a finite number.
 *
 * @param value - USD interest from the Money API.
 * @param formattedZero - The formatted zero amount.
 * @returns The display string.
 */
const formatInterestEarned = (
  value: string | undefined,
  formattedZero: string,
): string => {
  if (value === undefined) {
    return formattedZero;
  }

  const earnings = new BigNumber(value);
  if (earnings.isNaN() || !earnings.isFinite()) {
    return formattedZero;
  }

  const formatted = moneyFormatUsd(earnings);
  return earnings.isGreaterThan(0) && formatted !== formattedZero
    ? `+${formatted}`
    : formatted;
};

/**
 * Converts a decimal APY string (`0.071`) into a one-decimal percentage (`7.1`).
 *
 * @param currentApy - Decimal APY from the vault position.
 * @returns The percentage, or undefined when the value is not a finite number.
 */
const parseApyPercent = (
  currentApy: string | undefined,
): number | undefined => {
  if (currentApy === undefined) {
    return undefined;
  }

  const apyDecimal = new BigNumber(currentApy);
  if (!apyDecimal.isFinite() || apyDecimal.isNaN()) {
    return undefined;
  }

  return apyDecimal.multipliedBy(100).dp(1, BigNumber.ROUND_HALF_UP).toNumber();
};

/**
 * Since-inception interest and current APY for the premium vault.
 *
 * Uses the primary Money account address. The vault address comes from the
 * Plus subscription's crypto payment method. The chain id comes from
 * `moneyAccountPremiumVaultConfig`.
 *
 * @returns The interest query, the positions query, and display values.
 */
const useMoneyPremiumAccountInterest =
  (): UseMoneyPremiumAccountInterestResult => {
    const { primaryMoneyAccount } = useMoneyAccountInfo();
    const plusSubscription = useSelector(selectMoneyAccountPlusSubscription);
    const premiumVaultConfig = useSelector(
      selectMoneyAccountPremiumVaultConfig,
    );
    const address = primaryMoneyAccount?.address;
    const vaultAddress = readVaultAddress(plusSubscription?.paymentMethod);
    const chainId = premiumVaultConfig
      ? Number(premiumVaultConfig.chainId)
      : undefined;
    const isEnabled = Boolean(
      address &&
        vaultAddress &&
        chainId !== undefined &&
        Number.isSafeInteger(chainId),
    );

    const interestOptions = useMemo<InterestOptions | undefined>(
      () =>
        vaultAddress && chainId !== undefined && Number.isSafeInteger(chainId)
          ? {
              vaultAddress,
              chainId,
              window: SINCE_INCEPTION_WINDOW,
            }
          : undefined,
      [chainId, vaultAddress],
    );

    const sinceInceptionQuery = useQuery({
      queryKey: [
        MoneyAccountApiDataServiceQueryKeys.FETCH_INTEREST,
        address as string,
        interestOptions,
      ],
      enabled: isEnabled,
    }) as UseQueryResult<InterestResponse>;

    const positionsQuery = useQuery({
      queryKey: [
        MoneyAccountApiDataServiceQueryKeys.FETCH_POSITIONS,
        address as string,
      ],
      enabled: isEnabled,
    }) as UseQueryResult<PositionResponse>;

    const formattedZero = useMemo(() => moneyFormatUsd(new BigNumber(0)), []);

    const sinceInceptionInterest = useMemo(
      () =>
        formatInterestEarned(
          sinceInceptionQuery.data?.interest_earned_usd,
          formattedZero,
        ),
      [formattedZero, sinceInceptionQuery.data?.interest_earned_usd],
    );

    const apyPercent = useMemo(() => {
      if (!vaultAddress) {
        return undefined;
      }

      const vaultKey = vaultAddress.toLowerCase();
      const currentApy = positionsQuery.data?.positions.find(
        (position) => position.vault_address.toLowerCase() === vaultKey,
      )?.current_apy;

      return parseApyPercent(currentApy);
    }, [positionsQuery.data?.positions, vaultAddress]);

    return {
      sinceInceptionQuery,
      positionsQuery,
      sinceInceptionInterest,
      apyPercent,
    };
  };

export default useMoneyPremiumAccountInterest;
