import { useState, useCallback, useEffect, useRef } from 'react';
import { LeaderboardTrader } from '../types';
import LeaderboardService from '../services/LeaderboardService';

interface UseLeaderboardOptions {
  /** Whether to fetch data automatically when the hook mounts */
  autoFetch?: boolean;
  /** Number of traders to fetch */
  limit?: number;
  /** Whether the leaderboard tab is currently visible */
  isVisible?: boolean;
}

interface UseLeaderboardReturn {
  /** Array of traders from the leaderboard */
  traders: LeaderboardTrader[];
  /** Whether the data is currently loading */
  isLoading: boolean;
  /** Error message if the fetch failed */
  error: string | null;
  /** Function to manually refresh the data */
  refresh: () => Promise<void>;
  /** Timestamp of the last successful fetch */
  lastFetched: number | null;
}

/**
 * Hook to fetch and manage leaderboard data
 *
 * @param options - Configuration options
 * @returns Leaderboard state and controls
 */
export const useLeaderboard = (
  options: UseLeaderboardOptions = {},
): UseLeaderboardReturn => {
  const { autoFetch = true, limit = 50, isVisible = true } = options;

  const [traders, setTraders] = useState<LeaderboardTrader[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  // Track if we've fetched data at least once
  const hasFetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await LeaderboardService.getTopTraders(limit);
      setTraders(data);
      setLastFetched(Date.now());
      hasFetchedRef.current = true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch leaderboard';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Fetch data when tab becomes visible (and hasn't been fetched yet)
  useEffect(() => {
    if (autoFetch && isVisible && !hasFetchedRef.current && !isLoading) {
      fetchData();
    }
  }, [autoFetch, isVisible, isLoading, fetchData]);

  return {
    traders,
    isLoading,
    error,
    refresh,
    lastFetched,
  };
};

export default useLeaderboard;
