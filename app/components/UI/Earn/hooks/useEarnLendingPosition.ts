import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { earnSelectors } from '../../../../selectors/earnController';
import { TokenI } from '../../Tokens/types';
import { EVM_SCOPE } from '../constants/networks';

const { selectEarnTokenPair } = earnSelectors;

const useEarnLendingPositions = (asset: TokenI) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasEarnLendingPositions, setHasEarnLendingPositions] = useState(false);
  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );
  const { outputToken } = useSelector((state: RootState) =>
    selectEarnTokenPair(state, asset),
  );
  const [lifetimeRewards] = useState<string>('0');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (new BigNumber(outputToken?.balanceMinimalUnit ?? '0').gt(0)) {
      setHasEarnLendingPositions(true);
    } else {
      setHasEarnLendingPositions(false);
    }

    // TODO: https://consensyssoftware.atlassian.net/browse/TAT-1055
    // Uncomment this once performance on this request is improved
    // const getLendingPositionHistory = async (params: {
    //   positionId: string;
    //   marketId: string;
    //   marketAddress: string;
    //   protocol: string;
    // }) => {
    //   const lendingPositionHistory =
    //     (await Engine.context.EarnController.getLendingPositionHistory({
    //       days: 1,
    //       address: selectedAccount?.address,
    //       ...params,
    //     })) as unknown as LendingPositionHistory;
    //   const { lifetimeRewards: lifetimeRewardsFromController } =
    //     lendingPositionHistory || {};
    //   const lifetimeRewardsForToken = lifetimeRewardsFromController?.find(
    //     (reward) =>
    //       new BigNumber(reward.assets).gt(0) &&
    //       reward.token.address ===
    //         outputToken?.experience?.market?.underlying?.address,
    //   );
    //   setLifetimeRewards(lifetimeRewardsForToken?.assets ?? '0');
    // };
    // if (
    //   outputToken &&
    //   outputToken.experience?.market?.protocol &&
    //   outputToken.experience?.market?.position?.id &&
    //   outputToken.experience?.market?.id &&
    //   outputToken.experience?.market?.address
    // ) {
    //   trace({ name: TraceName.EarnEarnings });
    //   getLendingPositionHistory({
    //     positionId: outputToken.experience?.market?.position?.id,
    //     marketId: outputToken.experience?.market?.id,
    //     marketAddress: outputToken.experience?.market?.address,
    //     protocol: outputToken?.experience?.market?.protocol,
    //   }).catch((err) => {
    //     console.error('Failed to fetch lending position history', err);
    //     setError('Failed to fetch lending position history');
    //     setIsLoading(false);
    //   }).finally(() => {
    //      endTrace({ name: TraceName.EarnEarnings });
    //   });
    // } else {
    //   setIsLoading(false);
    // }
    setIsLoading(false);
  }, [outputToken?.balanceMinimalUnit]);
  // }, [outputToken, selectedAccount]);

  useEffect(() => {
    if (
      outputToken &&
      outputToken.experience?.market?.protocol &&
      outputToken.balanceMinimalUnit &&
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
