import BigNumber from 'bignumber.js';
import { strings } from '../../../../../locales/i18n';
import type { EarnRate } from '../types/earnAssets';

/**
 * Formats an Earn rate percentage to one decimal place using HALF_UP rounding.
 *
 * @param value - Rate percentage to format.
 * @returns Formatted percentage without unnecessary trailing zeros.
 */
export const formatEarnRatePercentage = (value: string | number): string =>
  new BigNumber(value).decimalPlaces(1, BigNumber.ROUND_HALF_UP).toString();

export const parseRatePercent = (
  value: string | number | null | undefined,
): number | undefined => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return undefined;
  }
  const parsed = Number(
    typeof value === 'string' ? value.trim().replace(/%$/, '') : value,
  );
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const createEarnRate = ({
  type,
  percentage,
  isLoading,
  isError,
}: {
  type: EarnRate['type'];
  percentage?: number;
  isLoading?: boolean;
  isError?: boolean;
}): EarnRate => {
  if (percentage !== undefined) {
    return { type, percentage, status: 'ready' };
  }
  if (isLoading) {
    return { type, status: 'loading' };
  }
  if (isError) {
    return { type, status: 'error' };
  }
  return { type, status: 'unavailable' };
};

export const getHighestReadyRateEntry = <T>(
  entries: readonly T[],
  getRate: (entry: T) => EarnRate,
): T | undefined =>
  entries.reduce<T | undefined>((highest, entry) => {
    const rate = getRate(entry);
    if (rate.status !== 'ready' || !Number.isFinite(rate.percentage)) {
      return highest;
    }

    const highestRate = highest && getRate(highest);
    return highestRate?.status === 'ready' &&
      highestRate.percentage >= rate.percentage
      ? highest
      : entry;
  }, undefined);

export const getEarnRateCopy = ({
  percentage,
  rateType,
}: {
  percentage: number;
  rateType: EarnRate['type'];
}): string =>
  strings(`earn_module.rate_${rateType === 'APR' ? 'apr' : 'apy'}`, {
    percentage: formatEarnRatePercentage(percentage),
  });
