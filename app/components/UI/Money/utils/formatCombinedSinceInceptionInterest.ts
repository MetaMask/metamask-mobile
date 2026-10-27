import BigNumber from 'bignumber.js';
import { moneyFormatUsd } from './moneyFormatFiat';

/**
 * Same character Pro Hub uses when an earnings amount is unknown.
 */
const FAILED_INTEREST_PLACEHOLDER = '—';

/**
 * One vault's since-inception interest, before formatting.
 */
export interface SinceInceptionInterestSource {
  /**
   * Raw `interest_earned_usd` from the Money API, when the query has data.
   */
  usd: string | undefined;
  /**
   * True when the query failed.
   */
  failed: boolean;
}

/**
 * Reads a finite USD amount. A missing or non-finite amount counts as zero
 * unless that query failed, in which case the amount is unknown.
 *
 * @param source - One vault's since-inception interest.
 * @returns The finite amount, zero, or undefined when a failure left no amount.
 */
const readInterestUsd = (
  source: SinceInceptionInterestSource,
): BigNumber | undefined => {
  if (source.usd !== undefined) {
    const earnings = new BigNumber(source.usd);
    if (!earnings.isNaN() && earnings.isFinite()) {
      return earnings;
    }
  }

  if (source.failed) {
    return undefined;
  }

  return new BigNumber(0);
};

/**
 * Formats Pro Hub's lifetime earnings from premium-vault and base-vault
 * since-inception interest.
 *
 * Sums finite USD amounts, then formats once. A missing or non-finite amount
 * that did not fail counts as zero, including a disabled base-vault query. If
 * either side failed and has no finite amount, the total is unknown. A failed
 * query that still has a finite amount uses that amount. Positive totals get
 * a leading plus, matching other Money interest amounts.
 *
 * @param params - The two since-inception amounts.
 * @param params.premium - Premium-vault since-inception interest.
 * @param params.base - Base-vault since-inception interest.
 * @returns The formatted total, or an em dash when the total is unknown.
 */
export const formatCombinedSinceInceptionInterest = ({
  premium,
  base,
}: {
  premium: SinceInceptionInterestSource;
  base: SinceInceptionInterestSource;
}): string => {
  const premiumAmount = readInterestUsd(premium);
  const baseAmount = readInterestUsd(base);
  if (premiumAmount === undefined || baseAmount === undefined) {
    return FAILED_INTEREST_PLACEHOLDER;
  }

  const total = premiumAmount.plus(baseAmount);
  const formattedZero = moneyFormatUsd(new BigNumber(0));
  const formatted = moneyFormatUsd(total);
  return total.isGreaterThan(0) && formatted !== formattedZero
    ? `+${formatted}`
    : formatted;
};
