import { LendingPositionHistory } from '@metamask/stake-sdk';
import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { RootState } from '../../../../reducers';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { earnSelectors } from '../../../../selectors/earnController';
import { TokenI } from '../../Tokens/types';

const { selectEarnTokenPair } = earnSelectors;

const useEarnLendingPositions = (asset: TokenI) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasEarnLendingPositions, setHasEarnLendingPositions] = useState(false);
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const { outputToken } = useSelector((state: RootState) =>
    selectEarnTokenPair(state, asset),
  );
  const [lifetimeRewards, setLifetimeRewards] = useState<string>('0');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const getLendingPositionHistory = async (params: {
      positionId: string;
      marketId: string;
      marketAddress: string;
      protocol: string;
    }) => {
      const { lifetimeRewards: lifetimeRewardsFromController, assets } =
        (await Engine.context.EarnController.getLendingPositionHistory({
          days: 1,
          address: selectedAccount?.address,
          ...params,
        })) as unknown as LendingPositionHistory;
      const lifetimeRewardsForToken = lifetimeRewardsFromController.find(
        (reward) =>
          new BigNumber(reward.assets).gt(0) &&
          reward.token.address ===
            outputToken?.experience?.market?.underlying?.address,
      );
      const hasPositions =
        new BigNumber(assets).gt(0) ||
        Boolean(lifetimeRewardsForToken) ||
        false;
      setLifetimeRewards(lifetimeRewardsForToken?.assets ?? '0');
      setHasEarnLendingPositions(hasPositions);
    };
    if (
      outputToken &&
      outputToken.experience?.market?.protocol &&
      outputToken.experience?.market?.position?.id &&
      outputToken.experience?.market?.id &&
      outputToken.experience?.market?.address
    ) {
      getLendingPositionHistory({
        positionId: outputToken.experience?.market?.position?.id,
        marketId: outputToken.experience?.market?.id,
        marketAddress: outputToken.experience?.market?.address,
        protocol: outputToken?.experience?.market?.protocol,
      }).catch((err) => {
        console.error('Failed to fetch lending position history', err);
        setError('Failed to fetch lending position history');
        setHasEarnLendingPositions(false);
        setIsLoading(false);
      });
    } else {
      setHasEarnLendingPositions(false);
      setIsLoading(false);
    }
  }, [outputToken, selectedAccount]);

  useEffect(() => {
    if (
      outputToken &&
      outputToken.experience?.market?.protocol &&
      outputToken.experience?.market?.position?.id &&
      outputToken.experience?.market?.id &&
      outputToken.experience?.market?.address &&
      selectedAccount?.address
    ) {
      fetchData();
    }
  }, [outputToken, selectedAccount, fetchData]);

  return {
    earnLendingPositions: outputToken?.experience?.market?.position,
    exchangeRate: outputToken?.tokenUsdExchangeRate,
    isLoadingEarnLendingPositions: isLoading,
    error,
    hasEarnLendingPositions,
    refreshEarnLendingPositions: fetchData,
    lifetimeRewards,
  };
};

export default useEarnLendingPositions;
