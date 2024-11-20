import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useCallback, useState } from 'react';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../../selectors/accountsController';
import { useStakeContext } from './useStakeContext';
import {
  selectStakingEligibility,
  setStakingEligibility,
} from '../../../../core/redux/slices/staking';

const useStakingEligibility = () => {
  const dispatch = useDispatch();
  const selectedAddress =
    useSelector(selectSelectedInternalAccountChecksummedAddress) || '';
  const { isEligible } = useSelector(selectStakingEligibility);

  const { stakingApiService } = useStakeContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStakingEligibility = useCallback(async () => {
    if (!stakingApiService) {
      throw new Error('Staking API service is unavailable');
    }

    setIsLoading(true);
    setError(null);

    try {
      const { eligible } = await stakingApiService.getPooledStakingEligibility([
        selectedAddress,
      ]);
      dispatch(setStakingEligibility(eligible));
      return { isEligible: eligible };
    } catch (err) {
      setError('Failed to fetch pooled staking eligibility');
      return { isEligible: false };
    } finally {
      setIsLoading(false);
    }
  }, [selectedAddress, stakingApiService, dispatch]);

  useEffect(() => {
    fetchStakingEligibility();
  }, [fetchStakingEligibility]);

  return {
    isEligible,
    isLoadingEligibility: isLoading,
    error,
    refreshPooledStakingEligibility: fetchStakingEligibility,
  };
};

export default useStakingEligibility;
