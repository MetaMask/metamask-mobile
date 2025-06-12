import {
  renderFiat,
  renderFromWei,
  weiToFiatNumber,
} from '../../../../util/number';
import usePooledStakes from './usePooledStakes';
import useBalance from './useBalance';
import BigNumber from 'bignumber.js';
import useVaultMetadata from './useVaultMetadata';
import { TokenI } from '../../Tokens/types';
import { getDecimalChainId } from '../../../../util/networks';

const useStakingEarnings = ({ asset }: { asset: TokenI }) => {
  const assetChainId = getDecimalChainId(asset.chainId);

  const { annualRewardRate, annualRewardRateDecimal, isLoadingVaultMetadata } =
    useVaultMetadata(assetChainId);

  const { currentCurrency, conversionRate } = useBalance(assetChainId);

  const { pooledStakesData, isLoadingPooledStakesData, hasStakedPositions } =
    usePooledStakes(assetChainId);

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
    isLoadingVaultMetadata || isLoadingPooledStakesData;

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
