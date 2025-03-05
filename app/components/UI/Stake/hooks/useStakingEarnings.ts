import {
  renderFiat,
  renderFromWei,
  weiToFiatNumber,
} from '../../../../util/number';
import usePooledStakes from './usePooledStakes';
import useBalance from './useBalance';
import BigNumber from 'bignumber.js';
import useVaultApyAverages from './useVaultApyAverages';
import {
  formatPercent,
  CommonPercentageInputUnits,
  PercentageOutputFormat,
} from '../utils/value';

const useStakingEarnings = () => {
  const { vaultApyAverages, isLoadingVaultApyAverages } = useVaultApyAverages();

  const annualRewardRatePercent = formatPercent(vaultApyAverages.oneWeek, {
    inputFormat: CommonPercentageInputUnits.PERCENTAGE,
    outputFormat: PercentageOutputFormat.PERCENT_SIGN,
    fixed: 1,
  });

  const annualRewardRateDecimal = new BigNumber(vaultApyAverages.oneWeek)
    .dividedBy(100)
    .toNumber();

  const { currentCurrency, conversionRate } = useBalance();

  const { pooledStakesData, isLoadingPooledStakesData, hasStakedPositions } =
    usePooledStakes();

  const lifetimeRewards = pooledStakesData?.lifetimeRewards ?? '0';

  const lifetimeRewardsETH = `${renderFromWei(lifetimeRewards, 5)} ETH`;

  const lifetimeRewardsFiat = renderFiat(
    weiToFiatNumber(lifetimeRewards, conversionRate),
    currentCurrency,
    2,
  );

  const assets = pooledStakesData?.assets ?? 0;
  const estimatedAnnualEarnings = new BigNumber(assets)
    .multipliedBy(annualRewardRateDecimal)
    .toFixed(0);
  const estimatedAnnualEarningsETH = `${renderFromWei(
    estimatedAnnualEarnings.toString(),
    5,
  )} ETH`;

  const estimatedAnnualEarningsFiat = renderFiat(
    weiToFiatNumber(estimatedAnnualEarnings, conversionRate),
    currentCurrency,
    2,
  );

  const isLoadingEarningsData =
    isLoadingVaultApyAverages || isLoadingPooledStakesData;

  return {
    annualRewardRate: annualRewardRatePercent,
    lifetimeRewardsETH,
    lifetimeRewardsFiat,
    estimatedAnnualEarningsETH,
    estimatedAnnualEarningsFiat,
    isLoadingEarningsData,
    hasStakedPositions,
  };
};

export default useStakingEarnings;
