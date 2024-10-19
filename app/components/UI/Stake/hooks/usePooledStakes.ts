import { useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../../selectors/accountsController';
import { selectChainId } from '../../../../selectors/networkController';
import { hexToNumber } from '@metamask/utils';
import { PooledStake } from '@metamask/stake-sdk';
import { useStakeContext } from './useStakeContext';

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

  return {
    pooledStakesData,
    exchangeRate,
    loading,
    error,
    refreshPooledStakes,
  };
};

export default usePooledStakes;
