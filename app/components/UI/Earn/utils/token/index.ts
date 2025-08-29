import BigNumber from 'bignumber.js';
import {
  addCurrencySymbol,
  renderFromTokenMinimalUnit,
} from '../../../../../util/number/legacy';
import { EarnTokenDetails } from '../../types/lending.types';
import { TOKENS_REQUIRING_ALLOWANCE_RESET } from '../../constants/token';

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

  const aprToUse = isNaN(Number(apr)) ? '0' : apr;
  const rewardRateDecimal = new BigNumber(aprToUse).dividedBy(100).toNumber();

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

export const sortByHighestRewards = (tokensToSort: EarnTokenDetails[]) =>
  [...tokensToSort].sort(
    (a, b) =>
      b.experience.estimatedAnnualRewardsFiatNumber -
      a.experience.estimatedAnnualRewardsFiatNumber,
  );

export const sortByHighestApr = (tokensToSort: EarnTokenDetails[]) =>
  [...tokensToSort].sort(
    (a, b) => parseFloat(b.experience.apr) - parseFloat(a.experience.apr),
  );

export const sortByHighestBalance = (tokensToSort: EarnTokenDetails[]) =>
  [...tokensToSort].sort((a, b) =>
    b.balanceFiatNumber > a.balanceFiatNumber ? 1 : -1,
  );

export const doesTokenRequireAllowanceReset = (
  chainId: string,
  symbol: string,
) => {
  if (!chainId || !symbol) return false;
  return Boolean(TOKENS_REQUIRING_ALLOWANCE_RESET[chainId]?.includes(symbol));
};
