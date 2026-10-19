import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import { selectVipTransactionsById } from '../../../../reducers/rewards/selectors';
import { setVipTransactions } from '../../../../reducers/rewards';
import type {
  VipTransactionDto,
  VipTransactionType,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { useCursorPaginatedList } from './useCursorPaginatedList';

export interface UseGetVipTransactionsResult {
  transactions: VipTransactionDto[] | null;
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
 * Hook to fetch paginated VIP transactions for a given type.
 * First page is cached in Redux; subsequent pages stay in local state only.
 */
export const useGetVipTransactions = (
  type: VipTransactionType,
): UseGetVipTransactionsResult => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVipEnabled = useSelector(selectIsCurrentSubscriptionVipEnabled);
  const cachedTransactions = useSelector(
    selectVipTransactionsById(subscriptionId ?? undefined, type),
  );

  const enabled = Boolean(subscriptionId && isVipEnabled);
  const resetKey = `${subscriptionId ?? ''}:${type}`;

  const fetchPage = useCallback(
    async ({
      cursor,
      isFirstPage,
      forceFresh,
    }: {
      cursor: string | null;
      isFirstPage: boolean;
      forceFresh: boolean;
    }) => {
      if (!subscriptionId) {
        return { results: [], cursor: null, has_more: false };
      }

      return Engine.controllerMessenger.call(
        'RewardsController:getVipTransactions',
        {
          subscriptionId,
          type,
          cursor,
          forceFresh: isFirstPage ? forceFresh : undefined,
        },
      );
    },
    [subscriptionId, type],
  );

  const onFirstPage = useCallback(
    (transactions: VipTransactionDto[]) => {
      if (!subscriptionId) {
        return;
      }
      dispatch(
        setVipTransactions({
          subscriptionId,
          type,
          transactions,
        }),
      );
    },
    [dispatch, subscriptionId, type],
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
  } = useCursorPaginatedList<VipTransactionDto>({
    enabled,
    resetKey,
    cachedItems: cachedTransactions,
    fetchPage,
    onFirstPage,
    errorMessage: 'Failed to fetch transactions',
  });

  return {
    transactions: items,
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

export default useGetVipTransactions;
