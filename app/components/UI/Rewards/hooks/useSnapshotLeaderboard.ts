import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import type { SnapshotLeaderboardDto } from '../../../../core/Engine/controllers/rewards-controller/types';

interface UseSnapshotLeaderboardReturn {
  /** The leaderboard data including top 20 entries, totals, and user position */
  leaderboard: SnapshotLeaderboardDto | null;
  /** Whether the leaderboard is loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Function to refetch the leaderboard (always fetches fresh data) */
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch leaderboard data for a snapshot.
 * @param snapshotId - The ID of the snapshot to get leaderboard for
 */
export const useSnapshotLeaderboard = (
  snapshotId: string,
): UseSnapshotLeaderboardReturn => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const [leaderboard, setLeaderboard] = useState<SnapshotLeaderboardDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  const refetch = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !snapshotId) {
      setLeaderboard(null);
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
        'RewardsController:getSnapshotLeaderboard',
        snapshotId,
        subscriptionId,
      );

      setLeaderboard(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch leaderboard',
      );
      console.error('Error fetching snapshot leaderboard', err);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [snapshotId, subscriptionId]);

  return {
    leaderboard,
    isLoading,
    error,
    refetch,
  };
};
