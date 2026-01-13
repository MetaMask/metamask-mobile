import { useSelector } from 'react-redux';
import { useState } from 'react';
import { pooledStakingSelectors } from '../../../../selectors/earnController';
import Engine from '../../../../core/Engine';

// TODO: Rename to useEarnEligibility
// TODO: Move to Earn hooks folder
const useStakingEligibility = () => {
  const isEligible = useSelector(pooledStakingSelectors.selectEligibility);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStakingEligibility = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await Engine.context.EarnController.refreshEarnEligibility();
    } catch (err) {
      setError('Failed to fetch pooled staking eligibility');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // A user isn't eligible when their address is part of our blocklist
    isEligible,
    isLoadingEligibility: isLoading,
    error,
    refreshPooledStakingEligibility: fetchStakingEligibility,
  };
};

export default useStakingEligibility;
