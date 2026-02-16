import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectRewardsSubscriptionId,
  selectRecentDropPointCommitByDropId,
} from '../../../../selectors/rewards';
import type { DropLeaderboardDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import {
  DROP_LEADERBOARD_RANK_TBD,
  RECENT_COMMIT_VALIDITY_WINDOW_MS,
} from '../../../../reducers/rewards';

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
 * Handles backend caching delays by using recent commit data when:
 * - Time elapsed since commit is less than 5 minutes
 * - The recent commit total points is higher than the backend's user position points
 *
 * When using recent commit data, the rank is set to DROP_LEADERBOARD_RANK_TBD (-1) to indicate
 * the rank is being calculated.
 *
 * @param dropId - The ID of the drop to get leaderboard for
 */
export const useDropLeaderboard = (
  dropId?: string,
): UseDropLeaderboardReturn => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const recentCommitSelector = useMemo(
    () => selectRecentDropPointCommitByDropId(dropId ?? ''),
    [dropId],
  );
  const recentCommit = useSelector(recentCommitSelector);
  const [rawLeaderboard, setRawLeaderboard] =
    useState<DropLeaderboardDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  const fetchLeaderboard = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !dropId) {
      setRawLeaderboard(null);
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

      setRawLeaderboard(response);
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

  // Invalidate leaderboard when balance is updated, account is linked, or points are committed to a drop
  useInvalidateByRewardEvents(
    [
      'RewardsController:balanceUpdated',
      'RewardsController:accountLinked',
      'RewardsController:dropCommit',
    ],
    fetchLeaderboard,
  );

  /**
   * Compute the effective leaderboard, potentially using recent commit data
   * to handle backend caching delays.
   */
  const leaderboard = useMemo((): DropLeaderboardDto | null => {
    if (!rawLeaderboard) {
      return null;
    }

    // Check if we should use recent commit data
    if (recentCommit) {
      const now = Date.now();
      const timeElapsed = now - recentCommit.committedAt;
      const isWithinValidityWindow =
        timeElapsed < RECENT_COMMIT_VALIDITY_WINDOW_MS;
      const backendPoints = rawLeaderboard.userPosition?.points ?? 0;
      const recentCommitPoints = recentCommit.response.totalPointsCommitted;
      const hasHigherPoints = recentCommitPoints > backendPoints;

      // Use recent commit data if within validity window and has higher points
      if (isWithinValidityWindow && hasHigherPoints) {
        return {
          ...rawLeaderboard,
          userPosition: {
            // Use existing identifier from backend, or undefined if no user position yet
            identifier: rawLeaderboard.userPosition?.identifier,
            // Set rank to TBD since backend hasn't updated yet
            rank: DROP_LEADERBOARD_RANK_TBD,
            // Use the total points from the recent commit
            points: recentCommitPoints,
          },
          // Use the total participants from the recent commit response
          totalParticipants: recentCommit.response.totalParticipants,
        };
      }
    }

    return rawLeaderboard;
  }, [rawLeaderboard, recentCommit]);

  return {
    leaderboard,
    isLoading,
    error,
    refetch: fetchLeaderboard,
  };
};
