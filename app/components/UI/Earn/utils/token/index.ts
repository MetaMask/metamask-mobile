import BigNumber from 'bignumber.js';
import { addCurrencySymbol } from '../../../../../util/number';

export const getEstimatedAnnualRewardsFormatted = (
  apr: string,
  amountFiatNumber: number,
  currency: string,
): string => {
  let estimatedAnnualRewardsFormatted = '';

  const rewardRateDecimal = new BigNumber(apr).dividedBy(100).toNumber();
  const estimatedAnnualRewardsDecimal = new BigNumber(amountFiatNumber)
    .multipliedBy(rewardRateDecimal)
    .toNumber();
  if (
    !Number.isNaN(estimatedAnnualRewardsDecimal) &&
    estimatedAnnualRewardsDecimal > 0
  ) {
    // Show cents ($0.50) for small amounts. Otherwise round up to nearest dollar ($2).
    const numDecimalPlacesToShow = estimatedAnnualRewardsDecimal > 1 ? 0 : 2;

    estimatedAnnualRewardsFormatted = `${addCurrencySymbol(
      new BigNumber(estimatedAnnualRewardsDecimal).toFixed(
        numDecimalPlacesToShow,
        BigNumber.ROUND_UP,
      ),
      currency,
    )}`;
  }

  return estimatedAnnualRewardsFormatted;
};
