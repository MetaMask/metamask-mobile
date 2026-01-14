import { useSelector } from 'react-redux';
import { useState } from 'react';
import { pooledStakingSelectors } from '../../../../selectors/earnController';
import Engine from '../../../../core/Engine';

/**
 * Earn (deposit) eligibility.
 *
 * Determines whether the currently selected account can access **Earn deposit flows**
 * (e.g., staking / supply / deposit-more CTAs). If the account is ineligible (e.g., on our swaps
 * blocklist), the UI should hide deposit actions.
 *
 * Note: This eligibility is **not** intended to block actions like
 * withdraw / unstake / claim, which should remain available.
 *
 * @returns Object containing:
 * - `isEligible`: Whether the account is eligible for Earn deposits.
 * - `isLoadingEligibility`: Whether a refresh is in progress.
 * - `error`: Error message (if refresh failed).
 * - `refreshPooledStakingEligibility`: Triggers a refresh via `EarnController.refreshEarnEligibility()`.
 */
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
    isEligible,
    isLoadingEligibility: isLoading,
    error,
    refreshPooledStakingEligibility: fetchStakingEligibility,
  };
};

export default useStakingEligibility;
