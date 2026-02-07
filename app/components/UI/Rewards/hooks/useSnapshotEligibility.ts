import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import type { SnapshotEligibilityDto } from '../../../../core/Engine/controllers/rewards-controller/types';

interface UseSnapshotEligibilityReturn {
  /** The eligibility data including prerequisites with progress */
  eligibility: SnapshotEligibilityDto | null;
  /** Whether the eligibility is loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Function to refetch the eligibility (always fetches fresh data) */
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch real-time eligibility status for a snapshot.
 * @param snapshotId - The ID of the snapshot to get eligibility for
 */
export const useSnapshotEligibility = (
  snapshotId: string,
): UseSnapshotEligibilityReturn => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const [eligibility, setEligibility] = useState<SnapshotEligibilityDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  const refetch = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !snapshotId) {
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
        'RewardsController:getSnapshotEligibility',
        snapshotId,
        subscriptionId,
      );

      setEligibility(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch eligibility',
      );
      console.error('Error fetching snapshot eligibility', err);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [snapshotId, subscriptionId]);

  return {
    eligibility,
    isLoading,
    error,
    refetch,
  };
};
