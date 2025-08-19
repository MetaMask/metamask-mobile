import { useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPerpsEligibility } from '../selectors/perpsController';

export const usePerpsEligibility = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEligible = useSelector(selectPerpsEligibility);

  const refreshPerpsEligibility = async () => {
    try {
      setIsLoading(true);
      await Engine.context.PerpsController.refreshEligibility();
    } catch (e) {
      setError(`Failed to refresh perps eligibility: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isEligible,
    isLoading,
    error,
    refreshPerpsEligibility,
  };
};
