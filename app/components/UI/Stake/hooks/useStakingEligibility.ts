import { useSelector } from 'react-redux';
import { useState } from 'react';
import { pooledStakingSelectors } from '../../../../selectors/earnController';
import Engine from '../../../../core/Engine';

const useStakingEligibility = () => {
  const isEligible = useSelector(pooledStakingSelectors.selectEligibility);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStakingEligibility = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await Engine.context.EarnController.refreshStakingEligibility();
    } catch (err) {
      setError('Failed to fetch pooled staking eligibility');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isEligible,
    isLoadingEligibility: isLoading,
    error,
    refreshPooledStakingEligibility: fetchStakingEligibility,
  };
};

export default useStakingEligibility;
