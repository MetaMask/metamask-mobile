import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useCallback, useState } from 'react';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import {
  selectStakingEligibility,
  setStakingEligibility,
} from '../../../../core/redux/slices/staking';
import { stakingApiService } from '../sdk/stakeSdkProvider';

const useStakingEligibility = () => {
  const dispatch = useDispatch();
  const selectedAddress =
    useSelector(selectSelectedInternalAccountFormattedAddress) || '';
  const { isEligible } = useSelector(selectStakingEligibility);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStakingEligibility = useCallback(async () => {
    try {
      if (!stakingApiService) {
        return { isEligible: false };
      }
      setIsLoading(true);
      setError(null);
      const { eligible } = await stakingApiService.getPooledStakingEligibility([
        selectedAddress,
      ]);
      dispatch(setStakingEligibility(eligible));
      return { isEligible: eligible };
    } catch (err) {
      console.error(err);
      setError('Failed to fetch pooled staking eligibility');
      return { isEligible: false };
    } finally {
      setIsLoading(false);
    }
  }, [selectedAddress, dispatch]);

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
