import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import type { DropEligibilityDto } from '../../../../core/Engine/controllers/rewards-controller/types';

interface UseDropEligibilityReturn {
  /** The eligibility data including prerequisites with progress */
  eligibility: DropEligibilityDto | null;
  /** Whether the eligibility is loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Function to refetch the eligibility (always fetches fresh data) */
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch real-time eligibility status for a drop.
 * @param dropId - The ID of the drop to get eligibility for
 */
export const useDropEligibility = (
  dropId: string,
): UseDropEligibilityReturn => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const [eligibility, setEligibility] = useState<DropEligibilityDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  const refetch = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !dropId) {
      setEligibility(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Prevent concurrent requests
    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      const response = await Engine.controllerMessenger.call(
        'RewardsController:getDropEligibility',
        dropId,
        subscriptionId,
      );

      setEligibility(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch eligibility',
      );
      console.error('Error fetching drop eligibility', err);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [dropId, subscriptionId]);

  return {
    eligibility,
    isLoading,
    error,
    refetch,
  };
};
