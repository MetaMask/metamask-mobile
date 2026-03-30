import { useState, useCallback, useEffect } from 'react';
import type { TopTrader } from '../types';

/**
 * Result interface for the useTopTraders hook.
 */
export interface UseTopTradersResult {
  /** List of top traders */
  traders: TopTrader[];
  /** Whether the data is currently loading */
  isLoading: boolean;
  /** Error message if the data fetch failed */
  error: string | null;
  /** Refresh the traders list */
  refresh: () => Promise<void>;
  /** Toggle the follow state for a trader */
  toggleFollow: (traderId: string) => void;
}

/**
 * Mocked trader data used as a placeholder until the real API is integrated.
 * Replace with API calls when the social leaderboard data layer ships.
 */
const MOCKED_TRADERS: TopTrader[] = [
  {
    id: 'trader-1',
    rank: 1,
    username: 'aparjey',
    percentageChange: 50.2,
    profitAmount: '+$45,900K',
    period: '30D',
    isFollowing: false,
  },
  {
    id: 'trader-2',
    rank: 2,
    username: 'kien',
    percentageChange: 91.2,
    profitAmount: '+$41,800K',
    period: '30D',
    isFollowing: true,
  },
];

const SIMULATED_LOADING_DELAY_MS = 800;

/**
 * Hook that provides top traders data for the homepage leaderboard section.
 *
 * Currently uses mocked data with a simulated loading delay.
 * When the social leaderboard API ships, replace the `fetchTraders` body
 * with a real `Engine.context.*` call, keeping the same return shape.
 *
 * @returns Object with traders, isLoading, error, refresh, toggleFollow
 */
export const useTopTraders = (): UseTopTradersResult => {
  const [traders, setTraders] = useState<TopTrader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTraders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with real API call when data layer is ready.
      await new Promise<void>((resolve) =>
        setTimeout(resolve, SIMULATED_LOADING_DELAY_MS),
      );
      setTraders(MOCKED_TRADERS);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch top traders',
      );
      setTraders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchTraders();
  }, [fetchTraders]);

  const toggleFollow = useCallback((traderId: string) => {
    setTraders((prev) =>
      prev.map((trader) =>
        trader.id === traderId
          ? { ...trader, isFollowing: !trader.isFollowing }
          : trader,
      ),
    );
  }, []);

  useEffect(() => {
    fetchTraders();
  }, [fetchTraders]);

  return { traders, isLoading, error, refresh, toggleFollow };
};

export default useTopTraders;
