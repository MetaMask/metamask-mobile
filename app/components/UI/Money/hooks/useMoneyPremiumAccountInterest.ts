import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { UseQueryResult } from '@tanstack/react-query';
import type {
  InterestResponse,
  InterestWindow,
} from '@metamask/money-account-api-data-service';
import { useQuery } from '@metamask/react-data-query';
import BigNumber from 'bignumber.js';
import { selectMoneyAccountPremiumVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectMoneyAccountPlusSubscription } from '../../../../selectors/subscriptionController';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
import { moneyFormatUsd } from '../utils/moneyFormatFiat';
import { readVaultAddress } from '../utils/readVaultAddress';
import {
  clearReportedMoneyInterestError,
  reportMoneyInterestError,
} from '../utils/reportMoneyInterestError';
import useMoneyAccountInfo from './useMoneyAccountInfo';

const SINCE_INCEPTION_WINDOW: InterestWindow = 'since_inception';

/**
 * Same character Pro Hub uses when the APY rate is missing.
 */
const FAILED_INTEREST_PLACEHOLDER = '—';

interface UseMoneyPremiumAccountInterestResult {
  sinceInceptionQuery: UseQueryResult<InterestResponse>;
  /**
   * Formatted since-inception interest. `$0.00` when the amount is missing
   * and the query has not failed. `—` when the query failed and the amount
   * is missing.
   */
  sinceInceptionInterest: string;
}

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
 * Since-inception interest for the premium vault.
 *
 * Uses the primary Money account address. The vault address comes from the
 * Plus subscription's crypto payment method. The chain id comes from
 * `moneyAccountPremiumVaultConfig`.
 *
 * @returns The interest query and the formatted earnings.
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

    const interestOptions = useMemo(
      () =>
        vaultAddress && chainId !== undefined && Number.isSafeInteger(chainId)
          ? {
              vaultAddress,
              chainId,
            }
          : undefined,
      [chainId, vaultAddress],
    );

    const sinceInceptionQuery = useQuery({
      queryKey: [
        MoneyAccountApiDataServiceQueryKeys.FETCH_INTEREST,
        address as string,
        {
          ...interestOptions,
          window: SINCE_INCEPTION_WINDOW,
        },
      ],
      enabled: isEnabled,
    }) as UseQueryResult<InterestResponse>;

    const formattedZero = useMemo(() => moneyFormatUsd(new BigNumber(0)), []);

    useEffect(() => {
      if (!sinceInceptionQuery.isError) {
        clearReportedMoneyInterestError(SINCE_INCEPTION_WINDOW, 'premium');
        return;
      }

      reportMoneyInterestError(
        SINCE_INCEPTION_WINDOW,
        sinceInceptionQuery.error,
        'premium',
      );
    }, [sinceInceptionQuery.error, sinceInceptionQuery.isError]);

    const interestEarnedUsd = sinceInceptionQuery.data?.interest_earned_usd;
    const sinceInceptionInterest = useMemo(() => {
      if (sinceInceptionQuery.isError && interestEarnedUsd === undefined) {
        return FAILED_INTEREST_PLACEHOLDER;
      }

      return formatInterestEarned(interestEarnedUsd, formattedZero);
    }, [formattedZero, interestEarnedUsd, sinceInceptionQuery.isError]);

    return {
      sinceInceptionQuery,
      sinceInceptionInterest,
    };
  };

export default useMoneyPremiumAccountInterest;
