import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { selectChainId } from '../../../../selectors/networkController';
import { hexToNumber } from '@metamask/utils';
import { PooledStake } from '@metamask/stake-sdk';
import { useStakeContext } from './useStakeContext';
import {
  selectPooledStakesData,
  setPooledStakes,
} from '../../../../core/redux/slices/staking';

export enum StakeAccountStatus {
  // These statuses are only used internally rather than displayed to a user
  ACTIVE = 'ACTIVE', // non-zero staked shares
  NEVER_STAKED = 'NEVER_STAKED',
  INACTIVE_WITH_EXIT_REQUESTS = 'INACTIVE_WITH_EXIT_REQUESTS', // zero staked shares, unstaking or claimable exit requests
  INACTIVE_WITH_REWARDS_ONLY = 'INACTIVE_WITH_REWARDS_ONLY', // zero staked shares, no exit requests, previous lifetime rewards
}

const usePooledStakes = () => {
  const dispatch = useDispatch();
  const chainId = useSelector(selectChainId);
  const selectedAddress =
    useSelector(selectSelectedInternalAccountFormattedAddress) || '';
  const { pooledStakesData, exchangeRate } = useSelector(
    selectPooledStakesData,
  );
  const { stakingApiService } = useStakeContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!stakingApiService || !selectedAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const { accounts = [], exchangeRate: fetchedExchangeRate } =
        await stakingApiService.getPooledStakes(
          [selectedAddress],
          hexToNumber(chainId),
          true,
        );

      dispatch(
        setPooledStakes({
          pooledStakes: accounts[0] || {},
          exchangeRate: fetchedExchangeRate,
        }),
      );
    } catch (err) {
      setError('Failed to fetch pooled stakes');
    } finally {
      setIsLoading(false);
    }
  }, [chainId, selectedAddress, stakingApiService, dispatch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatus = (stake: PooledStake) => {
    if (stake.assets === '0' && stake.exitRequests.length > 0) {
      return StakeAccountStatus.INACTIVE_WITH_EXIT_REQUESTS;
    } else if (stake.assets === '0' && stake.lifetimeRewards !== '0') {
      return StakeAccountStatus.INACTIVE_WITH_REWARDS_ONLY;
    } else if (stake.assets === '0') {
      return StakeAccountStatus.NEVER_STAKED;
    }
    return StakeAccountStatus.ACTIVE;
  };

  const statusFlags = useMemo(() => {
    const currentStatus = pooledStakesData
      ? getStatus(pooledStakesData)
      : StakeAccountStatus.NEVER_STAKED;

    return {
      hasStakedPositions:
        currentStatus === StakeAccountStatus.ACTIVE ||
        currentStatus === StakeAccountStatus.INACTIVE_WITH_EXIT_REQUESTS,
      hasRewards:
        currentStatus === StakeAccountStatus.INACTIVE_WITH_REWARDS_ONLY ||
        currentStatus === StakeAccountStatus.ACTIVE,
      hasRewardsOnly:
        currentStatus === StakeAccountStatus.INACTIVE_WITH_REWARDS_ONLY,
      hasNeverStaked: currentStatus === StakeAccountStatus.NEVER_STAKED,
      hasEthToUnstake: currentStatus === StakeAccountStatus.ACTIVE,
    };
  }, [pooledStakesData]);

  return {
    pooledStakesData,
    exchangeRate,
    isLoadingPooledStakesData: isLoading,
    error,
    refreshPooledStakes: fetchData,
    ...statusFlags,
  };
};

export default usePooledStakes;
