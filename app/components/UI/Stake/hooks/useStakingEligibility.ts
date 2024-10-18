import { useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../../selectors/accountsController';
import { useStakeContext } from './useStakeContext'; // Assuming you have a context that provides the stakingApiService

const usePooledStakingEligibility = () => {
  const selectedAddress =
    useSelector(selectSelectedInternalAccountChecksummedAddress) || '';
  const { stakingApiService } = useStakeContext(); // Get the stakingApiService directly from context

  const [isEligible, setIsEligible] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // `refreshKey` is used to manually trigger a refetch

  useEffect(() => {
    const fetchStakingEligibility = async () => {
      try {
        setLoading(true);

        if (!stakingApiService) {
          throw new Error('Staking API service is unavailable');
        }

        const addresses = selectedAddress ? [selectedAddress] : [];

        // Directly calling the stakingApiService to fetch staking eligibility
        const { eligible } =
          await stakingApiService.getPooledStakingEligibility(addresses);

        setIsEligible(eligible);
      } catch (err) {
        setError('Failed to fetch pooled staking eligibility');
      } finally {
        setLoading(false);
      }
    };

    fetchStakingEligibility();
  }, [selectedAddress, stakingApiService, refreshKey]);

  // Function to manually refresh eligibility data
  const refreshPooledStakingEligibility = () => {
    setRefreshKey((prevKey) => prevKey + 1); // Increment `refreshKey` to trigger refetch
  };

  return {
    isEligible,
    loading,
    error,
    refreshPooledStakingEligibility,
  };
};

export default usePooledStakingEligibility;
