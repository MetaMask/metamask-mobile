import { useCallback, useState } from 'react';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import {
  type UserHistoryItem,
  type GetUserHistoryParams,
} from '@metamask/perps-controller';
import type { CaipAccountId } from '@metamask/utils';

interface UseUserHistoryParams {
  startTime?: number;
  endTime?: number;
  accountId?: CaipAccountId;
}

interface UseUserHistoryResult {
  userHistory: UserHistoryItem[];
  isLoading: boolean;
  error: string | null;
  refetch: (options?: { forceRefresh?: boolean }) => Promise<UserHistoryItem[]>;
}

/**
 * Hook to fetch and manage user transaction history including deposits and withdrawals
 */
export const useUserHistory = ({
  startTime,
  endTime,
  accountId,
}: UseUserHistoryParams = {}): UseUserHistoryResult => {
  const [userHistory, setUserHistory] = useState<UserHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserHistory = useCallback(
    async (
      options: { forceRefresh?: boolean } = {},
    ): Promise<UserHistoryItem[]> => {
      try {
        setIsLoading(true);
        setError(null);

        const controller = Engine.context.PerpsController;
        if (!controller) {
          throw new Error('PerpsController not available');
        }

        const params: GetUserHistoryParams = {
          startTime,
          endTime,
          accountId,
        };

        DevLogger.log('Fetching user history with params:', params);

        const provider = controller.getActiveProviderOrNull();
        if (!provider) {
          setIsLoading(false);
          return [];
        }

        // `forceRefresh` is accepted for contract parity with the activity
        // page refetch path. `getUserHistory` is not yet routed through the
        // MarketDataService coalesce layer (REST throttling lives on the
        // fills/orders/funding trio, which is the actual 429 source on HL);
        // add a service wrapper here if user-history becomes a 429 source.
        void options.forceRefresh;
        const history = await provider.getUserHistory(params);

        DevLogger.log('User history fetched successfully:', history);
        setUserHistory(history);
        return history;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch user history';
        DevLogger.log('Error fetching user history:', errorMessage);
        setError(errorMessage);
        setUserHistory([]);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [startTime, endTime, accountId],
  );

  return {
    userHistory,
    isLoading,
    error,
    refetch: fetchUserHistory,
  };
};
