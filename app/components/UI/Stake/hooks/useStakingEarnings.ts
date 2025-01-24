import {
  renderFiat,
  renderFromWei,
  weiToFiatNumber,
} from '../../../../util/number';
import usePooledStakes from './usePooledStakes';
import useVaultData from './useVaultData';
import useBalance from './useBalance';
import BigNumber from 'bignumber.js';

const useStakingEarnings = () => {
  const { annualRewardRate, annualRewardRateDecimal, isLoadingVaultData } =
    useVaultData();

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

  const isLoadingEarningsData = isLoadingVaultData || isLoadingPooledStakesData;

  return {
    annualRewardRate,
    lifetimeRewardsETH,
    lifetimeRewardsFiat,
    estimatedAnnualEarningsETH,
    estimatedAnnualEarningsFiat,
    isLoadingEarningsData,
    hasStakedPositions,
  };
};

export default useStakingEarnings;
