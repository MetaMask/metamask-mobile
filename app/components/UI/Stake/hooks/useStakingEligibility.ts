import { useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../../selectors/accountsController';
import { useStakeContext } from './useStakeContext';

const useStakingEligibility = () => {
  const selectedAddress =
    useSelector(selectSelectedInternalAccountChecksummedAddress) || '';
  const { stakingApiService } = useStakeContext();

  const [isEligible, setIsEligible] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [selectedAddress, stakingApiService]);

  return {
    isEligible,
    isLoadingEligibility: loading,
    error,
  };
};

export default useStakingEligibility;
