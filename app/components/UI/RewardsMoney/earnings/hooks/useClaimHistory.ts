import { useCallback } from 'react';
import Engine from '../../../../../core/Engine';
import type { ClaimDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { useCursorPaginatedList } from '../../../Rewards/hooks/useCursorPaginatedList';
import { REWARDS_MONEY_ENABLED } from '../../constants';

export interface UseClaimHistoryResult {
  claims: ClaimDto[] | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
  retry: () => void;
  isRefreshing: boolean;
}

/**
 * Cursor-paginated claim history, newest first.
 *
 * Unscoped, unlike `useEarningsLedger`: claims are not faceted by origin type,
 * so there is no reset key and every page — including the first — goes straight
 * to the network. The controller does not cache this read, so a pull-to-refresh
 * always reflects the server.
 *
 * @returns The claims plus the list's loading, error and pagination state.
 */
export const useClaimHistory = (): UseClaimHistoryResult => {
  const fetchPage = useCallback(
    async ({ cursor }: { cursor: string | null }) =>
      Engine.controllerMessenger.call(
        'RewardsMoneyController:getClaimHistory',
        { cursor },
      ),
    [],
  );

  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    retry,
    isRefreshing,
  } = useCursorPaginatedList<ClaimDto>({
    enabled: REWARDS_MONEY_ENABLED,
    // Constant: claims carry no origin-type facet, so nothing resets the list.
    resetKey: 'claims',
    fetchPage,
    errorMessage: 'Failed to fetch claims',
  });

  return {
    claims: items,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    retry,
    isRefreshing,
  };
};

export default useClaimHistory;
