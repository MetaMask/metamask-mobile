import { useCallback, useMemo } from 'react';
import Engine from '../../../../../core/Engine';
import type {
  EarningOriginType,
  LedgerEntryDto,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { useCursorPaginatedList } from '../../../Rewards/hooks/useCursorPaginatedList';
import { REWARDS_MONEY_ENABLED } from '../../constants';

export interface UseEarningsLedgerResult {
  entries: LedgerEntryDto[] | null;
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
 * Cursor-paginated earnings ledger, scoped to an origin-type set.
 *
 * Page 1 is served through the controller cache and is the only page written to
 * controller state; later pages go straight to the network and are merged in
 * `useCursorPaginatedList`, so a refetch can never flash a multi-page merge and
 * then shrink it.
 *
 * @param originTypes - The scope for this screen.
 * @returns The rows plus the list's loading, error and pagination state.
 */
export const useEarningsLedger = (
  originTypes: EarningOriginType[],
): UseEarningsLedgerResult => {
  const scopeKey = useMemo(
    () => [...originTypes].sort().join(','),
    [originTypes],
  );

  const fetchPage = useCallback(
    async ({
      cursor,
      isFirstPage,
      forceFresh,
    }: {
      cursor: string | null;
      isFirstPage: boolean;
      forceFresh: boolean;
    }) =>
      Engine.controllerMessenger.call(
        'RewardsMoneyController:getEarningsLedger',
        {
          originTypes: scopeKey
            ? (scopeKey.split(',') as EarningOriginType[])
            : [],
          cursor,
          forceFresh: isFirstPage ? forceFresh : undefined,
        },
      ),
    [scopeKey],
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
  } = useCursorPaginatedList<LedgerEntryDto>({
    enabled: REWARDS_MONEY_ENABLED,
    resetKey: scopeKey,
    fetchPage,
    errorMessage: 'Failed to fetch earnings',
  });

  return {
    entries: items,
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

export default useEarningsLedger;
