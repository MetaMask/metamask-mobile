import { useSelector } from 'react-redux';
import { useEffect, useCallback, useState } from 'react';
import { selectPooledStakingEligibility } from '../../../../selectors/earnController';
import Engine from '../../../../core/Engine';

const useStakingEligibility = () => {
  const isEligible = useSelector(selectPooledStakingEligibility);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStakingEligibility = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await Engine.context.EarnController.refreshStakingEligibility();
    } catch (err) {
      console.error(err);
      setError('Failed to fetch pooled staking eligibility');
      return { isEligible: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

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
