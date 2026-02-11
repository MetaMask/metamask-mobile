import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import type { DropLeaderboardDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';

interface UseDropLeaderboardReturn {
  /** The leaderboard data including top 20 entries, totals, and user position */
  leaderboard: DropLeaderboardDto | null;
  /** Whether the leaderboard is loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Function to refetch the leaderboard (always fetches fresh data) */
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch leaderboard data for a drop.
 * @param dropId - The ID of the drop to get leaderboard for
 */
export const useDropLeaderboard = (
  dropId: string,
): UseDropLeaderboardReturn => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const [leaderboard, setLeaderboard] = useState<DropLeaderboardDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  const fetchLeaderboard = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !dropId) {
      setLeaderboard(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (isLoadingRef.current) {
      return;
    }
    isLoadingRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      const response = await Engine.controllerMessenger.call(
        'RewardsController:getDropLeaderboard',
        dropId,
        subscriptionId,
      );

      setLeaderboard(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch leaderboard',
      );
      console.error('Error fetching drop leaderboard', err);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [dropId, subscriptionId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Invalidate leaderboard when balance is updated or account is linked
  useInvalidateByRewardEvents(
    ['RewardsController:balanceUpdated', 'RewardsController:accountLinked'],
    fetchLeaderboard,
  );

  return {
    leaderboard,
    isLoading,
    error,
    refetch: fetchLeaderboard,
  };
};
