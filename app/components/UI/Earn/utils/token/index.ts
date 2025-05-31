import BigNumber from 'bignumber.js';
import {
  addCurrencySymbol,
  fiatNumberToTokenMinimalUnit,
  renderFromTokenMinimalUnit,
} from '../../../../../util/number';
import { render } from 'react-dom';

export const getEstimatedAnnualRewards = (
  apr: string,
  amountFiatNumber: number,
  amountTokenMinimalUnit: string,
  currentCurrency: string,
  assetDecimals: number,
  assetTicker: string,
): {
  estimatedAnnualRewardsFormatted: string;
  estimatedAnnualRewardsFiatNumber: number;
  estimatedAnnualRewardsTokenMinimalUnit: string;
  estimatedAnnualRewardsTokenFormatted: string;
} => {
  let estimatedAnnualRewardsFormatted = '';
  let estimatedAnnualRewardsTokenFormatted = '';

  const rewardRateDecimal = new BigNumber(apr).dividedBy(100).toNumber();
  const estimatedAnnualRewardsDecimal = new BigNumber(amountFiatNumber)
    .multipliedBy(rewardRateDecimal)
    .toNumber();
  const estimatedAnnualRewardsTokenMinimalUnit = new BigNumber(
    amountTokenMinimalUnit,
  )
    .multipliedBy(rewardRateDecimal)
    .toFixed(0, BigNumber.ROUND_DOWN);
  if (
    !Number.isNaN(estimatedAnnualRewardsDecimal) &&
    estimatedAnnualRewardsTokenMinimalUnit !== '0'
  ) {
    // Show cents ($0.50) for small amounts. Otherwise round up to nearest dollar ($2).
    const numDecimalPlacesToShow = estimatedAnnualRewardsDecimal > 1 ? 0 : 2;

    estimatedAnnualRewardsFormatted = `${addCurrencySymbol(
      new BigNumber(estimatedAnnualRewardsDecimal).toFixed(
        numDecimalPlacesToShow,
        BigNumber.ROUND_UP,
      ),
      currentCurrency,
    )}`;
    estimatedAnnualRewardsTokenFormatted =
      renderFromTokenMinimalUnit(
        estimatedAnnualRewardsTokenMinimalUnit,
        assetDecimals,
      ) +
      ' ' +
      assetTicker;
  }

  return {
    estimatedAnnualRewardsFormatted,
    estimatedAnnualRewardsFiatNumber: estimatedAnnualRewardsDecimal,
    estimatedAnnualRewardsTokenMinimalUnit,
    estimatedAnnualRewardsTokenFormatted,
  };
};
