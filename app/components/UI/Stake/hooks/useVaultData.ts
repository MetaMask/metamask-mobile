import { useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
import { selectChainId } from '../../../../selectors/networkController';
import { useStakeContext } from './useStakeContext'; // Assuming you have a context that provides the stakingApiService
import { hexToNumber } from '@metamask/utils';

const useVaultData = () => {
  const chainId = useSelector(selectChainId);
  const { stakingApiService } = useStakeContext(); // Get the stakingApiService directly from context

  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // `refreshKey` is used to manually trigger a refetch

  useEffect(() => {
    const fetchVaultData = async () => {
      try {
        setLoading(true);

        if (!stakingApiService) {
          throw new Error('Staking API service is unavailable');
        }

        const numericChainId = hexToNumber(chainId);

        // Directly calling the stakingApiService to fetch vault data
        const vaultDataResponse = await stakingApiService.getVaultData(
          numericChainId,
        );

        setVaultData(vaultDataResponse || null);
      } catch (err) {
        setError('Failed to fetch vault data');
      } finally {
        setLoading(false);
      }
    };

    fetchVaultData();
  }, [chainId, stakingApiService, refreshKey]);

  // Function to manually refresh vault data
  const refreshVaultData = () => {
    setRefreshKey((prevKey) => prevKey + 1); // Increment `refreshKey` to trigger refetch
  };

  return {
    vaultData,
    loading,
    error,
    refreshVaultData,
  };
};

export default useVaultData;
