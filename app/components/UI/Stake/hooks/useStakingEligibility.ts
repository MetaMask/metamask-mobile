import { useSelector } from 'react-redux';
import { useState } from 'react';
import { pooledStakingSelectors } from '../../../../selectors/earnController';
import Engine from '../../../../core/Engine';

function logLongMessage(tag: string, message: string) {
  const chunkSize = 3000; // play safe under 4076
  for (let i = 0; i < message.length; i += chunkSize) {
    console.log(tag, message.substring(i, i + chunkSize));
  }
}

const useStakingEligibility = () => {
  const isEligible = useSelector(pooledStakingSelectors.selectEligibility);
  console.log('DEBUG isEligible pooledStakingSelectors', isEligible)
  logLongMessage('DEBUG isEligible pooledStakingSelectors', JSON.stringify(pooledStakingSelectors, null, 3))
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStakingEligibility = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await Engine.context.EarnController.refreshStakingEligibility();
    } catch (err) {
      console.log('DEBUG fetchStakingEligibility error', err)
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
