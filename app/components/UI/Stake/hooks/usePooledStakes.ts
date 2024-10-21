import { useSelector } from 'react-redux';
import { useState, useEffect, useMemo } from 'react';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../../selectors/accountsController';
import { selectChainId } from '../../../../selectors/networkController';
import { hexToNumber } from '@metamask/utils';
import { PooledStake } from '@metamask/stake-sdk';
import { useStakeContext } from './useStakeContext';

export enum StakeAccountStatus {
  // These statuses are only used internally rather than displayed to a user
  ACTIVE = 'ACTIVE', // non-zero staked shares
  NEVER_STAKED = 'NEVER_STAKED',
  INACTIVE_WITH_EXIT_REQUESTS = 'INACTIVE_WITH_EXIT_REQUESTS', // zero staked shares, unstaking or claimable exit requests
  INACTIVE_WITH_REWARDS_ONLY = 'INACTIVE_WITH_REWARDS_ONLY', // zero staked shares, no exit requests, previous lifetime rewards
}

const usePooledStakes = () => {
  const chainId = useSelector(selectChainId);
  const selectedAddress =
    useSelector(selectSelectedInternalAccountChecksummedAddress) || '';
  const { stakingApiService } = useStakeContext(); // Get the stakingApiService directly from context
  const [pooledStakesData, setPooledStakesData] = useState({} as PooledStake);
  const [exchangeRate, setExchangeRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (!stakingApiService) {
          throw new Error('Staking API service is unavailable');
        }

        const addresses = selectedAddress ? [selectedAddress] : [];
        const numericChainId = hexToNumber(chainId);

        // Directly calling the stakingApiService
        const { accounts = [], exchangeRate: fetchedExchangeRate } =
          await stakingApiService.getPooledStakes(
            addresses,
            numericChainId,
            true,
          );

        setPooledStakesData(accounts[0] || null);
        setExchangeRate(fetchedExchangeRate);
      } catch (err) {
        setError('Failed to fetch pooled stakes');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [chainId, selectedAddress, stakingApiService, refreshKey]);

  const refreshPooledStakes = () => {
    setRefreshKey((prevKey) => prevKey + 1); // Increment `refreshKey` to trigger refetch
  };

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

  const status = useMemo(() => getStatus(pooledStakesData), [pooledStakesData]);

  const hasStakedPositions = useMemo(
    () =>
      status === StakeAccountStatus.ACTIVE ||
      status === StakeAccountStatus.INACTIVE_WITH_EXIT_REQUESTS,
    [status],
  );

  const hasRewards = useMemo(
    () =>
      status === StakeAccountStatus.INACTIVE_WITH_REWARDS_ONLY ||
      status === StakeAccountStatus.ACTIVE,
    [status],
  );

  const hasRewardsOnly = useMemo(
    () => status === StakeAccountStatus.INACTIVE_WITH_REWARDS_ONLY,
    [status],
  );

  const hasNeverStaked = useMemo(
    () => status === StakeAccountStatus.NEVER_STAKED,
    [status],
  );

  const hasEthToUnstake = useMemo(
    () => status === StakeAccountStatus.ACTIVE,
    [status],
  );

  return {
    pooledStakesData,
    exchangeRate,
    isLoadingPooledStakesData: loading,
    error,
    refreshPooledStakes,
    hasStakedPositions,
    hasEthToUnstake,
    hasNeverStaked,
    hasRewards,
    hasRewardsOnly,
  };
};

export default usePooledStakes;
