import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  selectCampaignParticipantOptedIn,
  selectOndoCampaignActivityById,
} from '../../../../reducers/rewards/selectors';
import { setOndoCampaignActivity } from '../../../../reducers/rewards';
import type { OndoGmActivityEntryDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useCursorPaginatedList } from './useCursorPaginatedList';

export interface UseGetOndoCampaignActivityResult {
  activityEntries: OndoGmActivityEntryDto[] | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
  isRefreshing: boolean;
}

/**
 * Hook to fetch paginated Ondo GM campaign activity.
 * First page is cached in Redux; subsequent pages stay in local state only.
 */
export const useGetOndoCampaignActivity = (
  campaignId: string | undefined,
): UseGetOndoCampaignActivityResult => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isOptedIn = useSelector(
    selectCampaignParticipantOptedIn(subscriptionId, campaignId),
  );
  const cachedActivity = useSelector(
    selectOndoCampaignActivityById(subscriptionId ?? undefined, campaignId),
  );

  const enabled = Boolean(subscriptionId && campaignId && isOptedIn);
  const resetKey = `${subscriptionId ?? ''}:${campaignId ?? ''}`;

  const fetchPage = useCallback(
    async ({ cursor }: { cursor: string | null }) => {
      if (!subscriptionId || !campaignId) {
        return { results: [], cursor: null, has_more: false };
      }

      return Engine.controllerMessenger.call(
        'RewardsController:getOndoCampaignActivity',
        { campaignId, subscriptionId, cursor },
      );
    },
    [subscriptionId, campaignId],
  );

  const onFirstPage = useCallback(
    (entries: OndoGmActivityEntryDto[]) => {
      if (!subscriptionId || !campaignId) {
        return;
      }
      dispatch(
        setOndoCampaignActivity({
          subscriptionId,
          campaignId,
          entries,
        }),
      );
    },
    [dispatch, subscriptionId, campaignId],
  );

  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    isRefreshing,
  } = useCursorPaginatedList<OndoGmActivityEntryDto>({
    enabled,
    resetKey,
    cachedItems: cachedActivity,
    fetchPage,
    onFirstPage,
    errorMessage: 'Failed to fetch activity',
  });

  return {
    activityEntries: items,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    isRefreshing,
  };
};

export default useGetOndoCampaignActivity;
