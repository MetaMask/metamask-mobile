import BigNumber from 'bignumber.js';
import { useSelector } from 'react-redux';
import { Hex } from 'viem';
import { RootState } from '../../../../reducers';
import { earnSelectors } from '../../../../selectors/earnController/earn';
import { selectSingleTokenPriceMarketData } from '../../../../selectors/tokenRatesController';
import { getDecimalChainId } from '../../../../util/networks';
import {
  balanceToFiatNumber,
  renderFiat,
  renderFromTokenMinimalUnit,
  renderFromWei,
  weiToFiatNumber,
} from '../../../../util/number/legacy';
import useBalance from '../../Stake/hooks/useBalance';
import usePooledStakes from '../../Stake/hooks/usePooledStakes';
import { TokenI } from '../../Tokens/types';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EarnTokenDetails } from '../types/lending.types';
import useEarnLendingPositions from './useEarnLendingPosition';
import { useEarnMetadata } from './useEarnMetadata';

const { selectEarnTokenPair } = earnSelectors;

const useEarnings = ({ asset }: { asset: TokenI }) => {
  const assetChainId = getDecimalChainId(asset.chainId);

  const { outputToken } = useSelector((state: RootState) =>
    selectEarnTokenPair(state, asset),
  );

  const { annualRewardRate, annualRewardRateDecimal, isLoadingEarnMetadata } =
    useEarnMetadata(outputToken as EarnTokenDetails);

  const { currentCurrency, conversionRate } = useBalance(assetChainId);

  const { pooledStakesData, isLoadingPooledStakesData, hasStakedPositions } =
    usePooledStakes(assetChainId);
  const lifetimeRewardsPooledStakes = pooledStakesData?.lifetimeRewards ?? '0';

  const { hasEarnLendingPositions, lifetimeRewards: lifetimeRewardsLending } =
    useEarnLendingPositions(asset);
  const tokenExchangeRate = useSelector((state: RootState) =>
    selectSingleTokenPriceMarketData(
      state,
      outputToken?.chainId as Hex,
      outputToken?.address as Hex,
    ),
  );

  let lifetimeRewards = '';
  let lifetimeRewardsFiat = '';

  let estimatedAnnualEarnings = '';
  let estimatedAnnualEarningsFiat = '';

  if (
    outputToken &&
    outputToken.experience.type === EARN_EXPERIENCES.STABLECOIN_LENDING
  ) {
    lifetimeRewards = `${renderFromTokenMinimalUnit(
      lifetimeRewardsLending,
      outputToken.decimals,
      5,
    )} ${outputToken.ticker || outputToken.symbol}`;
    lifetimeRewardsFiat = renderFiat(
      balanceToFiatNumber(
        renderFromTokenMinimalUnit(
          lifetimeRewardsLending,
          outputToken.decimals,
          5,
        ),
        conversionRate,
        tokenExchangeRate?.[outputToken.address]?.price ?? 0,
      ),
      currentCurrency,
      2,
    );
    const estimatedEarningsCalc = new BigNumber(
      outputToken.balanceMinimalUnit ?? 0,
    )
      .multipliedBy(annualRewardRateDecimal)
      .toFixed(0);
    estimatedAnnualEarnings = `${renderFromTokenMinimalUnit(
      estimatedEarningsCalc,
      outputToken.decimals,
      5,
    )} ${outputToken.ticker || outputToken.symbol}`;
    estimatedAnnualEarningsFiat = renderFiat(
      balanceToFiatNumber(
        renderFromTokenMinimalUnit(
          estimatedEarningsCalc,
          outputToken.decimals,
          5,
        ),
        conversionRate,
        tokenExchangeRate?.[outputToken.address]?.price ?? 0,
      ),
      currentCurrency,
      2,
    );
  } else if (
    outputToken &&
    outputToken.experience.type === EARN_EXPERIENCES.POOLED_STAKING
  ) {
    lifetimeRewards = `${renderFromWei(lifetimeRewardsPooledStakes, 5)} ETH`;
    lifetimeRewardsFiat = renderFiat(
      weiToFiatNumber(lifetimeRewardsPooledStakes, conversionRate),
      currentCurrency,
      2,
    );
    const assets = pooledStakesData?.assets ?? 0;
    const estimatedEarningsCalc = new BigNumber(assets)
      .multipliedBy(annualRewardRateDecimal)
      .toFixed(0);
    estimatedAnnualEarnings = `${renderFromWei(estimatedEarningsCalc, 5)} ETH`;
    estimatedAnnualEarningsFiat = renderFiat(
      weiToFiatNumber(estimatedEarningsCalc, conversionRate),
      currentCurrency,
      2,
    );
  }

  const isLoadingEarningsData =
    isLoadingPooledStakesData || isLoadingEarnMetadata;

  return {
    annualRewardRate,
    lifetimeRewards,
    lifetimeRewardsFiat,
    estimatedAnnualEarnings,
    estimatedAnnualEarningsFiat,
    isLoadingEarningsData,
    hasEarnPooledStakes: hasStakedPositions,
    hasEarnLendingPositions,
    hasEarnings: hasStakedPositions || hasEarnLendingPositions,
  };
};

export default useEarnings;
